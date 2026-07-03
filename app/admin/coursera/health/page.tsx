import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import DataTable from '@/components/portal/ui/DataTable';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { loadB4BPrograms } from '@/lib/coursera/programContentsCache';
import { prisma } from '@/lib/db/prisma';
import IgnoredXapiSummaryCard from '@/components/admin/IgnoredXapiSummaryCard';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Admin – Coursera health',
    description:
      'Read-only diagnostics for the Coursera ingest pipeline: canonical mappings, xAPI traffic, B4B sync state, and the most-ignored signals over the last 7 days.',
    path: '/admin/coursera/health',
  });
}

export const dynamic = 'force-dynamic';

// Cron workflow keys we care about on this page. These match the keys written
// by the Coursera-related cron routes via recordWorkflowDiagnostic / withCronLogging.
const COURSERA_CRON_WORKFLOW_KEYS = [
  'cron_coursera_b4b_sync',
  'cron_coursera_sync',
  'cron_coursera_training_sync',
] as const;

type CardSeverity = 'ok' | 'warn' | 'bad';

type SummaryCard = {
  title: string;
  primary: string;
  secondary?: string;
  hint?: string;
  severity: CardSeverity;
};

type CronRunRow = {
  id: string;
  workflow: string;
  status: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  ranAt: Date;
};

type IgnoredSlugRow = {
  courseSlug: string;
  eventCount: number;
};

type UnmatchedActorRow = {
  actorEmail: string;
  eventCount: number;
};

type DriftRow = {
  key: string;
  email: string;
  courseName: string;
  b4bPercent: number;
  ourPercent: number;
  delta: number;
  lastActivityTime: Date | null;
};

type OutOfCatalogRow = {
  courseSlug: string;
  eventCount: number;
  distinctLearners: number;
  lastSeen: Date | null;
};

type SyncDriftRow = {
  key: string;
  email: string;
  courseName: string;
  b4bLastActivity: Date | null;
  ourLastUpdated: Date | null;
  deltaHours: number;
};

type WrongProgramRow = {
  key: string;
  email: string;
  primaryProgramSlug: string | null;
  courseStudied: string;
  courseStudiedProgram: string;
  eventCount: number;
};

function fmtDateTime(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toLocaleString();
}

function relativeAge(value: Date | null | undefined, now: Date): string {
  if (!value) return 'never';
  const diffMs = now.getTime() - value.getTime();
  if (diffMs < 0) return 'just now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function severityBackground(severity: CardSeverity): string {
  switch (severity) {
    case 'bad':
      return 'rgba(239, 68, 68, 0.10)';
    case 'warn':
      return 'rgba(251, 191, 36, 0.12)';
    case 'ok':
    default:
      return 'var(--color-light)';
  }
}

function severityBorder(severity: CardSeverity): string {
  switch (severity) {
    case 'bad':
      return '1px solid rgba(239, 68, 68, 0.45)';
    case 'warn':
      return '1px solid rgba(251, 191, 36, 0.45)';
    case 'ok':
    default:
      return '1px solid var(--outline-variant)';
  }
}

function severityAccent(severity: CardSeverity): string {
  switch (severity) {
    case 'bad':
      return 'rgb(185, 28, 28)';
    case 'warn':
      return 'rgb(146, 90, 0)';
    case 'ok':
    default:
      return 'var(--color-accent)';
  }
}

function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : plural ?? singular + 's'}`;
}

async function loadCanonicalMappingCount(): Promise<number | null> {
  try {
    return await prisma.courseraCanonicalCourseMapping.count();
  } catch (error) {
    console.error('[admin/coursera/health] canonical mapping count failed:', error);
    return null;
  }
}

async function loadXapiTrafficSummary(now: Date): Promise<{
  total: number;
  processed: number;
  unprocessed: number;
} | null> {
  try {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [total, processed] = await Promise.all([
      prisma.xapiStatement.count({ where: { createdAt: { gte: since } } }),
      prisma.xapiStatement.count({
        where: { createdAt: { gte: since }, processed: true },
      }),
    ]);
    return { total, processed, unprocessed: total - processed };
  } catch (error) {
    console.error('[admin/coursera/health] xapi traffic summary failed:', error);
    return null;
  }
}

async function loadB4bSummary(): Promise<{
  total: number;
  latestSyncedAt: Date | null;
  latestActivityAt: Date | null;
} | null> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ total: bigint | number; latestSync: Date | null; latestActivity: Date | null }>
    >`
      SELECT
        COUNT(*)::bigint AS total,
        MAX(last_synced_at) AS "latestSync",
        MAX(last_activity_time) AS "latestActivity"
      FROM coursera_course_progress
    `;
    const row = rows[0];
    return {
      total: Number(row?.total ?? 0),
      latestSyncedAt: row?.latestSync ?? null,
      latestActivityAt: row?.latestActivity ?? null,
    };
  } catch (error) {
    console.error('[admin/coursera/health] B4B summary failed:', error);
    return null;
  }
}

async function loadIgnoredRatio(now: Date): Promise<{
  total: number;
  ignored: number;
} | null> {
  try {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw<Array<{ total: bigint | number; ignored: bigint | number }>>`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE completion_status = 'ignored')::bigint AS ignored
      FROM coursera_xapi_events
      WHERE received_at >= ${since}
    `;
    const row = rows[0];
    return {
      total: Number(row?.total ?? 0),
      ignored: Number(row?.ignored ?? 0),
    };
  } catch (error) {
    console.error('[admin/coursera/health] ignored ratio failed:', error);
    return null;
  }
}

async function loadRecentCronRuns(): Promise<CronRunRow[]> {
  try {
    const rows = await prisma.workflowDiagnostic.findMany({
      where: { workflow: { in: [...COURSERA_CRON_WORKFLOW_KEYS] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        workflow: true,
        status: true,
        summary: true,
        metadata: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      workflow: r.workflow,
      status: r.status,
      summary: r.summary,
      metadata: (r.metadata as Record<string, unknown> | null) ?? null,
      ranAt: r.createdAt,
    }));
  } catch (error) {
    console.error('[admin/coursera/health] cron runs load failed:', error);
    return [];
  }
}

async function loadTopIgnoredSlugs(now: Date): Promise<IgnoredSlugRow[]> {
  try {
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw<Array<{ courseSlug: string | null; eventCount: bigint | number }>>`
      SELECT
        course_slug AS "courseSlug",
        COUNT(*)::bigint AS "eventCount"
      FROM coursera_xapi_events
      WHERE completion_status = 'ignored'
        AND received_at >= ${since}
        AND course_slug IS NOT NULL
        AND course_slug <> ''
      GROUP BY course_slug
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;
    return rows
      .filter((r): r is { courseSlug: string; eventCount: bigint | number } => Boolean(r.courseSlug))
      .map((r) => ({
        courseSlug: r.courseSlug,
        eventCount: Number(r.eventCount ?? 0),
      }));
  } catch (error) {
    console.error('[admin/coursera/health] top ignored slugs failed:', error);
    return [];
  }
}

async function loadTopUnmatchedActors(now: Date): Promise<UnmatchedActorRow[]> {
  try {
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw<Array<{ actorEmail: string | null; eventCount: bigint | number }>>`
      SELECT
        LOWER(actor_email) AS "actorEmail",
        COUNT(*)::bigint AS "eventCount"
      FROM coursera_xapi_events
      WHERE matched_user_id IS NULL
        AND received_at >= ${since}
        AND actor_email IS NOT NULL
        AND actor_email <> ''
      GROUP BY LOWER(actor_email)
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;
    return rows
      .filter((r): r is { actorEmail: string; eventCount: bigint | number } => Boolean(r.actorEmail))
      .map((r) => ({
        actorEmail: r.actorEmail,
        eventCount: Number(r.eventCount ?? 0),
      }));
  } catch (error) {
    console.error('[admin/coursera/health] top unmatched actors failed:', error);
    return [];
  }
}

// ─── B4B vs xAPI cross-check loaders ──────────────────────────────────────
//
// These four queries surface drift between the two Coursera data sources we
// now run in parallel (B4B sync → coursera_course_progress; xAPI webhook →
// coursera_xapi_events + course_progress). Each loader returns [] on failure
// so the page always renders.

async function loadB4BvsOursDrift(): Promise<DriftRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        userId: string;
        email: string | null;
        courseName: string;
        courseraCourseId: string;
        b4bPercent: string | number;
        ourPercent: number;
        delta: number;
        lastActivityTime: Date | null;
      }>
    >`
      SELECT
        ccp.user_id AS "userId",
        u.email AS "email",
        ccp.course_name AS "courseName",
        ccp.coursera_course_id AS "courseraCourseId",
        ccp.overall_progress AS "b4bPercent",
        cp.percent_complete AS "ourPercent",
        ABS(ccp.overall_progress - cp.percent_complete)::int AS "delta",
        ccp.last_activity_time AS "lastActivityTime"
      FROM coursera_course_progress ccp
      JOIN course_progress cp
        ON cp.user_id = ccp.user_id
        AND cp.course_id = ccp.coursera_course_id
      JOIN users u ON u.id = ccp.user_id
      WHERE ccp.user_id IS NOT NULL
        AND ABS(ccp.overall_progress - cp.percent_complete) > 20
      ORDER BY ABS(ccp.overall_progress - cp.percent_complete) DESC
      LIMIT 20
    `;
    return rows.map((r) => ({
      key: `${r.userId}::${r.courseraCourseId}`,
      email: r.email ?? '(unknown)',
      courseName: r.courseName,
      b4bPercent: Number(r.b4bPercent) || 0,
      ourPercent: Number(r.ourPercent) || 0,
      delta: Number(r.delta) || 0,
      lastActivityTime: r.lastActivityTime,
    }));
  } catch (error) {
    console.error('[admin/coursera/health] B4B vs ours drift failed:', error);
    return [];
  }
}

async function loadOutOfCatalogXapi(
  now: Date,
  b4bCourseSlugs: Set<string>,
): Promise<OutOfCatalogRow[]> {
  try {
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw<
      Array<{
        courseSlug: string | null;
        eventCount: bigint | number;
        distinctLearners: bigint | number;
        lastSeen: Date | null;
      }>
    >`
      SELECT
        course_slug AS "courseSlug",
        COUNT(*)::bigint AS "eventCount",
        COUNT(DISTINCT COALESCE(matched_user_id, LOWER(actor_email), actor_identifier))::bigint AS "distinctLearners",
        MAX(received_at) AS "lastSeen"
      FROM coursera_xapi_events
      WHERE received_at >= ${since}
        AND course_slug IS NOT NULL
        AND course_slug <> ''
      GROUP BY course_slug
      ORDER BY COUNT(*) DESC
    `;
    // Filter in JS — the B4B program list comes from an in-memory cache that
    // the SQL layer can't see.
    return rows
      .filter((r): r is { courseSlug: string; eventCount: bigint | number; distinctLearners: bigint | number; lastSeen: Date | null } => Boolean(r.courseSlug))
      .filter((r) => !b4bCourseSlugs.has(r.courseSlug))
      .slice(0, 20)
      .map((r) => ({
        courseSlug: r.courseSlug,
        eventCount: Number(r.eventCount ?? 0),
        distinctLearners: Number(r.distinctLearners ?? 0),
        lastSeen: r.lastSeen,
      }));
  } catch (error) {
    console.error('[admin/coursera/health] out-of-catalog xapi failed:', error);
    return [];
  }
}

async function loadSyncDriftPairs(): Promise<SyncDriftRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        userId: string;
        email: string | null;
        courseName: string;
        courseraCourseId: string;
        b4bLastActivity: Date | null;
        ourLastUpdated: Date | null;
        deltaSeconds: number | null;
      }>
    >`
      SELECT
        ccp.user_id AS "userId",
        u.email AS "email",
        ccp.course_name AS "courseName",
        ccp.coursera_course_id AS "courseraCourseId",
        ccp.last_activity_time AS "b4bLastActivity",
        cp.last_updated_at AS "ourLastUpdated",
        EXTRACT(EPOCH FROM ABS(ccp.last_activity_time - cp.last_updated_at))::int AS "deltaSeconds"
      FROM coursera_course_progress ccp
      JOIN course_progress cp
        ON cp.user_id = ccp.user_id
        AND cp.course_id = ccp.coursera_course_id
      JOIN users u ON u.id = ccp.user_id
      WHERE ccp.user_id IS NOT NULL
        AND ccp.last_activity_time IS NOT NULL
        AND cp.last_updated_at IS NOT NULL
        AND ABS(ccp.last_activity_time - cp.last_updated_at) > INTERVAL '24 hours'
      ORDER BY ABS(ccp.last_activity_time - cp.last_updated_at) DESC
      LIMIT 20
    `;
    return rows.map((r) => ({
      key: `${r.userId}::${r.courseraCourseId}`,
      email: r.email ?? '(unknown)',
      courseName: r.courseName,
      b4bLastActivity: r.b4bLastActivity,
      ourLastUpdated: r.ourLastUpdated,
      deltaHours: r.deltaSeconds == null ? 0 : Math.round(Number(r.deltaSeconds) / 3600),
    }));
  } catch (error) {
    console.error('[admin/coursera/health] sync drift pairs failed:', error);
    return [];
  }
}

async function loadWrongProgramStudying(
  now: Date,
  slugToProgram: Map<string, { slug: string | null; name: string }>,
): Promise<WrongProgramRow[]> {
  try {
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw<
      Array<{
        userId: string;
        email: string | null;
        courseSlug: string;
        primaryProgramSlug: string | null;
        eventCount: bigint | number;
      }>
    >`
      SELECT
        cxe.matched_user_id AS "userId",
        u.email AS "email",
        cxe.course_slug AS "courseSlug",
        ce.program_slug AS "primaryProgramSlug",
        COUNT(*)::bigint AS "eventCount"
      FROM coursera_xapi_events cxe
      JOIN users u ON u.id = cxe.matched_user_id
      LEFT JOIN course_enrollments ce
        ON ce.user_id = cxe.matched_user_id
        AND ce.is_primary = true
      WHERE cxe.received_at >= ${since}
        AND cxe.matched_user_id IS NOT NULL
        AND cxe.course_slug IS NOT NULL
        AND cxe.course_slug <> ''
      GROUP BY cxe.matched_user_id, u.email, cxe.course_slug, ce.program_slug
      ORDER BY COUNT(*) DESC
      LIMIT 200
    `;
    const findings: WrongProgramRow[] = [];
    for (const r of rows) {
      const program = slugToProgram.get(r.courseSlug);
      if (!program) continue; // Course isn't in any B4B program → handled by out-of-catalog check.
      const programIdent = program.slug ?? program.name;
      // No primary enrollment to compare against, or the course's program
      // matches the user's primary program — not a wrong-program signal.
      if (!r.primaryProgramSlug) continue;
      // Compare normalized: B4B program slug vs WAP enrollment program slug
      // can differ in casing or punctuation, so use a loose match.
      const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (program.slug && norm(program.slug) === norm(r.primaryProgramSlug)) continue;
      if (norm(program.name) === norm(r.primaryProgramSlug)) continue;
      findings.push({
        key: `${r.userId}::${r.courseSlug}`,
        email: r.email ?? '(unknown)',
        primaryProgramSlug: r.primaryProgramSlug,
        courseStudied: r.courseSlug,
        courseStudiedProgram: programIdent,
        eventCount: Number(r.eventCount ?? 0),
      });
      if (findings.length >= 20) break;
    }
    return findings;
  } catch (error) {
    console.error('[admin/coursera/health] wrong-program studying failed:', error);
    return [];
  }
}

async function loadB4BProgramsSafe(): Promise<
  Awaited<ReturnType<typeof loadB4BPrograms>>
> {
  try {
    return await loadB4BPrograms();
  } catch (error) {
    console.error('[admin/coursera/health] loadB4BPrograms failed:', error);
    return [];
  }
}

const cardStyle: CSSProperties = {
  padding: '1.1rem 1.2rem',
  borderRadius: 'var(--radius-md)',
  display: 'grid',
  gap: '0.45rem',
  minHeight: 0,
};

const cardTitleStyle: CSSProperties = {
  fontSize: '0.78rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 600,
  color: 'var(--color-on-surface-variant)',
};

const cardPrimaryStyle: CSSProperties = {
  fontSize: '1.65rem',
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
};

const cardSecondaryStyle: CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--color-on-surface-variant)',
};

const cardHintStyle: CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  marginTop: '0.15rem',
};

const sectionHeadingStyle: CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  margin: '0 0 0.6rem 0',
};

const sectionStyle: CSSProperties = {
  padding: '1.1rem 1.2rem',
  marginBottom: '1rem',
};

function pickStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'success') return 'rgb(22, 163, 74)';
  if (s === 'started') return 'var(--color-on-surface-variant)';
  if (s === 'fallback') return 'rgb(146, 90, 0)';
  if (s === 'inspection') return 'var(--color-on-surface-variant)';
  return 'rgb(185, 28, 28)'; // error / unknown
}

function summarizeMetadataCounts(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '—';
  // Pull a handful of common count-ish fields if present, in priority order.
  const interestingKeys = [
    'rowsUpserted',
    'rowsWritten',
    'rowsProcessed',
    'rowsRead',
    'enrollmentsProcessed',
    'membersProcessed',
    'updated',
    'created',
    'skipped',
    'errors',
    'matched',
    'unmatched',
    'count',
    'durationMs',
  ];
  const parts: string[] = [];
  for (const key of interestingKeys) {
    const v = metadata[key];
    if (typeof v === 'number') {
      parts.push(`${key}=${v}`);
    } else if (typeof v === 'string' && /^\d+$/.test(v)) {
      parts.push(`${key}=${v}`);
    }
    if (parts.length >= 4) break;
  }
  if (parts.length === 0) return '—';
  return parts.join(' · ');
}

export default async function AdminCourseraHealthPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/coursera/health');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const now = new Date();

  const [
    canonicalCount,
    xapiTraffic,
    b4bSummary,
    ignoredRatio,
    cronRuns,
    topIgnoredSlugs,
    topUnmatchedActors,
    b4bPrograms,
    driftRows,
    syncDriftRows,
  ] = await Promise.all([
    loadCanonicalMappingCount(),
    loadXapiTrafficSummary(now),
    loadB4bSummary(),
    loadIgnoredRatio(now),
    loadRecentCronRuns(),
    loadTopIgnoredSlugs(now),
    loadTopUnmatchedActors(now),
    loadB4BProgramsSafe(),
    loadB4BvsOursDrift(),
    loadSyncDriftPairs(),
  ]);

  // Build the B4B course-slug index used by the out-of-catalog and wrong-
  // program checks. We do this once and pass it into both loaders so a single
  // B4B fetch supports two cross-checks.
  const b4bCourseSlugs = new Set<string>();
  const slugToProgram = new Map<string, { slug: string | null; name: string }>();
  for (const program of b4bPrograms) {
    for (const course of program.courses) {
      if (course.slug) {
        b4bCourseSlugs.add(course.slug);
        if (!slugToProgram.has(course.slug)) {
          slugToProgram.set(course.slug, { slug: program.slug, name: program.name });
        }
      }
    }
  }

  const [outOfCatalogRows, wrongProgramRows] = await Promise.all([
    loadOutOfCatalogXapi(now, b4bCourseSlugs),
    loadWrongProgramStudying(now, slugToProgram),
  ]);

  const lastB4bCron = cronRuns.find((r) => r.workflow === 'cron_coursera_b4b_sync');
  const lastB4bCronFailed = lastB4bCron?.status === 'error';

  // --- Build the four summary cards. ---

  const cards: SummaryCard[] = [];

  // Card 1: canonical mappings
  if (canonicalCount === null) {
    cards.push({
      title: 'Canonical mappings',
      primary: '—',
      secondary: 'Unable to load count',
      severity: 'bad',
    });
  } else {
    const isZero = canonicalCount === 0;
    cards.push({
      title: 'Canonical mappings',
      primary: canonicalCount.toLocaleString(),
      secondary: isZero
        ? 'CourseraCanonicalCourseMapping is empty'
        : `${pluralize(canonicalCount, 'row')} in CourseraCanonicalCourseMapping`,
      hint: isZero
        ? 'No mappings — every xAPI event is being ignored. Add mappings via /admin/coursera below.'
        : undefined,
      severity: isZero ? 'bad' : 'ok',
    });
  }

  // Card 2: xAPI events 24h
  if (!xapiTraffic) {
    cards.push({
      title: 'xAPI events (last 24h)',
      primary: '—',
      secondary: 'Unable to load xAPI counts',
      severity: 'bad',
    });
  } else {
    const { total, processed, unprocessed } = xapiTraffic;
    const unprocessedRatio = total > 0 ? unprocessed / total : 0;
    const severity: CardSeverity =
      total === 0 ? 'warn' : unprocessedRatio > 0.2 ? 'warn' : 'ok';
    cards.push({
      title: 'xAPI events (last 24h)',
      primary: total.toLocaleString(),
      secondary:
        total === 0
          ? 'No xAPI traffic in 24h'
          : `processed=${processed.toLocaleString()} · unprocessed=${unprocessed.toLocaleString()} (${(
              unprocessedRatio * 100
            ).toFixed(1)}%)`,
      hint:
        severity === 'warn' && total > 0
          ? 'More than 20% of recent xAPI rows are unprocessed.'
          : severity === 'warn'
            ? 'No traffic — confirm Coursera webhook is firing.'
            : undefined,
      severity,
    });
  }

  // Card 3: B4B course rows
  if (!b4bSummary) {
    cards.push({
      title: 'B4B course rows',
      primary: '—',
      secondary: 'Unable to load coursera_course_progress',
      severity: 'bad',
    });
  } else {
    const lastSync = b4bSummary.latestSyncedAt ?? b4bSummary.latestActivityAt;
    const lastSyncMs = lastSync ? now.getTime() - lastSync.getTime() : null;
    const isStale = lastSyncMs === null ? true : lastSyncMs > 12 * 60 * 60 * 1000;
    let severity: CardSeverity = b4bSummary.total === 0 || isStale ? 'bad' : 'ok';
    if (lastB4bCronFailed) severity = 'bad';

    const hintParts: string[] = [];
    if (b4bSummary.total === 0) {
      hintParts.push('No CourseraCourseProgress rows. The B4B cron has never landed data.');
    } else if (isStale) {
      hintParts.push('Last sync > 12h ago — B4B cron may be failing.');
    }
    if (lastB4bCronFailed) {
      hintParts.push(
        'Latest cron_coursera_b4b_sync run logged an error — see workflow diagnostics below.',
      );
    }

    cards.push({
      title: 'B4B course rows',
      primary: b4bSummary.total.toLocaleString(),
      secondary: lastSync
        ? `last sync ${fmtDateTime(lastSync)} (${relativeAge(lastSync, now)})`
        : 'no sync timestamp on file',
      hint: hintParts.length > 0 ? hintParts.join(' ') : undefined,
      severity,
    });
  }

  // Card 4: xAPI ignored ratio 24h
  if (!ignoredRatio) {
    cards.push({
      title: 'xAPI ignored ratio (24h)',
      primary: '—',
      secondary: 'Unable to load coursera_xapi_events',
      severity: 'bad',
    });
  } else {
    const { total, ignored } = ignoredRatio;
    const ratio = total > 0 ? ignored / total : 0;
    const severity: CardSeverity = total === 0 ? 'ok' : ratio > 0.5 ? 'bad' : ratio > 0.2 ? 'warn' : 'ok';
    cards.push({
      title: 'xAPI ignored ratio (24h)',
      primary: total === 0 ? '—' : `${(ratio * 100).toFixed(1)}%`,
      secondary:
        total === 0
          ? 'No coursera_xapi_events in 24h'
          : `ignored=${ignored.toLocaleString()} of ${total.toLocaleString()}`,
      hint:
        severity === 'bad'
          ? 'Most events are being ignored — likely missing canonical mappings.'
          : undefined,
      severity,
    });
  }

  return (
    <PortalPageFrame>
      <PageHeader
        title="Coursera health"
        subtitle="Read-only diagnostics for the xAPI ingest, canonical mappings, and B4B sync. Updated on every page load."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Coursera', href: '/admin/coursera' },
          { label: 'Health' },
        ]}
        action={
          <Link href="/admin/coursera/enrollment" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            Enrollment pipeline →
          </Link>
        }
      />

      {/* Section 1 — health summary cards. */}
      <section
        aria-label="Coursera ingest health summary"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            className="content-card"
            style={{
              ...cardStyle,
              background: severityBackground(card.severity),
              border: severityBorder(card.severity),
            }}
          >
            <span style={cardTitleStyle}>{card.title}</span>
            <span style={{ ...cardPrimaryStyle, color: severityAccent(card.severity) }}>
              {card.primary}
            </span>
            {card.secondary ? <span style={cardSecondaryStyle}>{card.secondary}</span> : null}
            {card.hint ? (
              <span style={{ ...cardHintStyle, color: severityAccent(card.severity) }}>
                {card.hint}
              </span>
            ) : null}
          </div>
        ))}
      </section>

      {/* Section 1.5 — ignored xAPI events (top stuck slugs). */}
      <section style={{ marginBottom: '1rem' }}>
        <IgnoredXapiSummaryCard />
      </section>

      {/* Section 2 — recent cron runs. */}
      <section className="content-card" style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Recent Coursera cron runs</h2>
        <p style={{ ...cardSecondaryStyle, marginBottom: '0.6rem' }}>
          Last 20 entries from <code>workflow_diagnostics</code> for{' '}
          <code>cron_coursera_b4b_sync</code>, <code>cron_coursera_sync</code>, and{' '}
          <code>cron_coursera_training_sync</code>.
        </p>
        {cronRuns.length === 0 ? (
          <span style={cardSecondaryStyle}>
            No cron run history found. The cron jobs have not logged a diagnostic recently.
          </span>
        ) : (
          <DataTable
            density="compact"
            rows={cronRuns}
            rowKey={(row) => row.id}
            columns={[
              {
                key: 'workflow',
                header: 'Workflow',
                cell: (row) => <code style={{ fontSize: '0.85rem' }}>{row.workflow}</code>,
              },
              {
                key: 'status',
                header: 'Status',
                cell: (row) => (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0.4rem',
                      color: pickStatusColor(row.status),
                      background: 'var(--color-light)',
                    }}
                  >
                    {row.status}
                  </span>
                ),
              },
              {
                key: 'summary',
                header: 'Summary',
                cell: (row) => (
                  <span style={{ fontSize: '0.85rem' }}>{row.summary || '—'}</span>
                ),
              },
              {
                key: 'metadata',
                header: 'Result counts',
                cell: (row) => (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-on-surface-variant)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {summarizeMetadataCounts(row.metadata)}
                  </span>
                ),
              },
              {
                key: 'ran',
                header: 'Ran at',
                cell: (row) => (
                  <span style={{ fontSize: '0.85rem' }}>
                    {fmtDateTime(row.ranAt)}{' '}
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>
                      ({relativeAge(row.ranAt, now)})
                    </span>
                  </span>
                ),
              },
            ]}
          />
        )}
      </section>

      {/* Section 3 — top ignored course slugs (7d). */}
      <section className="content-card" style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Top ignored course slugs (last 7 days)</h2>
        <p style={{ ...cardSecondaryStyle, marginBottom: '0.6rem' }}>
          xAPI events whose <code>completion_status = &apos;ignored&apos;</code>, grouped by{' '}
          <code>course_slug</code>. Each row links to the Coursera admin where you can wire it up
          via the canonical course mapping table.
        </p>
        {topIgnoredSlugs.length === 0 ? (
          <span style={cardSecondaryStyle}>
            No ignored xAPI events with a <code>course_slug</code> in the last 7 days.
          </span>
        ) : (
          <DataTable
            density="compact"
            rows={topIgnoredSlugs}
            rowKey={(row) => row.courseSlug}
            columns={[
              {
                key: 'slug',
                header: 'course_slug',
                cell: (row) => <code style={{ fontSize: '0.85rem' }}>{row.courseSlug}</code>,
              },
              {
                key: 'count',
                header: 'Ignored events',
                align: 'right',
                cell: (row) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {row.eventCount.toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                cell: () => (
                  <Link href="/admin/coursera?ui=legacy" style={{ fontWeight: 600 }}>
                    Map this →
                  </Link>
                ),
              },
            ]}
          />
        )}
      </section>

      {/* Section 4 — top unmatched actor emails (7d). */}
      <section className="content-card" style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Top unmatched actor emails (last 7 days)</h2>
        <p style={{ ...cardSecondaryStyle, marginBottom: '0.6rem' }}>
          xAPI actors with <code>matched_user_id IS NULL</code>. Each link goes to the
          per-learner unmatched-events page where you can manually bind them.
        </p>
        {topUnmatchedActors.length === 0 ? (
          <span style={cardSecondaryStyle}>
            No unmatched xAPI actors in the last 7 days.
          </span>
        ) : (
          <DataTable
            density="compact"
            rows={topUnmatchedActors}
            rowKey={(row) => row.actorEmail}
            columns={[
              {
                key: 'email',
                header: 'actor_email',
                cell: (row) => <code style={{ fontSize: '0.85rem' }}>{row.actorEmail}</code>,
              },
              {
                key: 'count',
                header: 'Events',
                align: 'right',
                cell: (row) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {row.eventCount.toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                cell: (row) => (
                  <Link
                    href={`/admin/coursera/learners/unmatched/${encodeURIComponent(row.actorEmail)}`}
                    style={{ fontWeight: 600 }}
                  >
                    Inspect →
                  </Link>
                ),
              },
            ]}
          />
        )}
      </section>

      {/* Cross-check intro — B4B vs xAPI alerts. */}
      <section style={{ marginBottom: '0.6rem' }}>
        <h2 style={{ ...sectionHeadingStyle, fontSize: '1.15rem', marginBottom: '0.35rem' }}>
          B4B vs xAPI cross-checks
        </h2>
        <p style={cardSecondaryStyle}>
          Coursera now feeds us through two channels: the B4B sync (authoritative
          progress + lastActivity, cron-pulled into <code>coursera_course_progress</code>)
          and the realtime xAPI webhook (events into <code>coursera_xapi_events</code>,
          rolled up into <code>course_progress</code>). The four sections below surface
          disagreements between those two views — drift means a missing canonical
          mapping, stale ingest, an out-of-curriculum course, or a learner studying
          the wrong program. Empty tables mean things agree.
        </p>
      </section>

      {/* Section 5 — B4B vs ours drift > 20pts (last 7d). */}
      <section className="content-card" style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Drift &gt; 20pts (B4B vs our progress)</h2>
        <p style={{ ...cardSecondaryStyle, marginBottom: '0.6rem' }}>
          Members where B4B&apos;s <code>overall_progress</code> disagrees with our{' '}
          <code>course_progress.percent_complete</code> by more than 20 points for the
          same (userId, courseraCourseId). Indicates a missing canonical mapping, a
          stale xAPI replay, or a learner Coursera knows about that our pipeline
          hasn&apos;t caught up on.
        </p>
        {driftRows.length === 0 ? (
          <span style={cardSecondaryStyle}>
            No (userId, courseraCourseId) pairs with &gt; 20pt drift right now.
          </span>
        ) : (
          <DataTable
            density="compact"
            rows={driftRows}
            rowKey={(row) => row.key}
            columns={[
              {
                key: 'email',
                header: 'Member',
                cell: (row) => <code style={{ fontSize: '0.85rem' }}>{row.email}</code>,
              },
              {
                key: 'course',
                header: 'Course',
                cell: (row) => <span style={{ fontSize: '0.85rem' }}>{row.courseName}</span>,
              },
              {
                key: 'b4b',
                header: 'B4B %',
                align: 'right',
                cell: (row) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {row.b4bPercent.toFixed(0)}
                  </span>
                ),
              },
              {
                key: 'ours',
                header: 'Our %',
                align: 'right',
                cell: (row) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {row.ourPercent.toFixed(0)}
                  </span>
                ),
              },
              {
                key: 'delta',
                header: 'Δ',
                align: 'right',
                cell: (row) => (
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      color: 'rgb(185, 28, 28)',
                    }}
                  >
                    {row.delta}
                  </span>
                ),
              },
              {
                key: 'lastActivity',
                header: 'B4B last activity',
                cell: (row) => (
                  <span style={{ fontSize: '0.85rem' }}>{fmtDateTime(row.lastActivityTime)}</span>
                ),
              },
            ]}
          />
        )}
      </section>

      {/* Section 6 — out-of-catalog xAPI activity (7d). */}
      <section className="content-card" style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>xAPI events on out-of-catalog courses (last 7 days)</h2>
        <p style={{ ...cardSecondaryStyle, marginBottom: '0.6rem' }}>
          xAPI events arriving for a <code>course_slug</code> that isn&apos;t in any
          B4B program (per <code>loadB4BPrograms()</code>). Means the learner is on a
          course that&apos;s not in the org&apos;s curriculum — curriculum changed,
          course was added on Coursera without WAP knowing, or the canonical mapping
          is wrong.
        </p>
        {outOfCatalogRows.length === 0 ? (
          <span style={cardSecondaryStyle}>
            All recent xAPI traffic is on courses that exist in B4B programs.
          </span>
        ) : (
          <DataTable
            density="compact"
            rows={outOfCatalogRows}
            rowKey={(row) => row.courseSlug}
            columns={[
              {
                key: 'slug',
                header: 'course_slug',
                cell: (row) => <code style={{ fontSize: '0.85rem' }}>{row.courseSlug}</code>,
              },
              {
                key: 'events',
                header: 'Events',
                align: 'right',
                cell: (row) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {row.eventCount.toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'learners',
                header: 'Distinct learners',
                align: 'right',
                cell: (row) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {row.distinctLearners.toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'lastSeen',
                header: 'Last seen',
                cell: (row) => (
                  <span style={{ fontSize: '0.85rem' }}>
                    {fmtDateTime(row.lastSeen)}{' '}
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>
                      ({relativeAge(row.lastSeen, now)})
                    </span>
                  </span>
                ),
              },
            ]}
          />
        )}
      </section>

      {/* Section 7 — sync drift (lastActivity > 24h apart). */}
      <section className="content-card" style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>B4B/xAPI sync drift (lastActivity &gt; 24h apart)</h2>
        <p style={{ ...cardSecondaryStyle, marginBottom: '0.6rem' }}>
          Pairs where B4B&apos;s <code>last_activity_time</code> and our{' '}
          <code>course_progress.last_updated_at</code> disagree by more than 24 hours
          for the same (userId, courseraCourseId). Big gap = sync staleness signal —
          one feed is ahead of the other.
        </p>
        {syncDriftRows.length === 0 ? (
          <span style={cardSecondaryStyle}>
            B4B and our internal lastActivity are within 24h on every matched pair.
          </span>
        ) : (
          <DataTable
            density="compact"
            rows={syncDriftRows}
            rowKey={(row) => row.key}
            columns={[
              {
                key: 'email',
                header: 'Member',
                cell: (row) => <code style={{ fontSize: '0.85rem' }}>{row.email}</code>,
              },
              {
                key: 'course',
                header: 'Course',
                cell: (row) => <span style={{ fontSize: '0.85rem' }}>{row.courseName}</span>,
              },
              {
                key: 'b4bAt',
                header: 'B4B last activity',
                cell: (row) => (
                  <span style={{ fontSize: '0.85rem' }}>{fmtDateTime(row.b4bLastActivity)}</span>
                ),
              },
              {
                key: 'ourAt',
                header: 'Our last updated',
                cell: (row) => (
                  <span style={{ fontSize: '0.85rem' }}>{fmtDateTime(row.ourLastUpdated)}</span>
                ),
              },
              {
                key: 'deltaHours',
                header: 'Δ hours',
                align: 'right',
                cell: (row) => (
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      color: 'rgb(146, 90, 0)',
                    }}
                  >
                    {row.deltaHours.toLocaleString()}
                  </span>
                ),
              },
            ]}
          />
        )}
      </section>

      {/* Section 8 — wrong-program studying (7d). */}
      <section className="content-card" style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>
          Members studying outside their primary program (last 7 days)
        </h2>
        <p style={{ ...cardSecondaryStyle, marginBottom: '0.6rem' }}>
          Members whose primary <code>CourseEnrollment.programSlug</code> is one
          program but whose recent xAPI activity is on courses scoped to a different
          B4B program. Counselor signal (member needs realignment) and billing
          signal (we may be paying for a program they aren&apos;t actually using).
        </p>
        {wrongProgramRows.length === 0 ? (
          <span style={cardSecondaryStyle}>
            No members studying outside their primary program in the last 7 days.
          </span>
        ) : (
          <DataTable
            density="compact"
            rows={wrongProgramRows}
            rowKey={(row) => row.key}
            columns={[
              {
                key: 'email',
                header: 'Member',
                cell: (row) => <code style={{ fontSize: '0.85rem' }}>{row.email}</code>,
              },
              {
                key: 'primary',
                header: 'Primary program',
                cell: (row) => (
                  <span style={{ fontSize: '0.85rem' }}>{row.primaryProgramSlug ?? '—'}</span>
                ),
              },
              {
                key: 'studied',
                header: 'Course studied',
                cell: (row) => (
                  <code style={{ fontSize: '0.85rem' }}>{row.courseStudied}</code>
                ),
              },
              {
                key: 'studiedProgram',
                header: 'Course belongs to',
                cell: (row) => (
                  <span style={{ fontSize: '0.85rem' }}>{row.courseStudiedProgram}</span>
                ),
              },
              {
                key: 'count',
                header: 'Events',
                align: 'right',
                cell: (row) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {row.eventCount.toLocaleString()}
                  </span>
                ),
              },
            ]}
          />
        )}
      </section>
    </PortalPageFrame>
  );
}
