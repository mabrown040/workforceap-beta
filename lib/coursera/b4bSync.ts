import 'server-only';

import { CourseProgressStatus } from '@prisma/client';

import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';

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

  const resp = await fetch(B4B_OAUTH_URL, {
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

async function fetchEnrollmentReports(token: string, orgId: string): Promise<B4BEnrollmentReport[]> {
  const results: B4BEnrollmentReport[] = [];
  let start = 0;
  const limit = 1000;

  while (true) {
    const url = `${B4B_API_BASE}/api/businesses.v1/${orgId}/enrollmentReports?start=${start}&limit=${limit}`;
    const resp = await fetch(url, {
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

    const total = json.paging?.total ?? 0;
    if (batch.length === 0 || start + batch.length >= total) break;
    start += limit;
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
  const users = await prisma.user.findMany({
    where: { deletedAt: null, email: { not: '' } },
    select: { id: true, email: true },
  });
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
    const key = `${r.email.toLowerCase()}|${r.contentId}`;
    const existing = deduped.get(key);
    if (!existing || (r.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
      deduped.set(key, r);
    }
  }

  for (const report of deduped.values()) {
    const email = report.email.trim().toLowerCase();
    const userId = userByEmail.get(email);

    if (!userId) {
      result.skippedNoUser += 1;
      continue;
    }

    // Determine program slug: catalog lookup first, then Coursera programId mapping, then fallback
    let programSlug: string;
    const knownMetas = courseIdToMeta[report.contentId];
    const programSlugsFromId = programIdToSlugs[report.programId];

    if (knownMetas && knownMetas.length > 0) {
      programSlug = knownMetas[0].programSlug;
    } else if (programSlugsFromId && programSlugsFromId.length > 0) {
      programSlug = programSlugsFromId[0];
    } else {
      // Fallback: use Coursera's programSlug or a generic bucket
      programSlug = slugify(report.programSlug || report.programName || 'coursera-unknown');
    }

    // Determine course slug: catalog lookup first, then slugify Coursera contentName
    let courseSlug: string;
    let isKnown = false;
    if (knownMetas && knownMetas.length > 0) {
      courseSlug = knownMetas[0].courseSlug;
      isKnown = true;
    } else {
      courseSlug = slugify(report.contentName || report.contentSlug || report.contentId);
    }

    // Determine status
    let status: CourseProgressStatus;
    if (report.isCompleted) {
      status = CourseProgressStatus.COMPLETED;
    } else if (report.overallProgress > 0) {
      status = CourseProgressStatus.IN_PROGRESS;
    } else {
      status = CourseProgressStatus.NOT_STARTED;
    }

    try {
      await prisma.courseProgress.upsert({
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
          status,
          percentComplete: report.overallProgress,
          startedAt: report.enrolledAt ? new Date(report.enrolledAt) : null,
          completedAt: report.isCompleted ? new Date(report.updatedAt) : null,
        },
        update: {
          courseId: report.contentId,
          status,
          percentComplete: report.overallProgress,
          startedAt: report.enrolledAt ? new Date(report.enrolledAt) : null,
          completedAt: report.isCompleted ? new Date(report.updatedAt) : null,
        },
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

  return result;
}

/* ------------------------------------------------------------------ */
/*  Rollup rebuild                                                     */
/* ------------------------------------------------------------------ */

async function updateRollups(emails: string[]) {
  const affectedUsers = await prisma.user.findMany({
    where: { email: { in: emails, mode: 'insensitive' }, deletedAt: null },
    select: { id: true, email: true },
  });

  for (const user of affectedUsers) {
    const rows = await prisma.courseProgress.findMany({
      where: { userId: user.id },
      select: { programSlug: true, status: true, percentComplete: true },
    });

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
      await prisma.memberProgramProgress.upsert({
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
      });
    }
  }
}
