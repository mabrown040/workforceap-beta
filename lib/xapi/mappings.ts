import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { sendCourseraUnmatchedActorAlertEmail } from '@/lib/email';
import { isLikelyTestAccount } from '@/lib/coursera/testAccountHeuristic';

export type XapiIdentity = {
  email?: string | null;
  actorIdentifier?: string | null;
  actorHomePage?: string | null;
};

export type ResolvedXapiUser = {
  userId: string;
  email: string;
  fullName: string;
  mappingMethod: 'manual_actor' | 'manual_email' | 'direct_email';
  mappingId?: string;
};

type MappingRow = {
  id: string;
  userId: string;
  organizationId: string | null;
  courseraEmail: string | null;
  actorIdentifier: string | null;
  actorHomePage: string | null;
  source: string;
  notes: string | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userEmail: string;
  userFullName: string;
};

type TenantScopeOptions = {
  organizationId?: string | null;
};

type CourseraMappingDb = typeof prisma | Prisma.TransactionClient;

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() || '';
  return email || null;
}

function normalizeActorValue(value: string | null | undefined) {
  const normalized = value?.trim() || '';
  return normalized || null;
}

function normalizeOrganizationId(value: string | null | undefined) {
  const normalized = value?.trim() || '';
  return normalized || null;
}

function orgScopeSql(columnSql: Prisma.Sql, organizationId: string | null | undefined) {
  const orgId = normalizeOrganizationId(organizationId);
  // Use NULLIF to treat empty string as NULL in SQL, matching the updated
  // get_current_org_id() helper that wraps with NULLIF(..., '')
  // (Sprint 2 compliance: 20260614180000_s2_compliance_guc_nullif_xapi_org).
  return orgId
    ? Prisma.sql`AND NULLIF(${columnSql}, '') = NULLIF(${orgId}::text, '')`
    : Prisma.empty;
}

/**
 * Legacy no-op — xAPI ingest tables are created by Prisma migrations
 * (`20260510000000_add_coursera_identity_mapping_model`,
 * `20260708120000_codify_coursera_xapi_prisma_models`). Call sites are kept
 * so this schema unification PR does not require a sweeping refactor.
 */
export async function ensureCourseraMappingTables() {
  // no-op
}

async function notifyIfNewUnmatchedActorEmail(args: {
  actorEmailLower: string;
  statementId: string | null;
  organizationId?: string | null;
}): Promise<void> {
  await ensureCourseraMappingTables();

  const emailLower = args.actorEmailLower.trim().toLowerCase();
  if (!emailLower) return;

  // Smoke/self/load-test actors (test-smoke@…, force-test-…, self-test@…)
  // are not real learners; alerting on them buries the actual unmatched
  // members the admin needs to act on.
  if (isLikelyTestAccount(emailLower)) return;

  const sid = args.statementId?.trim() || null;
  const orgId = args.organizationId?.trim() || null;

  const inserted = await prisma.$queryRaw<Array<{ one: number }>>`
    INSERT INTO coursera_unmatched_actor_alerts (actor_email_lower, first_statement_id, organization_id)
    VALUES (${emailLower}, ${sid}, ${orgId})
    ON CONFLICT (actor_email_lower) DO NOTHING
    RETURNING 1 AS one
  `;

  if (inserted.length === 0) {
    await prisma.$executeRaw`
      UPDATE coursera_unmatched_actor_alerts
      SET last_event_at = now()
      WHERE actor_email_lower = ${emailLower}
    `;
    return;
  }

  console.warn(
    '[COURSERA UNMATCHED ACTOR] NEW Coursera actor email with no portal member mapping — ' +
      `actor_email=${emailLower} statement_id=${sid ?? '(none)'}. ` +
      'Add a Coursera identity mapping (Admin → Coursera).',
  );

  try {
    const result = await sendCourseraUnmatchedActorAlertEmail({
      actorEmail: emailLower,
      statementId: sid,
    });
    if (result.ok) {
      await prisma.$executeRaw`
        UPDATE coursera_unmatched_actor_alerts
        SET email_notified_at = now()
        WHERE actor_email_lower = ${emailLower}
      `;
    }
  } catch (error) {
    console.error('[COURSERA UNMATCHED ACTOR] alert email failed:', error);
  }
}

async function getMappingByActor(identity: XapiIdentity): Promise<MappingRow | null> {
  return getMappingByActorInOrg(identity, null);
}

async function getMappingByActorInOrg(
  identity: XapiIdentity,
  organizationId: string | null | undefined,
): Promise<MappingRow | null> {
  const actorIdentifier = normalizeActorValue(identity.actorIdentifier);
  if (!actorIdentifier) return null;
  const actorHomePage = normalizeActorValue(identity.actorHomePage) || '';
  const orgFilter = orgScopeSql(Prisma.sql`COALESCE(cim.organization_id, u.organization_id)`, organizationId);

  const rows = await prisma.$queryRaw<MappingRow[]>`
    SELECT
      cim.id,
      cim.user_id AS "userId",
      cim.organization_id AS "organizationId",
      cim.coursera_email AS "courseraEmail",
      cim.actor_identifier AS "actorIdentifier",
      cim.actor_home_page AS "actorHomePage",
      cim.source,
      cim.notes,
      cim.last_seen_at AS "lastSeenAt",
      cim.created_at AS "createdAt",
      cim.updated_at AS "updatedAt",
      u.email AS "userEmail",
      u.full_name AS "userFullName"
    FROM coursera_identity_mappings cim
    JOIN users u ON u.id = cim.user_id
    WHERE cim.actor_identifier = ${actorIdentifier}
      AND COALESCE(cim.actor_home_page, '') = ${actorHomePage}
      ${orgFilter}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getMappingByEmail(identity: XapiIdentity): Promise<MappingRow | null> {
  return getMappingByEmailInOrg(identity, null);
}

async function getMappingByEmailInOrg(
  identity: XapiIdentity,
  organizationId: string | null | undefined,
): Promise<MappingRow | null> {
  const email = normalizeEmail(identity.email);
  if (!email) return null;
  const orgFilter = orgScopeSql(Prisma.sql`COALESCE(cim.organization_id, u.organization_id)`, organizationId);

  const rows = await prisma.$queryRaw<MappingRow[]>`
    SELECT
      cim.id,
      cim.user_id AS "userId",
      cim.organization_id AS "organizationId",
      cim.coursera_email AS "courseraEmail",
      cim.actor_identifier AS "actorIdentifier",
      cim.actor_home_page AS "actorHomePage",
      cim.source,
      cim.notes,
      cim.last_seen_at AS "lastSeenAt",
      cim.created_at AS "createdAt",
      cim.updated_at AS "updatedAt",
      u.email AS "userEmail",
      u.full_name AS "userFullName"
    FROM coursera_identity_mappings cim
    JOIN users u ON u.id = cim.user_id
    WHERE LOWER(cim.coursera_email) = ${email}
      ${orgFilter}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function resolveXapiUser(
  identity: XapiIdentity,
  options: TenantScopeOptions = {},
): Promise<ResolvedXapiUser | null> {
  await ensureCourseraMappingTables();
  const organizationId = normalizeOrganizationId(options.organizationId);

  const actorMapping = await getMappingByActorInOrg(identity, organizationId);
  if (actorMapping) {
    await prisma.$executeRaw`
      UPDATE coursera_identity_mappings
      SET last_seen_at = now(), updated_at = now()
      WHERE id = ${actorMapping.id}::uuid
    `;

    return {
      userId: actorMapping.userId,
      email: actorMapping.userEmail,
      fullName: actorMapping.userFullName,
      mappingMethod: 'manual_actor',
      mappingId: actorMapping.id,
    };
  }

  const emailMapping = await getMappingByEmailInOrg(identity, organizationId);
  if (emailMapping) {
    await prisma.$executeRaw`
      UPDATE coursera_identity_mappings
      SET last_seen_at = now(), updated_at = now()
      WHERE id = ${emailMapping.id}::uuid
    `;

    return {
      userId: emailMapping.userId,
      email: emailMapping.userEmail,
      fullName: emailMapping.userFullName,
      mappingMethod: 'manual_email',
      mappingId: emailMapping.id,
    };
  }

  const email = normalizeEmail(identity.email);
  if (!email) return null;

  // Direct portal email match — no profile/role filter: super_admin and other
  // platform accounts resolve the same way as members for xAPI ingest.
  const user = await prisma.user.findFirst({
    where: {
      ...(organizationId ? { organizationId } : {}),
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    select: { id: true, email: true, fullName: true },
  });

  if (!user) return null;

  // Auto-save a mapping so future xAPI events resolve via the fast path
  try {
    await upsertCourseraIdentityMapping({
      userId: user.id,
      courseraEmail: email,
      actorIdentifier: identity.actorIdentifier ?? null,
      actorHomePage: identity.actorHomePage ?? null,
      source: 'auto-direct-email',
      expectedOrganizationId: organizationId,
    });
  } catch (mappingError) {
    // Non-fatal: direct match still works even if mapping save fails
    console.warn('[resolveXapiUser] auto-mapping failed:', mappingError);
  }

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    mappingMethod: 'direct_email',
  };
}

export async function recordXapiEvent(args: {
  statementId?: string;
  identity: XapiIdentity;
  courseSlug?: string;
  courseName?: string;
  verbId?: string;
  matchedUserId?: string;
  organizationId?: string | null;
  mappingMethod?: string;
  completionStatus: 'completed' | 'ignored' | 'unmatched' | 'error';
  error?: string;
  rawPayload: unknown;
}) {
  await ensureCourseraMappingTables();

  const statementId = normalizeActorValue(args.statementId);
  const actorEmail = normalizeEmail(args.identity.email);
  const actorIdentifier = normalizeActorValue(args.identity.actorIdentifier);
  const actorHomePage = normalizeActorValue(args.identity.actorHomePage);
  const courseSlug = normalizeActorValue(args.courseSlug);
  const courseName = normalizeActorValue(args.courseName);
  const verbId = normalizeActorValue(args.verbId);
  const matchedUserId = normalizeActorValue(args.matchedUserId);
  const mappingMethod = normalizeActorValue(args.mappingMethod);
  const error = normalizeActorValue(args.error);
  const rawPayload = JSON.stringify(args.rawPayload ?? {});

  // Resolve organization_id from the matched user when we have one. This
  // closes AUDIT §C-S5: cross-tenant xAPI ingest leak.
  let organizationId = normalizeOrganizationId(args.organizationId);
  if (matchedUserId) {
    try {
      const userRow = await prisma.user.findUnique({
        where: { id: matchedUserId },
        select: { organizationId: true },
      });
      organizationId = userRow?.organizationId ?? null;
    } catch (err) {
      // Non-fatal: event still records, organization_id stays NULL.
      console.warn('[recordXapiEvent] org lookup failed:', err);
    }
  }

  // Fallback: if organizationId is still null, use a sentinel value
  // to satisfy NOT NULL constraint on coursera_xapi_events.
  // This handles unmatched actors and lookup failures gracefully.
  if (!organizationId) {
    organizationId = 'unknown';
  }

  if (statementId) {
    await prisma.$executeRaw`
      INSERT INTO coursera_xapi_events (
        statement_id,
        actor_email,
        actor_identifier,
        actor_home_page,
        course_slug,
        course_name,
        verb_id,
        matched_user_id,
        organization_id,
        mapping_method,
        completion_status,
        error,
        raw_payload,
        updated_at
      ) VALUES (
        ${statementId}::text,
        ${actorEmail}::text,
        ${actorIdentifier}::text,
        ${actorHomePage}::text,
        ${courseSlug}::text,
        ${courseName}::text,
        ${verbId}::text,
        ${matchedUserId ? matchedUserId : null}::text,
        ${organizationId}::text,
        ${mappingMethod}::text,
        ${args.completionStatus}::text,
        ${error}::text,
        CAST(${rawPayload} AS jsonb),
        now()
      )
      ON CONFLICT (statement_id) DO UPDATE SET
        actor_email = EXCLUDED.actor_email,
        actor_identifier = EXCLUDED.actor_identifier,
        actor_home_page = EXCLUDED.actor_home_page,
        course_slug = EXCLUDED.course_slug,
        course_name = EXCLUDED.course_name,
        verb_id = EXCLUDED.verb_id,
        matched_user_id = EXCLUDED.matched_user_id,
        organization_id = EXCLUDED.organization_id,
        mapping_method = EXCLUDED.mapping_method,
        completion_status = EXCLUDED.completion_status,
        error = EXCLUDED.error,
        raw_payload = EXCLUDED.raw_payload,
        updated_at = now()
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO coursera_xapi_events (
        actor_email,
        actor_identifier,
        actor_home_page,
        course_slug,
        course_name,
        verb_id,
        matched_user_id,
        organization_id,
        mapping_method,
        completion_status,
        error,
        raw_payload,
        updated_at
      ) VALUES (
        ${actorEmail}::text,
        ${actorIdentifier}::text,
        ${actorHomePage}::text,
        ${courseSlug}::text,
        ${courseName}::text,
        ${verbId}::text,
        ${matchedUserId ? matchedUserId : null}::text,
        ${organizationId}::text,
        ${mappingMethod}::text,
        ${args.completionStatus}::text,
        ${error}::text,
        CAST(${rawPayload} AS jsonb),
        now()
      )
    `;
  }

  if (
    args.completionStatus === 'unmatched'
    && actorEmail
    && !mappingMethod
  ) {
    void notifyIfNewUnmatchedActorEmail({
      actorEmailLower: actorEmail,
      statementId: statementId ?? null,
      organizationId,
    }).catch((err) => {
      console.error('[recordXapiEvent] unmatched actor alert failed:', err);
    });
  }
}

export async function listCourseraIdentityMappings(options: TenantScopeOptions = {}) {
  await ensureCourseraMappingTables();
  const orgFilter = orgScopeSql(Prisma.sql`COALESCE(cim.organization_id, u.organization_id)`, options.organizationId);

  return prisma.$queryRaw<MappingRow[]>`
    SELECT
      cim.id,
      cim.user_id AS "userId",
      cim.organization_id AS "organizationId",
      cim.coursera_email AS "courseraEmail",
      cim.actor_identifier AS "actorIdentifier",
      cim.actor_home_page AS "actorHomePage",
      cim.source,
      cim.notes,
      cim.last_seen_at AS "lastSeenAt",
      cim.created_at AS "createdAt",
      cim.updated_at AS "updatedAt",
      u.email AS "userEmail",
      u.full_name AS "userFullName"
    FROM coursera_identity_mappings cim
    JOIN users u ON u.id = cim.user_id
    WHERE 1=1
      ${orgFilter}
    ORDER BY cim.updated_at DESC, cim.created_at DESC
    LIMIT 200
  `;
}

export async function listCourseraIdentityMappingsForUser(userId: string) {
  await ensureCourseraMappingTables();

  return prisma.$queryRaw<MappingRow[]>`
    SELECT
      cim.id,
      cim.user_id AS "userId",
      cim.organization_id AS "organizationId",
      cim.coursera_email AS "courseraEmail",
      cim.actor_identifier AS "actorIdentifier",
      cim.actor_home_page AS "actorHomePage",
      cim.source,
      cim.notes,
      cim.last_seen_at AS "lastSeenAt",
      cim.created_at AS "createdAt",
      cim.updated_at AS "updatedAt",
      u.email AS "userEmail",
      u.full_name AS "userFullName"
    FROM coursera_identity_mappings cim
    JOIN users u ON u.id = cim.user_id
    WHERE cim.user_id = ${userId}
    ORDER BY cim.updated_at DESC, cim.created_at DESC
    LIMIT 10
  `;
}

export type CourseraSkillsetProgressSummary = {
  totalRows: number;
  latestSyncedAt: Date | null;
  topMembers: Array<{
    userId: string;
    userEmail: string;
    userFullName: string;
    skillsetId: string;
    skillsetName: string;
    progressPct: number;
    programId: string;
    programSlug: string | null;
    lastSyncedAt: Date;
  }>;
};

export async function getCourseraSkillsetProgressSummary(
  topLimit = 10,
  options: TenantScopeOptions = {},
): Promise<CourseraSkillsetProgressSummary> {
  // The CourseraSkillsetProgress table is owned by Prisma and may not exist yet
  // in environments that haven't run `prisma migrate deploy`. Treat any access
  // failure as a soft-empty so the admin page still renders.
  try {
    const organizationId = normalizeOrganizationId(options.organizationId);
    const [aggregate, top] = await Promise.all([
      prisma.courseraSkillsetProgress.aggregate({
        ...(organizationId ? { where: { user: { organizationId } } } : {}),
        _count: { _all: true },
        _max: { lastSyncedAt: true },
      }),
      prisma.courseraSkillsetProgress.findMany({
        ...(organizationId ? { where: { user: { organizationId } } } : {}),
        orderBy: [{ progressPct: 'desc' }, { lastSyncedAt: 'desc' }],
        take: topLimit,
        select: {
          userId: true,
          skillsetId: true,
          skillsetName: true,
          progressPct: true,
          programId: true,
          programSlug: true,
          lastSyncedAt: true,
          user: { select: { email: true, fullName: true } },
        },
      }),
    ]);

    return {
      totalRows: aggregate._count._all,
      latestSyncedAt: aggregate._max.lastSyncedAt ?? null,
      topMembers: top.map((row) => ({
        userId: row.userId,
        userEmail: row.user.email,
        userFullName: row.user.fullName,
        skillsetId: row.skillsetId,
        skillsetName: row.skillsetName,
        progressPct: row.progressPct,
        programId: row.programId,
        programSlug: row.programSlug,
        lastSyncedAt: row.lastSyncedAt,
      })),
    };
  } catch (error) {
    console.warn('[xapi/mappings] coursera_skillset_progress unavailable:', error);
    return { totalRows: 0, latestSyncedAt: null, topMembers: [] };
  }
}

export type CourseraUnmatchedActorAlertStats = {
  distinctUnmatchedActorEmails: number;
  newAlertRowsLast7Days: number;
  recentFirstSeen: Array<{ actorEmailLower: string; firstSeenAt: Date }>;
};

/**
 * Admin surfacing: distinct unmatched actor inboxes in `coursera_xapi_events`, plus
 * dedupe rows from `coursera_unmatched_actor_alerts` (first-seen tracking for alerts).
 */
export async function getCourseraUnmatchedActorAlertStats(
  options: TenantScopeOptions = {},
): Promise<CourseraUnmatchedActorAlertStats> {
  await ensureCourseraMappingTables();
  const eventOrgFilter = orgScopeSql(Prisma.sql`organization_id`, options.organizationId);
  const alertOrgFilter = orgScopeSql(Prisma.sql`organization_id`, options.organizationId);

  const [distinctRow, recentRows, weekRow] = await Promise.all([
    prisma.$queryRaw<Array<{ c: bigint | number }>>`
      SELECT COUNT(DISTINCT LOWER(TRIM(actor_email)))::bigint AS c
      FROM coursera_xapi_events
      WHERE completion_status = 'unmatched'
        AND mapping_method IS NULL
        AND actor_email IS NOT NULL
        AND TRIM(actor_email) <> ''
        ${eventOrgFilter}
    `,
    prisma.$queryRaw<Array<{ actorEmailLower: string; firstSeenAt: Date }>>`
      SELECT actor_email_lower AS "actorEmailLower", first_seen_at AS "firstSeenAt"
      FROM coursera_unmatched_actor_alerts
      WHERE 1=1
        ${alertOrgFilter}
      ORDER BY first_seen_at DESC
      LIMIT 8
    `,
    prisma.$queryRaw<Array<{ c: bigint | number }>>`
      SELECT COUNT(*)::bigint AS c
      FROM coursera_unmatched_actor_alerts
      WHERE first_seen_at >= now() - interval '7 days'
        ${alertOrgFilter}
    `,
  ]);

  return {
    distinctUnmatchedActorEmails: Number(distinctRow[0]?.c ?? 0),
    newAlertRowsLast7Days: Number(weekRow[0]?.c ?? 0),
    recentFirstSeen: recentRows.map((r) => ({
      actorEmailLower: r.actorEmailLower,
      firstSeenAt: r.firstSeenAt,
    })),
  };
}

export async function listRecentUnmatchedXapiEvents(
  limit = 50,
  options: TenantScopeOptions = {},
) {
  await ensureCourseraMappingTables();
  const orgFilter = orgScopeSql(Prisma.sql`organization_id`, options.organizationId);

  return prisma.$queryRaw<Array<{
    id: string;
    statementId: string | null;
    actorEmail: string | null;
    actorIdentifier: string | null;
    actorHomePage: string | null;
    courseSlug: string | null;
    courseName: string | null;
    verbId: string | null;
    completionStatus: string;
    error: string | null;
    receivedAt: Date;
    updatedAt: Date;
  }>>`
    SELECT
      id,
      statement_id AS "statementId",
      actor_email AS "actorEmail",
      actor_identifier AS "actorIdentifier",
      actor_home_page AS "actorHomePage",
      course_slug AS "courseSlug",
      course_name AS "courseName",
      verb_id AS "verbId",
      completion_status AS "completionStatus",
      error,
      received_at AS "receivedAt",
      updated_at AS "updatedAt"
    FROM coursera_xapi_events
    WHERE completion_status IN ('unmatched', 'error')
      ${orgFilter}
    ORDER BY received_at DESC
    LIMIT ${limit}
  `;
}

export async function upsertCourseraIdentityMapping(args: {
  userId: string;
  courseraEmail?: string | null;
  actorIdentifier?: string | null;
  actorHomePage?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  source?: string;
  expectedOrganizationId?: string | null;
}, db: CourseraMappingDb = prisma) {
  await ensureCourseraMappingTables();

  const courseraEmail = normalizeEmail(args.courseraEmail);
  const actorIdentifier = normalizeActorValue(args.actorIdentifier);
  const actorHomePage = normalizeActorValue(args.actorHomePage);
  const notes = normalizeActorValue(args.notes);
  const createdByUserId = normalizeActorValue(args.createdByUserId);
  const source = normalizeActorValue(args.source) || 'manual';

  if (!courseraEmail && !actorIdentifier) {
    throw new Error('courseraEmail or actorIdentifier is required');
  }

  const user = await db.user.findUnique({
    where: { id: args.userId },
    select: { id: true, email: true, fullName: true, organizationId: true },
  });

  if (!user) throw new Error('User not found');
  const expectedOrganizationId = normalizeOrganizationId(args.expectedOrganizationId);
  if (expectedOrganizationId && user.organizationId !== expectedOrganizationId) {
    throw new Error('User is outside your organization');
  }
  const expectedOrgFilter = expectedOrganizationId
    ? Prisma.sql`AND (organization_id = ${expectedOrganizationId}::text OR organization_id IS NULL)`
    : Prisma.empty;

  const actorMatch = actorIdentifier
    ? await db.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM coursera_identity_mappings
        WHERE actor_identifier = ${actorIdentifier}::text
          AND COALESCE(actor_home_page, '') = COALESCE(${actorHomePage}::text, '')
          ${expectedOrgFilter}
        LIMIT 1
      `
    : [];

  const emailMatch = !actorMatch[0] && courseraEmail
    ? await db.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM coursera_identity_mappings
        WHERE LOWER(coursera_email) = ${courseraEmail}::text
          ${expectedOrgFilter}
        LIMIT 1
      `
    : [];

  const existingId = actorMatch[0]?.id || emailMatch[0]?.id || null;

  if (existingId) {
    await db.$executeRaw`
      UPDATE coursera_identity_mappings
      SET
        user_id = ${args.userId}::text,
        organization_id = ${user.organizationId}::text,
        coursera_email = ${courseraEmail}::text,
        actor_identifier = ${actorIdentifier}::text,
        actor_home_page = ${actorHomePage}::text,
        notes = ${notes}::text,
        source = ${source}::text,
        created_by_user_id = COALESCE(created_by_user_id, ${createdByUserId ? createdByUserId : null}::text),
        updated_at = now(),
        last_seen_at = COALESCE(last_seen_at, now())
      WHERE id = ${existingId}::uuid
    `;
  } else {
    await db.$executeRaw`
      INSERT INTO coursera_identity_mappings (
        user_id,
        organization_id,
        coursera_email,
        actor_identifier,
        actor_home_page,
        notes,
        source,
        created_by_user_id,
        last_seen_at
      ) VALUES (
        ${args.userId}::text,
        ${user.organizationId}::text,
        ${courseraEmail}::text,
        ${actorIdentifier}::text,
        ${actorHomePage}::text,
        ${notes}::text,
        ${source}::text,
        ${createdByUserId ? createdByUserId : null}::text,
        now()
      )
    `;
  }

  const rows = await db.$queryRaw<MappingRow[]>`
    SELECT
      cim.id,
      cim.user_id AS "userId",
      cim.organization_id AS "organizationId",
      cim.coursera_email AS "courseraEmail",
      cim.actor_identifier AS "actorIdentifier",
      cim.actor_home_page AS "actorHomePage",
      cim.source,
      cim.notes,
      cim.last_seen_at AS "lastSeenAt",
      cim.created_at AS "createdAt",
      cim.updated_at AS "updatedAt",
      u.email AS "userEmail",
      u.full_name AS "userFullName"
    FROM coursera_identity_mappings cim
    JOIN users u ON u.id = cim.user_id
    WHERE cim.user_id = ${args.userId}::text
      AND (
        (${courseraEmail}::text IS NOT NULL AND LOWER(cim.coursera_email) = ${courseraEmail}::text)
        OR (${actorIdentifier}::text IS NOT NULL AND cim.actor_identifier = ${actorIdentifier}::text AND COALESCE(cim.actor_home_page, '') = COALESCE(${actorHomePage}::text, ''))
      )
    ORDER BY cim.updated_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}
