import 'server-only';

import { completeMemberCourse } from '@/lib/member/courseCompletion';
import { prisma } from '@/lib/db/prisma';
import { parseCompletionStatements } from '@/lib/xapi/statements';

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

let ensureTablesPromise: Promise<void> | null = null;

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() || '';
  return email || null;
}

function normalizeActorValue(value: string | null | undefined) {
  const normalized = value?.trim() || '';
  return normalized || null;
}

export async function ensureCourseraMappingTables() {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS coursera_identity_mappings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          coursera_email TEXT,
          actor_identifier TEXT,
          actor_home_page TEXT,
          source TEXT NOT NULL DEFAULT 'manual',
          notes TEXT,
          created_by_user_id TEXT,
          last_seen_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT coursera_identity_mappings_identity_check CHECK (
            coursera_email IS NOT NULL OR actor_identifier IS NOT NULL
          )
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS coursera_identity_mappings_email_key
        ON coursera_identity_mappings (LOWER(coursera_email))
        WHERE coursera_email IS NOT NULL
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS coursera_identity_mappings_actor_key
        ON coursera_identity_mappings (actor_identifier, COALESCE(actor_home_page, ''))
        WHERE actor_identifier IS NOT NULL
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS coursera_identity_mappings_user_id_idx
        ON coursera_identity_mappings (user_id)
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS coursera_xapi_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          statement_id TEXT UNIQUE,
          actor_email TEXT,
          actor_identifier TEXT,
          actor_home_page TEXT,
          course_slug TEXT,
          course_name TEXT,
          verb_id TEXT,
          matched_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          mapping_method TEXT,
          completion_status TEXT NOT NULL DEFAULT 'received',
          error TEXT,
          raw_payload JSONB NOT NULL,
          received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS coursera_xapi_events_actor_email_idx
        ON coursera_xapi_events (LOWER(actor_email))
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS coursera_xapi_events_status_idx
        ON coursera_xapi_events (completion_status, received_at DESC)
      `);
    })().catch((error) => {
      ensureTablesPromise = null;
      throw error;
    });
  }

  await ensureTablesPromise;
}

async function getMappingByActor(identity: XapiIdentity): Promise<MappingRow | null> {
  const actorIdentifier = normalizeActorValue(identity.actorIdentifier);
  if (!actorIdentifier) return null;
  const actorHomePage = normalizeActorValue(identity.actorHomePage) || '';

  const rows = await prisma.$queryRaw<MappingRow[]>`
    SELECT
      cim.id,
      cim.user_id AS "userId",
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
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getMappingByEmail(identity: XapiIdentity): Promise<MappingRow | null> {
  const email = normalizeEmail(identity.email);
  if (!email) return null;

  const rows = await prisma.$queryRaw<MappingRow[]>`
    SELECT
      cim.id,
      cim.user_id AS "userId",
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
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function resolveXapiUser(identity: XapiIdentity): Promise<ResolvedXapiUser | null> {
  await ensureCourseraMappingTables();

  const actorMapping = await getMappingByActor(identity);
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

  const emailMapping = await getMappingByEmail(identity);
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

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true },
  });

  if (!user) return null;

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
        mapping_method,
        completion_status,
        error,
        raw_payload,
        updated_at
      ) VALUES (
        ${statementId},
        ${actorEmail},
        ${actorIdentifier},
        ${actorHomePage},
        ${courseSlug},
        ${courseName},
        ${verbId},
        ${matchedUserId ? matchedUserId : null},
        ${mappingMethod},
        ${args.completionStatus},
        ${error},
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
        mapping_method = EXCLUDED.mapping_method,
        completion_status = EXCLUDED.completion_status,
        error = EXCLUDED.error,
        raw_payload = EXCLUDED.raw_payload,
        updated_at = now()
    `;
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO coursera_xapi_events (
      actor_email,
      actor_identifier,
      actor_home_page,
      course_slug,
      course_name,
      verb_id,
      matched_user_id,
      mapping_method,
      completion_status,
      error,
      raw_payload,
      updated_at
    ) VALUES (
      ${actorEmail},
      ${actorIdentifier},
      ${actorHomePage},
      ${courseSlug},
      ${courseName},
      ${verbId},
      ${matchedUserId ? matchedUserId : null},
      ${mappingMethod},
      ${args.completionStatus},
      ${error},
      CAST(${rawPayload} AS jsonb),
      now()
    )
  `;
}

export async function listCourseraIdentityMappings() {
  await ensureCourseraMappingTables();

  return prisma.$queryRaw<MappingRow[]>`
    SELECT
      cim.id,
      cim.user_id AS "userId",
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
    ORDER BY cim.updated_at DESC, cim.created_at DESC
    LIMIT 200
  `;
}

export async function listRecentUnmatchedXapiEvents(limit = 50) {
  await ensureCourseraMappingTables();

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
}) {
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

  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { id: true, email: true, fullName: true },
  });

  if (!user) throw new Error('User not found');

  const actorMatch = actorIdentifier
    ? await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM coursera_identity_mappings
        WHERE actor_identifier = ${actorIdentifier}
          AND COALESCE(actor_home_page, '') = ${actorHomePage || ''}
        LIMIT 1
      `
    : [];

  const emailMatch = !actorMatch[0] && courseraEmail
    ? await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM coursera_identity_mappings
        WHERE LOWER(coursera_email) = ${courseraEmail}
        LIMIT 1
      `
    : [];

  const existingId = actorMatch[0]?.id || emailMatch[0]?.id || null;

  if (existingId) {
    await prisma.$executeRaw`
      UPDATE coursera_identity_mappings
      SET
        user_id = ${args.userId},
        coursera_email = ${courseraEmail},
        actor_identifier = ${actorIdentifier},
        actor_home_page = ${actorHomePage},
        notes = ${notes},
        source = ${source},
        created_by_user_id = COALESCE(created_by_user_id, ${createdByUserId ? createdByUserId : null}),
        updated_at = now(),
        last_seen_at = COALESCE(last_seen_at, now())
      WHERE id = ${existingId}::uuid
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO coursera_identity_mappings (
        user_id,
        coursera_email,
        actor_identifier,
        actor_home_page,
        notes,
        source,
        created_by_user_id,
        last_seen_at
      ) VALUES (
        ${args.userId},
        ${courseraEmail},
        ${actorIdentifier},
        ${actorHomePage},
        ${notes},
        ${source},
        ${createdByUserId ? createdByUserId : null},
        now()
      )
    `;
  }

  const rows = await prisma.$queryRaw<MappingRow[]>`
    SELECT
      cim.id,
      cim.user_id AS "userId",
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
    WHERE cim.user_id = ${args.userId}
      AND (
        (${courseraEmail} IS NOT NULL AND LOWER(cim.coursera_email) = ${courseraEmail})
        OR (${actorIdentifier} IS NOT NULL AND cim.actor_identifier = ${actorIdentifier} AND COALESCE(cim.actor_home_page, '') = ${actorHomePage || ''})
      )
    ORDER BY cim.updated_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function listCourseraXapiEventsForUserReprocess(userId: string, limit = 100) {
  await ensureCourseraMappingTables();

  return prisma.$queryRaw<Array<{
    id: string;
    statementId: string | null;
    completionStatus: string;
    rawPayload: unknown;
  }>>`
    SELECT
      id,
      statement_id AS "statementId",
      completion_status AS "completionStatus",
      raw_payload AS "rawPayload"
    FROM coursera_xapi_events
    WHERE matched_user_id = ${userId}
      AND completion_status IN ('error', 'ignored')
    ORDER BY received_at ASC
    LIMIT ${limit}
  `;
}

/**
 * Re-run completion processing for stored xAPI payloads (e.g. after slug extraction fixes).
 * Only events that were already matched to a member but failed or were ignored are eligible.
 */
export async function reprocessCourseraXapiEventsForUser(userId: string, limit = 100) {
  const events = await listCourseraXapiEventsForUserReprocess(userId, limit);
  const results: Array<{ eventId: string; ok: boolean; detail?: string }> = [];

  for (const ev of events) {
    const statements = parseCompletionStatements(ev.rawPayload);
    if (statements.length === 0) {
      results.push({ eventId: ev.id, ok: false, detail: 'not_a_completion_statement' });
      continue;
    }

    const st = statements[0];
    const identity = {
      email: st.email,
      actorIdentifier: st.actorIdentifier,
      actorHomePage: st.actorHomePage,
    };

    try {
      const result = await completeMemberCourse({
        userId,
        courseSlug: st.courseSlug,
        courseName: st.courseName,
        source: 'coursera-webhook',
      });

      await recordXapiEvent({
        statementId: st.statementId,
        identity,
        courseSlug: st.courseSlug,
        courseName: st.courseName,
        verbId: st.verbId,
        matchedUserId: userId,
        mappingMethod: 'reprocess-admin',
        completionStatus: 'completed',
        rawPayload: st.rawStatement,
      });

      results.push({
        eventId: ev.id,
        ok: true,
        detail: result.alreadyCompleted ? 'already_completed' : 'completed',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await recordXapiEvent({
        statementId: st.statementId,
        identity,
        courseSlug: st.courseSlug,
        courseName: st.courseName,
        verbId: st.verbId,
        matchedUserId: userId,
        mappingMethod: 'reprocess-admin',
        completionStatus: 'error',
        error: message,
        rawPayload: st.rawStatement,
      });
      results.push({ eventId: ev.id, ok: false, detail: message });
    }
  }

  return { processed: events.length, results };
}
