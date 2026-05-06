import { prisma } from '@/lib/db/prisma';
import { getCourseraConfig } from '@/lib/coursera/config';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { getProgramBySlug } from '@/lib/content/programs';
import CourseraProgressCardView, {
  type CourseraProgressRow,
} from '@/components/portal/CourseraProgressCardView';

type CourseraProgressCardProps = {
  /** The subject member's WAP user id. */
  userId: string;
  /**
   * Optional: where to link the empty-state CTA. Defaults to the in-app launch
   * route, which redirects the member into the right enterprise URL.
   */
  launchHref?: string;
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
 * Visible to members (their own progress), counselors (in-session view of the
 * subject member), and admins (per-learner drill-down). Authorization is the
 * caller's responsibility — this component does not gate access.
 */
export default async function CourseraProgressCard({
  userId,
  launchHref = '/api/member/coursera/launch',
}: CourseraProgressCardProps) {
  const [csvRows, canonicalRows] = await Promise.all([
    prisma.courseraCourseProgress.findMany({
      where: { userId },
      orderBy: [{ overallProgress: 'desc' }, { lastActivityTime: 'desc' }],
    }),
    prisma.courseProgress.findMany({
      where: { userId, status: { not: 'NOT_STARTED' } },
      orderBy: [{ lastUpdatedAt: 'desc' }],
    }),
  ]);

  // Discovered catalog gives us a shareable program URL we can use as the
  // fallback "View on Coursera" target when a course slug is missing. We pick
  // the first row's programSlug since all rows share the member's enrollment.
  const programSlug = csvRows[0]?.programSlug ?? canonicalRows[0]?.programSlug ?? null;
  const fromDiscovered = programSlug
    ? DISCOVERED_COURSERA_PROGRAMS[programSlug]?.publicProgramUrl ?? null
    : null;
  const fromConfig = getCourseraConfig().programHomeUrl || null;
  const programHomeUrl: string | null = fromDiscovered ?? fromConfig;

  const coveredSlugs = new Set<string>(
    csvRows.map((r) => r.courseraCourseSlug).filter(Boolean) as string[]
  );

  const viewRows: CourseraProgressRow[] = csvRows.map((row) => ({
    id: row.id,
    courseName: row.courseName,
    university: row.university ?? null,
    courseraCourseSlug: row.courseraCourseSlug ?? null,
    overallProgress: Number(row.overallProgress) || 0,
    learningHours: Number(row.learningHours) || 0,
    isCompleted: row.isCompleted,
    certificateUrl: row.certificateUrl ?? null,
    lastActivityTime: row.lastActivityTime ? row.lastActivityTime.toISOString() : null,
  }));

  // Backfill from canonical course_progress so the card shows progress even
  // before the first CSV import (xAPI / webhook / manual completions).
  for (const c of canonicalRows) {
    if (coveredSlugs.has(c.courseSlug)) continue;
    const program = c.programSlug ? getProgramBySlug(c.programSlug) : null;
    const course = program?.courses.find((pc) => pc.slug === c.courseSlug);
    const discovered = slugToDiscoveredCourse(c.courseSlug, c.programSlug);
    viewRows.push({
      id: `canonical-${c.id}`,
      courseName: course?.name ?? discovered?.name ?? c.courseSlug,
      university: discovered?.partner ?? null,
      courseraCourseSlug: c.courseSlug,
      overallProgress: c.percentComplete ?? 0,
      learningHours: 0,
      isCompleted: c.status === 'COMPLETED',
      certificateUrl: null,
      lastActivityTime: c.lastUpdatedAt ? c.lastUpdatedAt.toISOString() : null,
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
