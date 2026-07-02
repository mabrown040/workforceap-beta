/**
 * Coursera For Business (B4B) → CourseProgress sync.
 *
 * Intentionally does NOT `import 'server-only'`: this lets the pure
 * `computeCourseProgressUpdate` helper run under `node --test` (matches
 * the b4bClient.ts / testAccountHeuristic.ts pattern). The actual sync
 * function (`syncCourseraB4BEnrollmentReports`) reaches process.env and
 * the Prisma client, so it would never execute in the browser anyway.
 */

import { CourseProgressStatus } from '@prisma/client';

import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { prisma } from '@/lib/db/prisma';
import {
  loadCanonicalMappingsForCourseraIds,
  type CanonicalMappingIndex,
} from '@/lib/coursera/canonicalMapping';
import { captureApiError } from '@/lib/observability/captureApiError';
import { invalidateLearnerProgressCacheForEmail } from '@/lib/coursera/learnerProgress';
import { fetchCourseraWithTransientRetry } from '@/lib/coursera/b4bClient';

const B4B_OAUTH_URL = 'https://api.coursera.com/oauth2/client_credentials/token';
const B4B_API_BASE = 'https://api.coursera.com/ent';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type B4BEnrollmentReport = {
  id: string;
  programId: string;
  externalId: string; // email
  contentId: string;
  contentType: string;
  isCompleted: boolean;
  lastActivityAt: number; // epoch ms
  enrolledAt: number; // epoch ms
  overallProgress: number; // 0–100
  membershipState: string;
  updatedAt: number; // epoch ms
  contentName: string;
  contentSlug: string;
  fullName: string;
  email: string;
  programName: string;
  programSlug: string;
  collectionId?: string | null;
  collectionName?: string | null;
};

export type B4BSyncResult = {
  scanned: number;
  upserted: number;
  upsertedKnown: number;
  upsertedUnknown: number;
  skippedNoUser: number;
  errors: number;
  byUser: Record<string, { courses: number; unknownCourses: number; error?: string }>;
};

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

async function getB4BToken(): Promise<string> {
  const clientId = process.env.COURSERA_B4B_CLIENT_ID?.trim();
  const clientSecret = process.env.COURSERA_B4B_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Missing COURSERA_B4B_CLIENT_ID or COURSERA_B4B_CLIENT_SECRET');
  }

  const resp = await fetchCourseraWithTransientRetry(B4B_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`B4B OAuth ${resp.status}: ${text}`);
  }

  const json = (await resp.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('B4B OAuth response missing access_token');
  return json.access_token;
}

/* ------------------------------------------------------------------ */
/*  Enrollment report fetch (paginated)                                */
/* ------------------------------------------------------------------ */

/**
 * Next `start` offset for the enrollmentReports pager, or `null` when done.
 * Pure + exported for unit tests because both failure modes were silent:
 *   - Coursera doesn't always send `paging.total`; treating missing total as
 *     0 ended the loop after ONE page (org-wide progress truncation);
 *   - advancing by `limit` instead of by what actually arrived skipped
 *     records whenever a page came back short but more remained.
 * Full page + no total ⇒ assume more; short page ⇒ done.
 */
export function nextEnrollmentReportStart(args: {
  start: number;
  batchLength: number;
  limit: number;
  total: number | undefined;
}): number | null {
  const { start, batchLength, limit, total } = args;
  if (batchLength === 0) return null;
  if (typeof total === 'number' && start + batchLength >= total) return null;
  if (typeof total !== 'number' && batchLength < limit) return null;
  return start + batchLength;
}

async function fetchEnrollmentReports(token: string, orgId: string): Promise<B4BEnrollmentReport[]> {
  const results: B4BEnrollmentReport[] = [];
  let start = 0;
  const limit = 1000;

  while (true) {
    const url = `${B4B_API_BASE}/api/businesses.v1/${orgId}/enrollmentReports?start=${start}&limit=${limit}`;
    const resp = await fetchCourseraWithTransientRetry(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Enrollment reports ${resp.status}: ${text}`);
    }

    const json = (await resp.json()) as {
      elements?: B4BEnrollmentReport[];
      paging?: { next?: number; total?: number };
    };

    const batch = json.elements ?? [];
    results.push(...batch);

    const next = nextEnrollmentReportStart({
      start,
      batchLength: batch.length,
      limit,
      total: json.paging?.total,
    });
    if (next === null) break;
    start = next;
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Catalog mapping helpers                                            */
/* ------------------------------------------------------------------ */

/** Reverse map: coursera programId → list of WAP program slugs */
function buildProgramIdToSlugsMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const [slug, data] of Object.entries(DISCOVERED_COURSERA_PROGRAMS)) {
    const cid = data.courseraProgramId;
    if (!cid) continue;
    if (!map[cid]) map[cid] = [];
    map[cid].push(slug);
  }
  return map;
}

/** Reverse map: coursera courseId → { programSlug, courseSlug, name } */
function buildCourseIdToMetaMap(): Record<
  string,
  { programSlug: string; courseSlug: string; name: string }[]
> {
  const map: Record<string, { programSlug: string; courseSlug: string; name: string }[]> = {};
  for (const [programSlug, data] of Object.entries(DISCOVERED_COURSERA_PROGRAMS)) {
    for (const course of data.courses) {
      if (!map[course.courseId]) map[course.courseId] = [];
      map[course.courseId].push({
        programSlug,
        courseSlug: course.slug,
        name: course.name,
      });
    }
  }
  return map;
}

/** Slugify any string into a valid course slug */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

/* ------------------------------------------------------------------ */
/*  CourseProgress merge logic (pure, unit-tested)                      */
/* ------------------------------------------------------------------ */

/**
 * Subset of `B4BEnrollmentReport` fields the merge helper actually needs.
 * Kept intentionally narrow so tests can construct fixtures without
 * fabricating unrelated Coursera fields.
 */
export type B4BProgressInput = {
  /** Coursera says the course is fully done. */
  isCompleted: boolean;
  /** 0–100, course-level. May round to 0 when only a single quiz is done. */
  overallProgress: number | null | undefined;
  /** Epoch milliseconds. May be 0 / null when the learner has never engaged. */
  lastActivityAt: number | null | undefined;
};

/**
 * Inputs to `mergeB4BProgressSignals`: the per-course rows from each B4B
 * data source. Either side may be undefined (course missing from gradebook,
 * or enrollment-reports fetch failed), but at least one must be supplied.
 */
export type B4BSignalSources = {
  enrollment: {
    isCompleted?: boolean;
    overallProgress?: number | null;
    lastActivityAt?: number | null;
  } | null;
  gradebook: {
    overallProgress?: number | null;
    lastActivityAt?: number | null;
  } | null;
};

/**
 * Combine the two B4B progress signals into the single `B4BProgressInput`
 * shape the existing `computeCourseProgressUpdate` ladder accepts.
 *
 * Why both sources matter:
 *
 *   - `enrollmentReports.overallProgress` is COURSE-LEVEL and aggressively
 *     rounded — a learner who has finished one quiz of a multi-week course
 *     shows up as 0% there. That stuck the dashboard ring on 0% even when
 *     the learner had genuine engagement.
 *
 *   - `courseGradebookReports.overallProgress` is item-level and surfaces
 *     single-digit percentages for early progress (e.g. one quiz → 9%). It
 *     also tracks `lastActivityAt` more reliably (the gradebook updates
 *     immediately on item completion; the enrollment rollup lags).
 *
 * We pick the MAX of the two `overallProgress` values (gradebook is more
 * granular but occasionally lags after re-aggregation), and the most recent
 * `lastActivityAt`. `isCompleted` only comes from enrollmentReports —
 * gradebook doesn't carry a course-level done flag.
 *
 * Pure: takes plain values, no I/O, no Date juggling. Safe to unit test
 * without spinning up Prisma.
 */
export function mergeB4BProgressSignals(sources: B4BSignalSources): B4BProgressInput {
  const enr = sources.enrollment;
  const gb = sources.gradebook;

  const isCompleted = enr?.isCompleted === true;

  const enrPct = typeof enr?.overallProgress === 'number' ? enr.overallProgress : 0;
  const gbPct = typeof gb?.overallProgress === 'number' ? gb.overallProgress : 0;
  // Prefer the larger of the two — gradebook is more granular when present,
  // but if enrollmentReports happens to be ahead (rare, during gradebook
  // re-aggregation) we don't want to regress.
  const overallProgress = Math.max(enrPct, gbPct);

  const enrAct =
    typeof enr?.lastActivityAt === 'number' && enr.lastActivityAt > 0
      ? enr.lastActivityAt
      : 0;
  const gbAct =
    typeof gb?.lastActivityAt === 'number' && gb.lastActivityAt > 0
      ? gb.lastActivityAt
      : 0;
  const lastActivityMax = Math.max(enrAct, gbAct);
  const lastActivityAt = lastActivityMax > 0 ? lastActivityMax : null;

  return {
    isCompleted,
    overallProgress,
    lastActivityAt,
  };
}

/** Subset of the existing `CourseProgress` row needed for the merge. */
export type ExistingCourseProgress = {
  status: CourseProgressStatus;
  percentComplete: number;
  lastActivityAt: Date | null;
} | null;

export type MergedCourseProgress = {
  status: CourseProgressStatus;
  percentComplete: number;
  lastActivityAt: Date | null;
};

/**
 * Read-before-write merge for B4B enrollment data → CourseProgress row.
 *
 * Why this exists (and why future devs MUST NOT "simplify" it):
 *
 *   1. Coursera B4B `enrollmentReports.overallProgress` is COURSE-LEVEL and
 *      rounds to 0 when only a single quiz (typically <5% of the course)
 *      is complete. Naive sync would write `NOT_STARTED` for a learner who
 *      genuinely just started — visible idle on the dashboard hero ring.
 *      The `lastActivityAt > 0` check upgrades these to `IN_PROGRESS`.
 *
 *   2. xAPI statements credit COMPLETED *before* B4B's enrollmentReports
 *      reflect it (Coursera's internal aggregation lags by hours). Without
 *      a downgrade guard, the next B4B sync would overwrite an xAPI-credited
 *      COMPLETED back to IN_PROGRESS or NOT_STARTED, and the learner sees
 *      their certificate disappear. The ladder below ensures status only
 *      ever moves forward (NOT_STARTED → IN_PROGRESS → COMPLETED).
 *
 *   3. `percentComplete` similarly never goes down. xAPI may have credited a
 *      learner with 80% based on per-item events while B4B's coarse rollup
 *      still says 30%. We pick the max.
 *
 *   4. `lastActivityAt` is the more recent of (existing, B4B) — neither
 *      side is authoritative, but we always want the latest signal.
 */
export function computeCourseProgressUpdate(
  existing: ExistingCourseProgress,
  report: B4BProgressInput,
): MergedCourseProgress {
  const reportPct = typeof report.overallProgress === 'number' ? report.overallProgress : 0;
  const reportActivityMs =
    typeof report.lastActivityAt === 'number' && report.lastActivityAt > 0
      ? report.lastActivityAt
      : null;

  // ── Status from B4B alone ──────────────────────────────────────────────
  // Promote to IN_PROGRESS even when overallProgress rounds to 0, as long
  // as we have a `lastActivityAt` signal. This is the "started a quiz, hasn't
  // yet finished anything visible" case that previously stuck on NOT_STARTED.
  let newStatus: CourseProgressStatus;
  if (report.isCompleted) {
    newStatus = CourseProgressStatus.COMPLETED;
  } else if (reportPct > 0 || reportActivityMs != null) {
    newStatus = CourseProgressStatus.IN_PROGRESS;
  } else {
    newStatus = CourseProgressStatus.NOT_STARTED;
  }

  // ── Final status ladder (never downgrade) ──────────────────────────────
  // Once a learner is COMPLETED we never demote them. If existing is
  // IN_PROGRESS and B4B would say NOT_STARTED, we keep IN_PROGRESS — B4B
  // sometimes briefly returns missing/zero rows during its own re-aggregation.
  let finalStatus: CourseProgressStatus;
  if (existing?.status === CourseProgressStatus.COMPLETED) {
    finalStatus = CourseProgressStatus.COMPLETED;
  } else if (newStatus === CourseProgressStatus.COMPLETED) {
    finalStatus = CourseProgressStatus.COMPLETED;
  } else if (
    existing?.status === CourseProgressStatus.IN_PROGRESS &&
    newStatus === CourseProgressStatus.NOT_STARTED
  ) {
    finalStatus = CourseProgressStatus.IN_PROGRESS;
  } else {
    finalStatus = newStatus;
  }

  // ── percentComplete: prefer the larger of (existing, new). ─────────────
  // 100 when COMPLETED so the dashboard ring matches the status pill even
  // if B4B is still catching up (e.g. xAPI-credited completion not yet in
  // the enrollmentReport overallProgress field).
  const newPct = report.isCompleted ? 100 : reportPct;
  const existingPct = existing?.percentComplete ?? 0;
  let finalPct = Math.max(existingPct, newPct);
  if (finalStatus === CourseProgressStatus.COMPLETED) finalPct = 100;

  // ── lastActivityAt: pick whichever is more recent. ─────────────────────
  const existingActivityMs = existing?.lastActivityAt
    ? existing.lastActivityAt.getTime()
    : 0;
  const candidateMs = reportActivityMs ?? 0;
  const finalActivityMs = Math.max(existingActivityMs, candidateMs);
  const finalActivity =
    finalActivityMs > 0
      ? new Date(finalActivityMs)
      : (existing?.lastActivityAt ?? null);

  return {
    status: finalStatus,
    percentComplete: finalPct,
    lastActivityAt: finalActivity,
  };
}

/* ------------------------------------------------------------------ */
/*  Main sync                                                          */
/* ------------------------------------------------------------------ */

export async function syncCourseraB4BEnrollmentReports(): Promise<B4BSyncResult> {
  const orgId = process.env.COURSERA_ORG_ID?.trim();
  if (!orgId) throw new Error('Missing COURSERA_ORG_ID');

  const token = await getB4BToken();
  const reports = await fetchEnrollmentReports(token, orgId);

  const programIdToSlugs = buildProgramIdToSlugsMap();
  const courseIdToMeta = buildCourseIdToMetaMap();

  // Pre-load all active users by normalized email
  const users = await prisma.$transaction((tx) =>
    tx.user.findMany({
      take: 5000,
      where: { deletedAt: null, email: { not: '' } },
      select: { id: true, email: true },
    }),
  );
  const userByEmail = new Map<string, string>();
  for (const u of users) {
    userByEmail.set(u.email.trim().toLowerCase(), u.id);
  }

  const result: B4BSyncResult = {
    scanned: reports.length,
    upserted: 0,
    upsertedKnown: 0,
    upsertedUnknown: 0,
    skippedNoUser: 0,
    errors: 0,
    byUser: {},
  };

  // Deduplicate by (email, contentId) — keep most recent updatedAt
  const deduped = new Map<string, B4BEnrollmentReport>();
  for (const r of reports) {
    // email is optional on B4B report rows; one malformed row must not
    // TypeError the whole sync run before the per-row error handling below.
    if (!r.email) {
      result.skippedNoUser += 1;
      continue;
    }
    const key = `${r.email.toLowerCase()}|${r.contentId}`;
    const existing = deduped.get(key);
    if (!existing || (r.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
      deduped.set(key, r);
    }
  }

  // Pre-load all admin-curated mappings from `coursera_canonical_course_mappings`
  // for the contentIds we're about to write. This is the same source of truth
  // the CSV promote path JOINs against — without it an admin who maps a course
  // via /admin/training-progress will see CSV imports updated immediately, but
  // this cron-style B4B sync would still bypass the override and stamp the
  // wrong (programSlug, courseSlug). One IN-list query keeps the loop O(N+M)
  // instead of O(N) round-trips.
  const canonicalMappings: CanonicalMappingIndex =
    await loadCanonicalMappingsForCourseraIds(
      Array.from(deduped.values()).map((r) => r.contentId),
    );

  // NOTE: gradebook merging now lives in `syncUserFromB4B` (the single-user
  // path used by dashboard auto-sync + admin "Sync from Coursera"). That path
  // already fetches one learner at a time, so the N gradebook calls collapse
  // to one per sync — no rate-limit concern. THIS cron-style cross-tenant
  // sync still uses enrollmentReports only because adding gradebook here
  // would mean one extra API call per learner per cron run (Coursera B4B
  // rate-limits aggressively), and the per-user path already covers the
  // dashboard ring case the gradebook signal was added for. See
  // `mergeB4BProgressSignals` for the merge logic.
  for (const report of deduped.values()) {
    const email = report.email.trim().toLowerCase();
    const userId = userByEmail.get(email);

    if (!userId) {
      result.skippedNoUser += 1;
      continue;
    }

    // Resolution order for (programSlug, courseSlug):
    //   1. Admin-curated row in `coursera_canonical_course_mappings` keyed by
    //      contentId — overrides everything (lets admins fix unmapped courses
    //      without a redeploy; same source-of-truth as the JOIN in
    //      `csvImport.server.ts:promoteCsvProgressToCanonical`).
    //   2. Static DISCOVERED_COURSERA_PROGRAMS catalog.
    //   3. Coursera programId → WAP program reverse map.
    //   4. Slugify the raw Coursera fields (generic fallback).
    let programSlug: string;
    let courseSlug: string;
    let isKnown = false;

    const dbMapping = canonicalMappings.byCourseraCourseId.get(report.contentId) ?? null;
    const knownMetas = courseIdToMeta[report.contentId];
    const programSlugsFromId = programIdToSlugs[report.programId];

    if (dbMapping) {
      programSlug = dbMapping.programSlug;
      courseSlug = dbMapping.courseSlug;
      isKnown = true;
    } else if (knownMetas && knownMetas.length > 0) {
      programSlug = knownMetas[0].programSlug;
      courseSlug = knownMetas[0].courseSlug;
      isKnown = true;
    } else {
      if (programSlugsFromId && programSlugsFromId.length > 0) {
        programSlug = programSlugsFromId[0];
      } else {
        // Fallback: use Coursera's programSlug or a generic bucket
        programSlug = slugify(report.programSlug || report.programName || 'coursera-unknown');
      }
      courseSlug = slugify(report.contentName || report.contentSlug || report.contentId);
    }

    try {
      // Read-before-write so we never downgrade an xAPI-credited COMPLETED
      // back to IN_PROGRESS, and never lower percentComplete when B4B's
      // coarse course-level rollup briefly trails the per-item xAPI signal.
      // See `computeCourseProgressUpdate` doc-comment for the full
      // rationale — this is exactly the kind of code that gets
      // "simplified" wrong. The find + upsert run in one transaction so
      // the read the merge decision is based on stays consistent with the
      // write, and both carry the transaction-local GUC context.
      await prisma.$transaction(async (tx) => {
        const existing = await tx.courseProgress.findUnique({
          where: {
            userId_programSlug_courseSlug: {
              userId,
              programSlug,
              courseSlug,
            },
          },
          select: {
            status: true,
            percentComplete: true,
            lastActivityAt: true,
          },
        });

        const merged = computeCourseProgressUpdate(existing, {
          isCompleted: report.isCompleted,
          overallProgress: report.overallProgress,
          lastActivityAt: report.lastActivityAt,
        });

        // `completedAt` is set the first time we see COMPLETED. If we've
        // already recorded one we keep it — re-syncs shouldn't re-stamp the
        // timestamp. Use Coursera's `updatedAt` if available, otherwise now.
        const completedAt =
          merged.status === CourseProgressStatus.COMPLETED
            ? new Date(report.updatedAt || Date.now())
            : null;

        await tx.courseProgress.upsert({
          where: {
            userId_programSlug_courseSlug: {
              userId,
              programSlug,
              courseSlug,
            },
          },
          create: {
            userId,
            programSlug,
            courseSlug,
            courseId: report.contentId,
            status: merged.status,
            percentComplete: merged.percentComplete,
            startedAt: report.enrolledAt ? new Date(report.enrolledAt) : null,
            completedAt,
            lastActivityAt: merged.lastActivityAt,
          },
          update: {
            courseId: report.contentId,
            status: merged.status,
            percentComplete: merged.percentComplete,
            // Don't overwrite an existing startedAt with null on later syncs;
            // only stamp it the first time we see an enrolledAt.
            ...(report.enrolledAt ? { startedAt: new Date(report.enrolledAt) } : {}),
            // Set completedAt on the transition into COMPLETED; never clear it.
            ...(merged.status === CourseProgressStatus.COMPLETED &&
            existing?.status !== CourseProgressStatus.COMPLETED
              ? { completedAt }
              : {}),
            lastActivityAt: merged.lastActivityAt,
          },
        });
      });

      result.upserted += 1;
      if (isKnown) {
        result.upsertedKnown += 1;
      } else {
        result.upsertedUnknown += 1;
      }

      const userEntry = result.byUser[email] ?? { courses: 0, unknownCourses: 0 };
      userEntry.courses += 1;
      if (!isKnown) userEntry.unknownCourses += 1;
      result.byUser[email] = userEntry;
    } catch (err) {
      result.errors += 1;
      const userEntry = result.byUser[email] ?? { courses: 0, unknownCourses: 0 };
      userEntry.error = err instanceof Error ? err.message : 'unknown';
      result.byUser[email] = userEntry;
      captureApiError(err, {
        route: 'coursera/b4b-sync',
        extra: { email, contentId: report.contentId },
      });
    }
  }

  // Update MemberProgramProgress rollups for affected users
  await updateRollups(Object.keys(result.byUser));

  for (const emailKey of Object.keys(result.byUser)) {
    invalidateLearnerProgressCacheForEmail(emailKey);
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Rollup rebuild                                                     */
/* ------------------------------------------------------------------ */

async function updateRollups(emails: string[]) {
  const { affectedUsers, allRows } = await prisma.$transaction(async (tx) => {
    const affectedUsers = await tx.user.findMany({
      take: 5000,
      where: { email: { in: emails, mode: 'insensitive' }, deletedAt: null },
      select: { id: true, email: true },
    });

    const allUserIds = affectedUsers.map((u) => u.id);
    const allRows = allUserIds.length
      ? await tx.courseProgress.findMany({
          take: 5000,
          where: { userId: { in: allUserIds } },
          select: { userId: true, programSlug: true, status: true, percentComplete: true },
        })
      : [];

    return { affectedUsers, allRows };
  });

  const rowsByUser = new Map<string, typeof allRows>();
  for (const row of allRows) {
    const list = rowsByUser.get(row.userId) ?? [];
    list.push(row);
    rowsByUser.set(row.userId, list);
  }

  for (const user of affectedUsers) {
    try {
      const rows = rowsByUser.get(user.id) ?? [];

      const byProgram = new Map<string, { total: number; completed: number; sumPct: number }>();
      for (const r of rows) {
        const p = byProgram.get(r.programSlug) ?? { total: 0, completed: 0, sumPct: 0 };
        p.total += 1;
        if (r.status === CourseProgressStatus.COMPLETED) p.completed += 1;
        p.sumPct += r.percentComplete;
        byProgram.set(r.programSlug, p);
      }

      for (const [programSlug, stats] of byProgram) {
        const avg = stats.total > 0 ? Math.round(stats.sumPct / stats.total) : 0;
        await prisma.$transaction((tx) =>
          tx.memberProgramProgress.upsert({
            where: { userId_programSlug: { userId: user.id, programSlug } },
            create: {
              userId: user.id,
              programSlug,
              coursesCompleted: stats.completed,
              averagePercent: avg,
            },
            update: {
              coursesCompleted: stats.completed,
              averagePercent: avg,
            },
          }),
        );
      }
    } catch (err) {
      captureApiError(err, {
        route: 'coursera/b4b-sync',
        extra: { step: 'member-program-rollup', userId: user.id },
      });
    }
  }
}
