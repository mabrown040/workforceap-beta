import 'server-only';

import { CourseProgressStatus } from '@prisma/client';

import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { getProgramBySlug } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';
import type { ParsedXapiStatement } from '@/lib/xapi/statements';
import { isXapiCompletionVerb, isXapiCourseProgressVerb } from '@/lib/xapi/statements';
import { inferCourseProgressStatusFromXapiVerb } from '@/lib/member/xapiVerbProgress';
import { resolveProgramCourseWithCatalogFallback } from '@/lib/member/programCourseMatch';

function discoveredMetaForSlug(programSlug: string, courseSlug: string) {
  const disc = DISCOVERED_COURSERA_PROGRAMS[programSlug];
  return disc?.courses.find((c) => c.slug === courseSlug) ?? null;
}

function matchCourseSlugFromObjectId(programSlug: string, objectId: string | null | undefined): string | null {
  if (!objectId) return null;
  const disc = DISCOVERED_COURSERA_PROGRAMS[programSlug];
  if (!disc) return null;
  const needle = objectId.toLowerCase();
  for (const c of disc.courses) {
    if (needle.includes(c.courseId.toLowerCase())) return c.slug;
    if (needle.includes(`/${c.slug}`) || needle.endsWith(c.slug.toLowerCase())) return c.slug;
  }
  return null;
}

function mergePercent(current: number, incoming: number | null | undefined): number {
  if (incoming == null || !Number.isFinite(incoming)) return current;
  const clamped = Math.max(0, Math.min(100, Math.round(incoming)));
  return Math.max(current, clamped);
}

export async function refreshMemberProgramProgressRollup(userId: string, programSlug: string) {
  const disc = DISCOVERED_COURSERA_PROGRAMS[programSlug];
  const program = getProgramBySlug(programSlug);
  const totalCourses = disc?.courses.length ?? program?.courses.length ?? 0;

  const rows = await prisma.courseProgress.findMany({
    where: { userId, programSlug },
    select: { status: true, percentComplete: true, courseSlug: true },
  });

  const completedRows = rows.filter((r) => r.status === CourseProgressStatus.COMPLETED);
  const completed = completedRows.length;
  const sumPercent = rows.reduce((acc, r) => acc + r.percentComplete, 0);
  const averagePercent = totalCourses > 0 ? Math.round(sumPercent / totalCourses) : 0;

  await prisma.memberProgramProgress.upsert({
    where: {
      userId_programSlug: { userId, programSlug },
    },
    create: {
      userId,
      programSlug,
      coursesCompleted: completed,
      averagePercent,
    },
    update: {
      coursesCompleted: completed,
      averagePercent,
    },
  });

  // Sync legacy User.coursesCompleted JSON. Counselor and partner views still
  // read this field directly; without this sync, xAPI-driven completions are
  // invisible to those audiences while the member sees fresh data — the same
  // member would show different completion counts on different portals. Union
  // with existing JSON to preserve any slugs added before CourseProgress
  // existed.
  const completedFromCourseProgress = completedRows.map((r) => r.courseSlug);
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { coursesCompleted: true },
  });
  const legacy = Array.isArray(existingUser?.coursesCompleted)
    ? (existingUser.coursesCompleted as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const merged = Array.from(new Set([...legacy, ...completedFromCourseProgress]));
  if (
    merged.length !== legacy.length ||
    merged.some((slug) => !legacy.includes(slug))
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: { coursesCompleted: merged },
    });
  }
}

export async function markCourseProgressCompleted(args: {
  userId: string;
  programSlug: string;
  courseSlug: string;
  courseId?: string | null;
}) {
  const now = new Date();
  const meta = discoveredMetaForSlug(args.programSlug, args.courseSlug);
  const courseId = args.courseId ?? meta?.courseId ?? null;

  await prisma.courseProgress.upsert({
    where: {
      userId_programSlug_courseSlug: {
        userId: args.userId,
        programSlug: args.programSlug,
        courseSlug: args.courseSlug,
      },
    },
    create: {
      userId: args.userId,
      programSlug: args.programSlug,
      courseSlug: args.courseSlug,
      courseId,
      status: CourseProgressStatus.COMPLETED,
      percentComplete: 100,
      scoreScaled: null,
      scoreRaw: null,
      startedAt: now,
      completedAt: now,
    },
    update: {
      courseId: courseId ?? undefined,
      status: CourseProgressStatus.COMPLETED,
      percentComplete: 100,
      completedAt: now,
    },
  });

  await refreshMemberProgramProgressRollup(args.userId, args.programSlug);
}

/**
 * Upsert `CourseProgress` from a matched xAPI statement for the member's enrolled program.
 */
export async function upsertCourseProgressFromXapiStatement(args: {
  userId: string;
  enrolledProgramSlug: string;
  parsed: ParsedXapiStatement;
}): Promise<void> {
  const { userId, enrolledProgramSlug, parsed } = args;

  if (!isXapiCourseProgressVerb(parsed)) return;

  const program = getProgramBySlug(enrolledProgramSlug);
  if (!program) return;

  const slugFromObject = matchCourseSlugFromObjectId(enrolledProgramSlug, parsed.courseObjectId);
  // Resolution order: admin-curated `coursera_canonical_course_mappings` row
  // (DB) → static DISCOVERED_COURSERA_PROGRAMS catalog → WAP slug match →
  // discovered fuzzy fallback. See `resolveProgramCourseWithCatalogFallback`.
  const matched = await resolveProgramCourseWithCatalogFallback(program, {
    courseraCourseId: parsed.courseraCourseId ?? null,
    enrolledProgramSlug,
    courseSlug: parsed.courseSlug ?? slugFromObject ?? undefined,
    courseName: parsed.courseName,
  });

  if (!matched) return;

  const nextStatus = inferCourseProgressStatusFromXapiVerb(parsed);
  if (!nextStatus) return;

  const meta = discoveredMetaForSlug(enrolledProgramSlug, matched.slug);
  const courseId = meta?.courseId ?? null;

  // Only course-level events (object.definition.type = activities/course)
  // carry the rolled-up % for the whole course; item-level events report
  // per-item progress that must not be applied as the course's percent.
  // Without this guard a single lecture's `result.progress: 1` would mark the
  // entire course 100% complete and inflate program rollups. Item-level
  // events still bump status to IN_PROGRESS via inferCourseProgressStatus
  // and update startedAt — they just don't drive percentComplete.
  const isCourseLevel = parsed.activityType === 'course';
  const incomingPercent = !isCourseLevel
    ? null
    : isXapiCompletionVerb(parsed)
      ? 100
      : mergePercent(0, parsed.resultProgressPercent ?? undefined);

  const existing = await prisma.courseProgress.findUnique({
    where: {
      userId_programSlug_courseSlug: {
        userId,
        programSlug: enrolledProgramSlug,
        courseSlug: matched.slug,
      },
    },
  });

  let status = nextStatus;
  if (existing?.status === CourseProgressStatus.COMPLETED) {
    status = CourseProgressStatus.COMPLETED;
  }

  const percentComplete = (() => {
    if (status === CourseProgressStatus.COMPLETED) return 100;
    const base = existing?.percentComplete ?? 0;
    // Item-level events leave percent untouched (incomingPercent=null).
    if (incomingPercent == null) return base;
    return mergePercent(base, incomingPercent);
  })();

  const now = new Date();
  const startedAt = existing?.startedAt
    ?? (status === CourseProgressStatus.IN_PROGRESS || status === CourseProgressStatus.COMPLETED ? now : null);

  const completedAt =
    status === CourseProgressStatus.COMPLETED
      ? (existing?.completedAt ?? now)
      : existing?.completedAt ?? null;

  await prisma.courseProgress.upsert({
    where: {
      userId_programSlug_courseSlug: {
        userId,
        programSlug: enrolledProgramSlug,
        courseSlug: matched.slug,
      },
    },
    create: {
      userId,
      programSlug: enrolledProgramSlug,
      courseSlug: matched.slug,
      courseId,
      status,
      percentComplete,
      scoreScaled: parsed.resultScoreScaled ?? null,
      scoreRaw: parsed.resultScoreRaw ?? null,
      startedAt: startedAt ?? undefined,
      completedAt: completedAt ?? undefined,
    },
    update: {
      courseId: courseId ?? undefined,
      status,
      percentComplete,
      scoreScaled: parsed.resultScoreScaled ?? undefined,
      scoreRaw: parsed.resultScoreRaw ?? undefined,
      startedAt: startedAt ?? undefined,
      completedAt: completedAt ?? undefined,
    },
  });

  await refreshMemberProgramProgressRollup(userId, enrolledProgramSlug);
}
