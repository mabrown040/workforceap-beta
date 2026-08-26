/**
 * Coursera ↔ portal link coverage audit.
 *
 * Answers: are Coursera progress / xAPI rows attached to portal users?
 * Safe on empty or production DBs. Avoids importing xAPI mapping helpers
 * (those pull in `server-only`); creates the xAPI events table only when
 * missing via inline DDL.
 */
import { prisma } from '@/lib/db/prisma';

export type CourseraLinkHealth = {
  identityMappings: number;
  courseProgress: { total: number; linked: number; orphan: number };
  badgeProgress: { total: number; linked: number; orphan: number };
  xapiEvents: {
    tablePresent: boolean;
    unmatched: number;
    matched: number;
    other: number;
  };
  /**
   * Orphan progress rows whose external_email already has an identity mapping
   * (or a portal user with that email) — healable via backfill-orphans.
   */
  healableOrphans: {
    courseProgress: number;
    badgeProgress: number;
  };
};

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function ensureXapiEventsTable(): Promise<void> {
  if (await tableExists('coursera_xapi_events')) return;
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
      organization_id TEXT,
      mapping_method TEXT,
      completion_status TEXT NOT NULL DEFAULT 'received',
      error TEXT,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function auditCourseraLinkHealth(): Promise<CourseraLinkHealth> {
  await ensureXapiEventsTable();

  const [
    identityMappings,
    courseTotal,
    courseLinked,
    badgeTotal,
    badgeLinked,
    healableCourse,
    healableBadge,
    hasXapiEvents,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM coursera_identity_mappings
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM coursera_course_progress
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM coursera_course_progress WHERE user_id IS NOT NULL
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM coursera_badge_progress
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM coursera_badge_progress WHERE user_id IS NOT NULL
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n
      FROM coursera_course_progress ccp
      WHERE ccp.user_id IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM coursera_identity_mappings cim
            WHERE LOWER(cim.coursera_email) = LOWER(ccp.external_email)
          )
          OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.deleted_at IS NULL
              AND LOWER(u.email) = LOWER(ccp.external_email)
          )
        )
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n
      FROM coursera_badge_progress cbp
      WHERE cbp.user_id IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM coursera_identity_mappings cim
            WHERE LOWER(cim.coursera_email) = LOWER(cbp.external_email)
          )
          OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.deleted_at IS NULL
              AND LOWER(u.email) = LOWER(cbp.external_email)
          )
        )
    `,
    tableExists('coursera_xapi_events'),
  ]);

  let unmatched = 0;
  let matched = 0;
  let other = 0;
  if (hasXapiEvents) {
    const statusRows = await prisma.$queryRaw<
      Array<{ completion_status: string; n: bigint }>
    >`
      SELECT completion_status, COUNT(*)::bigint AS n
      FROM coursera_xapi_events
      GROUP BY completion_status
    `;
    for (const row of statusRows) {
      const n = Number(row.n);
      if (row.completion_status === 'unmatched') unmatched += n;
      else if (row.completion_status === 'completed') matched += n;
      else other += n;
    }
  }

  const courseT = Number(courseTotal[0]?.n ?? 0);
  const courseL = Number(courseLinked[0]?.n ?? 0);
  const badgeT = Number(badgeTotal[0]?.n ?? 0);
  const badgeL = Number(badgeLinked[0]?.n ?? 0);

  return {
    identityMappings: Number(identityMappings[0]?.n ?? 0),
    courseProgress: {
      total: courseT,
      linked: courseL,
      orphan: courseT - courseL,
    },
    badgeProgress: {
      total: badgeT,
      linked: badgeL,
      orphan: badgeT - badgeL,
    },
    xapiEvents: {
      tablePresent: hasXapiEvents,
      unmatched,
      matched,
      other,
    },
    healableOrphans: {
      courseProgress: Number(healableCourse[0]?.n ?? 0),
      badgeProgress: Number(healableBadge[0]?.n ?? 0),
    },
  };
}
