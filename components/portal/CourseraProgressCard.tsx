import { prisma } from '@/lib/db/prisma';
import { getCourseraConfig } from '@/lib/coursera/config';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
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
  const rows = await prisma.courseraCourseProgress.findMany({
    where: { userId },
    orderBy: [{ overallProgress: 'desc' }, { lastActivityTime: 'desc' }],
  });

  // Discovered catalog gives us a shareable program URL we can use as the
  // fallback "View on Coursera" target when a course slug is missing. We pick
  // the first row's programSlug since all rows share the member's enrollment.
  const programSlug = rows[0]?.programSlug ?? null;
  const fromDiscovered = programSlug
    ? DISCOVERED_COURSERA_PROGRAMS[programSlug]?.publicProgramUrl ?? null
    : null;
  const fromConfig = getCourseraConfig().programHomeUrl || null;
  const programHomeUrl: string | null = fromDiscovered ?? fromConfig;

  const viewRows: CourseraProgressRow[] = rows.map((row) => ({
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

  return (
    <CourseraProgressCardView
      rows={viewRows}
      programHomeUrl={programHomeUrl}
      launchUrl={launchHref}
    />
  );
}
