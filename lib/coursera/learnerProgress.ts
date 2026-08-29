/**
 * Coursera-authoritative learner progress (B4B enrollmentReports).
 *
 * Member-facing UI treats `GET …/enrollmentReports` as the primary source for
 * completion % (`overallProgress`, `isCompleted`). Local `CourseProgress`
 * rows remain populated from xAPI (and sync jobs) for audit, diagnostics,
 * grades, and fallback when B4B is unreachable — see `loadMemberProgramTrainingView`.
 *
 * Design constraints (per #1077):
 *   - Don't import 'server-only': makes the module unit-testable under
 *     `node --test` / `tsx`, matching the b4bClient.ts pattern.
 *   - Cache per-(email, programId) results in Redis for 30 minutes so a single
 *     page render — and any nearby admin pulls — don't fan out into a swarm
 *     of B4B requests against the shared OAuth quota.
 *   - Fail soft: if B4B is unreachable, return an empty map so the
 *     caller falls back to local rows (the historic behavior).
 *   - Never write to the DB from a render path. Background sync (#1076)
 *     is the only writer.
 */

import {
  getEnrollmentReports,
  listPrograms,
  type B4BEnrollmentReport,
  type B4BProgram,
} from './b4bClient';
import { getCacheOrFetch, invalidateCache } from '@/lib/cache';

const PROGRAM_LIST_TTL_SECONDS = 60 * 60; // 1 hour
const LEARNER_PROGRESS_TTL_SECONDS = 30 * 60; // 30 minutes

export type LearnerProgressEntry = {
  contentId: string;
  contentType: 'Course' | 'Specialization' | 'Video';
  programId: string;
  isCompleted: boolean;
  /** 0-100, authoritative from Coursera. */
  overallProgress: number;
  lastActivityAt: Date | null;
};

export type LearnerProgressByContent = Map<string, LearnerProgressEntry>;

/** Serialize a LearnerProgressByContent Map for Redis JSON storage. */
function serializeProgress(map: LearnerProgressByContent): Array<[string, LearnerProgressEntry]> {
  return Array.from(map.entries());
}

/** Deserialize Redis JSON back to a LearnerProgressByContent Map. */
function deserializeProgress(data: unknown): LearnerProgressByContent {
  if (!Array.isArray(data)) return new Map();
  const map = new Map<string, LearnerProgressEntry>();
  for (const item of data) {
    if (Array.isArray(item) && item.length === 2) {
      const [key, entry] = item as [string, LearnerProgressEntry];
      if (entry.lastActivityAt && typeof entry.lastActivityAt === 'string') {
        entry.lastActivityAt = new Date(entry.lastActivityAt);
      }
      map.set(key, entry);
    }
  }
  return map;
}

/** Stable cache key: lowercase email + programId scope tag. */
function learnerCacheKey(email: string, programId: string | undefined): string {
  return `${email.trim().toLowerCase()}::${programId ?? '*'}`;
}

/* ------------------------------------------------------------------ */
/*  Test helpers                                                       */
/* ------------------------------------------------------------------ */

/** Wipe both caches. Test-only. */
export function _resetLearnerProgressCachesForTesting() {
  // No-op: Redis cache is external and tests mock the client.
}

/** Inspect the per-learner cache. Test-only. */
export function _getLearnerCacheEntryForTesting(
  _email: string,
  _programId: string | undefined,
): undefined {
  // Redis cache is external; tests verify behavior via mock call counts.
  return undefined;
}

/**
 * Drop cached B4B progress for one learner (all program scopes).
 * Call after `syncUserFromB4B` / cron writes so the member dashboard and any
 * server-render path using `fetchLearnerProgressFromB4B` sees fresh Coursera
 * numbers on the next fetch instead of waiting out the 30-minute TTL.
 */
export async function invalidateLearnerProgressCacheForEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  await invalidateCache(`coursera:learner:${normalized}::*`);
}

/* ------------------------------------------------------------------ */
/*  Internals                                                          */
/* ------------------------------------------------------------------ */

function normalizeContentType(raw: string | undefined): LearnerProgressEntry['contentType'] {
  if (raw === 'Specialization' || raw === 'Video') return raw;
  return 'Course';
}

function clampPercent(n: number | undefined): number {
  if (n == null || !Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function reportToEntry(report: B4BEnrollmentReport): LearnerProgressEntry {
  return {
    contentId: report.contentId,
    contentType: normalizeContentType(report.contentType),
    programId: report.programId,
    isCompleted: report.isCompleted === true,
    overallProgress: clampPercent(report.overallProgress),
    lastActivityAt:
      typeof report.lastActivity === 'number' && Number.isFinite(report.lastActivity)
        ? new Date(report.lastActivity)
        : null,
  };
}

/**
 * Resolve the set of B4B program IDs to query. We deliberately scope by
 * program rather than calling the unfiltered enrollmentReports endpoint
 * because the unfiltered call returns the entire org's roster — wasteful
 * and a quota risk for what is effectively a per-learner lookup.
 */
async function resolveProgramIds(opts: { programId?: string }): Promise<string[]> {
  if (opts.programId) return [opts.programId];

  return getCacheOrFetch(
    'coursera:program-ids',
    async () => {
      const page = await listPrograms({ limit: 100, excludeContent: true });
      return page.elements
        .map((p: B4BProgram) => p.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
    },
    PROGRAM_LIST_TTL_SECONDS,
  );
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Fetch learner progress from Coursera For Business.
 *
 * Returns a map keyed by `contentId` (Coursera course/specialization id).
 * Empty map = either the learner has no enrollments OR the API was
 * unreachable — callers fall back to local `CourseProgress` / rollup for display.
 *
 * @param email     The learner's externalId in Coursera (their email).
 * @param opts.programId  Scope the lookup to a single program. Strongly
 *                        recommended on the dashboard render path: avoids
 *                        a `listPrograms` round-trip.
 * @param opts.skipCache  When true, bypass the Redis cache and refetch.
 *                        Used by the manual "Refresh from Coursera" button.
 * @param opts.readOnlyAudit  Return the local-fallback signal without OAuth,
 *                            Coursera, or Redis side effects during release QA.
 */
export async function fetchLearnerProgressFromB4B(
  email: string,
  opts: { programId?: string; skipCache?: boolean; readOnlyAudit?: boolean } = {},
): Promise<LearnerProgressByContent> {
  if (!email || typeof email !== 'string' || opts.readOnlyAudit) return new Map();

  const cacheKey = `coursera:learner:${learnerCacheKey(email, opts.programId)}`;

  if (opts.skipCache) {
    return _fetchLearnerProgressFromB4BUncached(email, opts);
  }

  const cached = await getCacheOrFetch(
    cacheKey,
    async () => {
      const result = await _fetchLearnerProgressFromB4BUncached(email, opts);
      return serializeProgress(result);
    },
    LEARNER_PROGRESS_TTL_SECONDS,
  );

  return deserializeProgress(cached);
}

async function _fetchLearnerProgressFromB4BUncached(
  email: string,
  opts: { programId?: string } = {},
): Promise<LearnerProgressByContent> {
  const result: LearnerProgressByContent = new Map();

  try {
    const programIds = await resolveProgramIds({ programId: opts.programId });
    if (programIds.length === 0) {
      return result;
    }

    // Query each program in parallel — typical org has 1-3 programs.
    const pages = await Promise.all(
      programIds.map((programId) =>
        getEnrollmentReports({
          byUserProgramId: true,
          programId,
          externalId: email,
          limit: 200,
        }).catch((err: unknown) => {
          // Per-program failure shouldn't poison the whole result; log and
          // continue. The caller still gets the rows from any program that
          // did succeed.
          console.warn(
            `[learnerProgress] enrollmentReports failed for program=${programId} email=${email}:`,
            err instanceof Error ? err.message : err,
          );
          return null;
        }),
      ),
    );

    for (const page of pages) {
      if (!page) continue;
      for (const report of page.elements) {
        if (!report?.contentId) continue;
        // If a learner appears in multiple programs with the same contentId
        // (rare), prefer the row with the higher progress. Coursera sometimes
        // emits a stale row when a course has been re-platformed.
        const incoming = reportToEntry(report);
        const existing = result.get(incoming.contentId);
        if (!existing || incoming.overallProgress > existing.overallProgress) {
          result.set(incoming.contentId, incoming);
        }
      }
    }
  } catch (err) {
    console.warn(
      `[learnerProgress] B4B unavailable for email=${email}:`,
      err instanceof Error ? err.message : err,
    );
    // Fall through and return the empty map so the caller falls back to
    // local rows. Redis caching is handled by the caller.
  }

  return result;
}

/**
 * Latest activity timestamp across a learner progress map. Used by the
 * dashboard to render "Updated from Coursera <relative time> ago".
 */
export function getLearnerProgressLastActivity(
  progress: LearnerProgressByContent,
): Date | null {
  let latest: Date | null = null;
  for (const entry of progress.values()) {
    if (entry.lastActivityAt && (!latest || entry.lastActivityAt > latest)) {
      latest = entry.lastActivityAt;
    }
  }
  return latest;
}

/**
 * Filter a list of catalog `courseId`s down to the ones we expect B4B to
 * recognize: non-empty and not the `TODO_courseId_*` placeholders that
 * exist in `courseraDiscoveredCatalog.ts` for programs whose IDs haven't
 * been reverse-engineered yet.
 */
export function filterRecognizedCourseraCourseIds(ids: Array<string | undefined | null>): string[] {
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0 && !id.startsWith('TODO_'));
}

/**
 * Average `overallProgress` across the program's courses *if every course
 * is represented in the B4B response*. Returns null when the data is
 * incomplete — the caller should fall back to the local rollup in that
 * case rather than display a blended-but-misleading number.
 *
 * Why "all-or-nothing"? Mixing B4B values for some courses with zeros
 * for others would understate progress whenever a course wasn't
 * surfaced by enrollmentReports yet (e.g. a brand-new enrollment that
 * Coursera hasn't materialized). The local-DB rollup is designed for
 * partial data; the B4B average should only override when authoritative.
 */
export function averageProgramProgressFromB4B(args: {
  progress: LearnerProgressByContent;
  courseraCourseIds: string[];
}): number | null {
  const ids = filterRecognizedCourseraCourseIds(args.courseraCourseIds);
  if (ids.length === 0) return null;

  let sum = 0;
  for (const id of ids) {
    const entry = args.progress.get(id);
    if (!entry) return null;
    sum += entry.overallProgress;
  }
  return Math.round(sum / ids.length);
}
