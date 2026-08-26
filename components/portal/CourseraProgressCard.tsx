import { prisma } from '@/lib/db/prisma';
import { getCourseraConfig } from '@/lib/coursera/config';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  getOrgScopedCourseUrl,
  getOrgScopedProgramUrl,
} from '@/lib/coursera/orgScopedUrls';
import CourseraProgressCardView, {
  type CourseraProgressRow,
} from '@/components/portal/CourseraProgressCardView';
import {
  parseCourseGradeString,
  scoreScaledToDisplayPercent,
} from '@/lib/coursera/courseGradeDisplay';
import { humanizeCourseraCourseTitle } from '@/lib/coursera/courseTitle';
import {
  fetchLearnerProgressFromB4B,
  type LearnerProgressByContent,
} from '@/lib/coursera/learnerProgress';

type CourseraProgressCardProps = {
  /** The subject member's WAP user id. */
  userId: string;
  /**
   * Optional: where to link the empty-state CTA. Defaults to the in-app launch
   * route, which redirects the member into the right enterprise URL.
   */
  launchHref?: string;
  /**
   * Optional: filter progress rows to a specific program slug. When provided,
   * only rows whose programSlug matches will be shown — keeps the card
   * accurate for multi-program members where the active program tab differs
   * from the rows otherwise loaded.
   */
  programSlug?: string;
};

function slugToDiscoveredCourse(slug: string, programSlug: string | null) {
  if (!programSlug) return null;
  const discovered = DISCOVERED_COURSERA_PROGRAMS[programSlug];
  if (!discovered) return null;
  return discovered.courses.find((c) => c.slug === slug) ?? null;
}

/**
 * Read-only Coursera per-course progress card. Server component — fetches
 * directly via Prisma so the consumer just passes a userId.
 *
 * ⚠️ Multi-program bleed risk: when `programSlug` is omitted, the card loads
 * ALL progress rows for the user across every program. Member-facing pages
 * should ALWAYS pass `programSlug` to keep the card scoped to the active
 * program. Admin/counselor pages may intentionally omit it for a full rollup.
 *
 * Visible to members (their own progress), counselors (in-session view of the
 * subject member), and admins (per-learner drill-down). Authorization is the
 * caller's responsibility — this component does not gate access.
 */
export default async function CourseraProgressCard({
  userId,
  launchHref = '/api/member/coursera/launch',
  programSlug,
}: CourseraProgressCardProps) {
  const [csvRows, canonicalRows, progressUser] = await Promise.all([
    prisma.courseraCourseProgress.findMany({
      where: { userId, ...(programSlug ? { programSlug } : {}) },
      orderBy: [{ overallProgress: 'desc' }, { lastActivityTime: 'desc' }],
    }),
    prisma.courseProgress.findMany({
      where: {
        userId,
        ...(programSlug ? { programSlug } : {}),
        OR: [{ status: { not: 'NOT_STARTED' } }, { scoreScaled: { not: null } }],
      },
      orderBy: [{ lastUpdatedAt: 'desc' }],
      select: {
        id: true,
        programSlug: true,
        courseSlug: true,
        courseId: true,
        status: true,
        percentComplete: true,
        scoreScaled: true,
        lastUpdatedAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }),
  ]);

  const courseraProgramId =
    programSlug != null && programSlug !== ''
      ? DISCOVERED_COURSERA_PROGRAMS[programSlug]?.courseraProgramId
      : undefined;

  let b4bProgress: LearnerProgressByContent = new Map();
  const learnerEmail = progressUser?.email?.trim();
  if (learnerEmail) {
    b4bProgress = await fetchLearnerProgressFromB4B(learnerEmail, {
      programId: courseraProgramId,
    }).catch((err: unknown) => {
      console.warn('[CourseraProgressCard] B4B learner progress unavailable:', err);
      return new Map();
    });
  }

  // Org-scoped program URL keeps the member inside their Coursera For Business
  // context (cookie-authenticated learners hit the program shell directly;
  // unauthenticated learners hit the org sign-in page rather than a generic
  // catalog). We pick the first row's programSlug since all rows share the
  // member's enrollment. Fall back to the configured COURSERA_PROGRAM_HOME_URL
  // when no enrollment has been recorded yet.
  const primaryProgramSlug =
    programSlug ?? csvRows[0]?.programSlug ?? canonicalRows[0]?.programSlug ?? null;
  const programHomeUrl: string | null = primaryProgramSlug
    ? await getOrgScopedProgramUrl(primaryProgramSlug)
    : (getCourseraConfig().programHomeUrl || null);

  const coveredSlugs = new Set<string>(
    csvRows.map((r) => r.courseraCourseSlug).filter(Boolean) as string[]
  );

  const gradePercentByCourseraId = new Map<string, number>();
  for (const c of canonicalRows) {
    const cid = c.courseId?.trim();
    if (!cid) continue;
    const pct = scoreScaledToDisplayPercent(c.scoreScaled);
    if (pct != null) gradePercentByCourseraId.set(cid, pct);
  }

  const csvViewRows: CourseraProgressRow[] = await Promise.all(
    csvRows.map(async (row) => {
      const cid = row.courseraCourseId?.trim() ?? '';
      const b4b = cid ? b4bProgress.get(cid) : undefined;
      const csvPct = Number(row.overallProgress) || 0;
      const locallyCompleted = row.isCompleted === true;
      const overallProgress =
        locallyCompleted || b4b?.isCompleted ? 100 : b4b != null ? b4b.overallProgress : csvPct;
      return {
        id: row.id,
        courseName: humanizeCourseraCourseTitle(row.courseName, row.courseraCourseSlug),
        university: row.university ?? null,
        courseraCourseSlug: row.courseraCourseSlug ?? null,
        overallProgress,
        gradePercent:
          parseCourseGradeString(row.courseGrade) ?? gradePercentByCourseraId.get(cid) ?? null,
        learningHours: Number(row.learningHours) > 0 ? Number(row.learningHours) : null,
        isCompleted: locallyCompleted || b4b?.isCompleted === true,
        certificateUrl: row.certificateUrl ?? null,
        lastActivityTime: row.lastActivityTime ? row.lastActivityTime.toISOString() : null,
        viewUrl: row.programSlug
          ? await getOrgScopedCourseUrl(row.programSlug, row.courseraCourseId)
          : null,
      };
    }),
  );

  const viewRows: CourseraProgressRow[] = [...csvViewRows];

  // Backfill from canonical course_progress so the card shows progress even
  // before the first CSV import (xAPI / webhook / manual completions).
  for (const c of canonicalRows) {
    if (coveredSlugs.has(c.courseSlug)) continue;
    const program = c.programSlug ? getProgramBySlug(c.programSlug) : null;
    const course = program?.courses.find((pc) => pc.slug === c.courseSlug);
    const discovered = slugToDiscoveredCourse(c.courseSlug, c.programSlug);
    const cid =
      (discovered?.courseId && !discovered.courseId.startsWith('TODO_')
        ? discovered.courseId
        : c.courseId?.trim()) ?? '';
    const b4b = cid ? b4bProgress.get(cid) : undefined;
    const localPct = c.percentComplete ?? 0;
    const locallyCompleted = c.status === 'COMPLETED';
    const overallProgress =
      locallyCompleted || b4b?.isCompleted ? 100 : b4b != null ? b4b.overallProgress : localPct;
    const viewUrl =
      c.programSlug && discovered?.courseId
        ? await getOrgScopedCourseUrl(c.programSlug, discovered.courseId)
        : c.programSlug
          ? await getOrgScopedProgramUrl(c.programSlug)
          : null;
    viewRows.push({
      id: `canonical-${c.id}`,
      courseName: humanizeCourseraCourseTitle(
        course?.name ?? discovered?.name ?? c.courseSlug,
        c.courseSlug,
      ),
      university: discovered?.partner ?? null,
      courseraCourseSlug: c.courseSlug,
      overallProgress,
      gradePercent: scoreScaledToDisplayPercent(c.scoreScaled),
      learningHours: null,
      isCompleted: locallyCompleted || b4b?.isCompleted === true,
      certificateUrl: null,
      lastActivityTime: c.lastUpdatedAt ? c.lastUpdatedAt.toISOString() : null,
      viewUrl,
    });
  }

  viewRows.sort((a, b) => {
    if (b.overallProgress !== a.overallProgress) return b.overallProgress - a.overallProgress;
    const aTime = a.lastActivityTime ? new Date(a.lastActivityTime).getTime() : 0;
    const bTime = b.lastActivityTime ? new Date(b.lastActivityTime).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <CourseraProgressCardView
      rows={viewRows}
      programHomeUrl={programHomeUrl}
      launchUrl={launchHref}
    />
  );
}
