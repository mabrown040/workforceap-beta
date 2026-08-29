/**
 * Intentionally no `server-only` marker: this helper is reached by the
 * dependency-light B4B sync modules that run under the repository's
 * `node:test` gate. The `.server.ts` boundary plus Prisma transaction types
 * keep it on server-side call paths without breaking that runner.
 */

import { Prisma } from '@prisma/client';

type RawProgressAdoptionDb = Pick<
  Prisma.TransactionClient,
  '$queryRaw' | '$executeRaw'
>;

type RawCourseIdentity = {
  externalEmail: string;
  courseraCourseId: string;
  userId: string | null;
};

type RawBadgeIdentity = {
  externalEmail: string;
  badgeSlug: string;
  userId: string | null;
};

type RawIdentityConflict = {
  kind: string;
  externalEmail: string;
  externalKey: string;
};

type RawLinkedUser = {
  userId: string;
};

type LockedUser = {
  id: string;
};

function normalizeIdentityRows<T extends { externalEmail: string; userId: string | null }>(
  rows: T[],
  getExternalKey: (row: T) => string,
): T[] {
  const normalized = new Map<string, T>();

  for (const row of rows) {
    const externalEmail = row.externalEmail.trim().toLowerCase();
    const externalKey = getExternalKey(row).trim();
    if (!externalEmail || !externalKey) {
      throw new Error('Coursera raw progress requires an email and external key');
    }

    const key = `${externalEmail}\u0000${externalKey}`;
    const next = { ...row, externalEmail };
    const existing = normalized.get(key);
    if (existing && existing.userId && next.userId && existing.userId !== next.userId) {
      throw new Error('Coursera raw progress batch contains conflicting learner identities');
    }
    normalized.set(key, existing?.userId ? existing : next);
  }

  return [...normalized.values()];
}

/**
 * Serialize every raw Coursera writer for an email, independent of tenant.
 *
 * The legacy unique indexes are global on lower(email)+course/badge, so a
 * tenant-qualified lock would not protect an adoption from another tenant or
 * from a reviewed admin attachment. Call only inside a transaction.
 */
export async function lockLegacyRawCourseraEmails(
  db: Pick<Prisma.TransactionClient, '$queryRaw'>,
  emails: string[],
): Promise<void> {
  const lockKeys = [...new Set(
    emails
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
      .map((email) => `coursera:raw-email:${email}`),
  )].sort();
  if (lockKeys.length === 0) return;

  const tuples = lockKeys.map((lockKey) => Prisma.sql`(${lockKey}::text)`);
  await db.$queryRaw(Prisma.sql`
    SELECT pg_advisory_xact_lock(hashtextextended(ordered.lock_key, 0))
    FROM (
      SELECT input.lock_key
      FROM (VALUES ${Prisma.join(tuples, ', ')}) AS input(lock_key)
      GROUP BY input.lock_key
      ORDER BY input.lock_key
      OFFSET 0
    ) AS ordered
    ORDER BY ordered.lock_key
  `);
}

/**
 * Hold every user row that can authorize a raw-progress adoption until the
 * caller-owned transaction commits. Organization transfers and soft deletes
 * update the same rows, so FOR SHARE closes the validation-to-mutation race.
 *
 * The email advisory locks must always be acquired before this helper. User
 * IDs are sorted so batches that overlap on users take row locks in one order.
 */
async function lockActiveRawProgressUsers(
  db: Pick<Prisma.TransactionClient, '$queryRaw'>,
  args: {
    organizationId: string;
    userIds: Array<string | null>;
    identityKind: 'course' | 'badge';
  },
): Promise<string[]> {
  const userIds = [...new Set(
    args.userIds
      .map((userId) => userId?.trim() || '')
      .filter(Boolean),
  )].sort();
  if (userIds.length === 0) return [];

  const lockedUsers = await db.$queryRaw<LockedUser[]>(Prisma.sql`
    SELECT candidate_user.id
    FROM users AS candidate_user
    WHERE candidate_user.id IN (${Prisma.join(userIds)})
      AND candidate_user.organization_id = ${args.organizationId}
      AND candidate_user.deleted_at IS NULL
    ORDER BY candidate_user.id
    FOR SHARE
  `);
  const lockedUserIds = [...new Set(
    lockedUsers
      .map((user) => user.id?.trim() || '')
      .filter(Boolean),
  )].sort();

  if (
    lockedUserIds.length !== userIds.length
    || lockedUserIds.some((userId, index) => userId !== userIds[index])
  ) {
    throw new Error(
      `Coursera ${args.identityKind} identity conflict (linked-user-outside-organization)`,
    );
  }

  return lockedUserIds;
}

/**
 * Adopt only exact legacy course identities whose tenant is still unknown.
 * Existing tenant ownership and both existing/incoming linked users are
 * validated before the NULL organization_id is changed.
 */
export async function adoptLegacyRawCourseProgressRows(
  db: RawProgressAdoptionDb,
  args: {
    organizationId: string;
    identities: RawCourseIdentity[];
  },
): Promise<number> {
  const organizationId = args.organizationId.trim();
  if (!organizationId) throw new Error('Coursera progress requires an organization id');

  const identities = normalizeIdentityRows(
    args.identities,
    (row) => row.courseraCourseId,
  );
  if (identities.length === 0) return 0;

  await lockLegacyRawCourseraEmails(
    db,
    identities.map((identity) => identity.externalEmail),
  );

  const tuples = identities.map((identity) => Prisma.sql`(
    ${identity.externalEmail}::text,
    ${identity.courseraCourseId.trim()}::text,
    ${identity.userId}::text
  )`);

  const existingLinkedUsers = await db.$queryRaw<RawLinkedUser[]>(Prisma.sql`
    WITH incoming(external_email, external_key, user_id) AS (
      VALUES ${Prisma.join(tuples, ', ')}
    )
    SELECT DISTINCT existing.user_id AS "userId"
    FROM incoming
    INNER JOIN coursera_course_progress existing
      ON LOWER(existing.external_email) = incoming.external_email
      AND existing.coursera_course_id = incoming.external_key
    WHERE existing.user_id IS NOT NULL
    ORDER BY existing.user_id
  `);
  const lockedUserIds = await lockActiveRawProgressUsers(db, {
    organizationId,
    userIds: [
      ...identities.map((identity) => identity.userId),
      ...existingLinkedUsers.map((row) => row.userId),
    ],
    identityKind: 'course',
  });
  const existingUserWasLocked = lockedUserIds.length > 0
    ? Prisma.sql`existing.user_id IN (${Prisma.join(lockedUserIds)})`
    : Prisma.sql`FALSE`;

  const conflicts = await db.$queryRaw<RawIdentityConflict[]>(Prisma.sql`
    WITH incoming(external_email, external_key, user_id) AS (
      VALUES ${Prisma.join(tuples, ', ')}
    )
    SELECT
      CASE
        WHEN incoming.user_id IS NOT NULL AND incoming_user.id IS NULL
          THEN 'incoming-user-outside-organization'
        WHEN existing.organization_id IS NOT NULL
          AND existing.organization_id <> ${organizationId}::text
          THEN 'foreign-organization'
        WHEN existing.user_id IS NOT NULL AND existing_user.id IS NULL
          THEN 'existing-user-outside-organization'
        WHEN existing.user_id IS NOT NULL
          AND incoming.user_id IS NOT NULL
          AND existing.user_id <> incoming.user_id
          THEN 'different-linked-user'
        ELSE 'unknown'
      END AS kind,
      incoming.external_email AS "externalEmail",
      incoming.external_key AS "externalKey"
    FROM incoming
    LEFT JOIN users incoming_user
      ON incoming_user.id = incoming.user_id
      AND incoming_user.organization_id = ${organizationId}::text
      AND incoming_user.deleted_at IS NULL
    LEFT JOIN coursera_course_progress existing
      ON LOWER(existing.external_email) = incoming.external_email
      AND existing.coursera_course_id = incoming.external_key
    LEFT JOIN users existing_user
      ON existing_user.id = existing.user_id
      AND existing_user.organization_id = ${organizationId}::text
      AND existing_user.deleted_at IS NULL
    WHERE (
        incoming.user_id IS NOT NULL
        AND incoming_user.id IS NULL
      )
      OR (
        existing.organization_id IS NOT NULL
        AND existing.organization_id <> ${organizationId}::text
      )
      OR (
        existing.user_id IS NOT NULL
        AND existing_user.id IS NULL
      )
      OR (
        existing.user_id IS NOT NULL
        AND incoming.user_id IS NOT NULL
        AND existing.user_id <> incoming.user_id
      )
    LIMIT 1
  `);

  if (conflicts.length > 0) {
    const conflict = conflicts[0];
    throw new Error(
      `Coursera course identity conflict (${conflict.kind}) for ${conflict.externalEmail} / ${conflict.externalKey}`,
    );
  }

  return Number(await db.$executeRaw(Prisma.sql`
    WITH incoming(external_email, external_key, user_id) AS (
      VALUES ${Prisma.join(tuples, ', ')}
    )
    UPDATE coursera_course_progress existing
    SET organization_id = ${organizationId}::text
    FROM incoming
    WHERE existing.organization_id IS NULL
      AND LOWER(existing.external_email) = incoming.external_email
      AND existing.coursera_course_id = incoming.external_key
      AND (
        existing.user_id IS NULL
        OR (
          ${existingUserWasLocked}
          AND EXISTS (
            SELECT 1
            FROM users linked_user
            WHERE linked_user.id = existing.user_id
              AND linked_user.organization_id = ${organizationId}::text
              AND linked_user.deleted_at IS NULL
          )
        )
      )
  `)) || 0;
}

/** Badge equivalent of adoptLegacyRawCourseProgressRows. */
export async function adoptLegacyRawBadgeProgressRows(
  db: RawProgressAdoptionDb,
  args: {
    organizationId: string;
    identities: RawBadgeIdentity[];
  },
): Promise<number> {
  const organizationId = args.organizationId.trim();
  if (!organizationId) throw new Error('Coursera badge progress requires an organization id');

  const identities = normalizeIdentityRows(args.identities, (row) => row.badgeSlug);
  if (identities.length === 0) return 0;

  await lockLegacyRawCourseraEmails(
    db,
    identities.map((identity) => identity.externalEmail),
  );

  const tuples = identities.map((identity) => Prisma.sql`(
    ${identity.externalEmail}::text,
    ${identity.badgeSlug.trim()}::text,
    ${identity.userId}::text
  )`);

  const existingLinkedUsers = await db.$queryRaw<RawLinkedUser[]>(Prisma.sql`
    WITH incoming(external_email, external_key, user_id) AS (
      VALUES ${Prisma.join(tuples, ', ')}
    )
    SELECT DISTINCT existing.user_id AS "userId"
    FROM incoming
    INNER JOIN coursera_badge_progress existing
      ON LOWER(existing.external_email) = incoming.external_email
      AND existing.badge_slug = incoming.external_key
    WHERE existing.user_id IS NOT NULL
    ORDER BY existing.user_id
  `);
  const lockedUserIds = await lockActiveRawProgressUsers(db, {
    organizationId,
    userIds: [
      ...identities.map((identity) => identity.userId),
      ...existingLinkedUsers.map((row) => row.userId),
    ],
    identityKind: 'badge',
  });
  const existingUserWasLocked = lockedUserIds.length > 0
    ? Prisma.sql`existing.user_id IN (${Prisma.join(lockedUserIds)})`
    : Prisma.sql`FALSE`;

  const conflicts = await db.$queryRaw<RawIdentityConflict[]>(Prisma.sql`
    WITH incoming(external_email, external_key, user_id) AS (
      VALUES ${Prisma.join(tuples, ', ')}
    )
    SELECT
      CASE
        WHEN incoming.user_id IS NOT NULL AND incoming_user.id IS NULL
          THEN 'incoming-user-outside-organization'
        WHEN existing.organization_id IS NOT NULL
          AND existing.organization_id <> ${organizationId}::text
          THEN 'foreign-organization'
        WHEN existing.user_id IS NOT NULL AND existing_user.id IS NULL
          THEN 'existing-user-outside-organization'
        WHEN existing.user_id IS NOT NULL
          AND incoming.user_id IS NOT NULL
          AND existing.user_id <> incoming.user_id
          THEN 'different-linked-user'
        ELSE 'unknown'
      END AS kind,
      incoming.external_email AS "externalEmail",
      incoming.external_key AS "externalKey"
    FROM incoming
    LEFT JOIN users incoming_user
      ON incoming_user.id = incoming.user_id
      AND incoming_user.organization_id = ${organizationId}::text
      AND incoming_user.deleted_at IS NULL
    LEFT JOIN coursera_badge_progress existing
      ON LOWER(existing.external_email) = incoming.external_email
      AND existing.badge_slug = incoming.external_key
    LEFT JOIN users existing_user
      ON existing_user.id = existing.user_id
      AND existing_user.organization_id = ${organizationId}::text
      AND existing_user.deleted_at IS NULL
    WHERE (
        incoming.user_id IS NOT NULL
        AND incoming_user.id IS NULL
      )
      OR (
        existing.organization_id IS NOT NULL
        AND existing.organization_id <> ${organizationId}::text
      )
      OR (
        existing.user_id IS NOT NULL
        AND existing_user.id IS NULL
      )
      OR (
        existing.user_id IS NOT NULL
        AND incoming.user_id IS NOT NULL
        AND existing.user_id <> incoming.user_id
      )
    LIMIT 1
  `);

  if (conflicts.length > 0) {
    const conflict = conflicts[0];
    throw new Error(
      `Coursera badge identity conflict (${conflict.kind}) for ${conflict.externalEmail} / ${conflict.externalKey}`,
    );
  }

  return Number(await db.$executeRaw(Prisma.sql`
    WITH incoming(external_email, external_key, user_id) AS (
      VALUES ${Prisma.join(tuples, ', ')}
    )
    UPDATE coursera_badge_progress existing
    SET organization_id = ${organizationId}::text
    FROM incoming
    WHERE existing.organization_id IS NULL
      AND LOWER(existing.external_email) = incoming.external_email
      AND existing.badge_slug = incoming.external_key
      AND (
        existing.user_id IS NULL
        OR (
          ${existingUserWasLocked}
          AND EXISTS (
            SELECT 1
            FROM users linked_user
            WHERE linked_user.id = existing.user_id
              AND linked_user.organization_id = ${organizationId}::text
              AND linked_user.deleted_at IS NULL
          )
        )
      )
  `)) || 0;
}
