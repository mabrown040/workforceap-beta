import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';
import { getProgramBySlug } from '@/lib/content/programs';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import TrainingProgressClient, {
  type CurriculumRow,
  type RawCourseraRow,
} from '@/components/admin/TrainingProgressClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Admin – Training progress',
    description:
      'Per-learner training progress across both the canonical curriculum and raw Coursera enrollments. Sortable.',
    path: '/admin/training-progress',
  });
}

export const dynamic = 'force-dynamic';

export default async function AdminTrainingProgressPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/training-progress');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const learners = await prisma.user.findMany({
    where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE },
    orderBy: [{ fullName: 'asc' }],
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      profile: { select: { role: true } },
    },
  });

  const learnerIds = learners.map((l) => l.id);

  const [canonicalProgressRows, rawCourseraRows] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { userId: { in: learnerIds } },
      select: {
        userId: true,
        programSlug: true,
        courseSlug: true,
        courseId: true,
        status: true,
        percentComplete: true,
        lastActivityAt: true,
        lastUpdatedAt: true,
      },
    }),
    prisma.courseraCourseProgress.findMany({
      where: { userId: { in: learnerIds } },
      orderBy: [{ lastActivityTime: 'desc' }],
      select: {
        userId: true,
        externalEmail: true,
        courseraCourseId: true,
        courseraCourseSlug: true,
        courseName: true,
        university: true,
        programSlug: true,
        programName: true,
        overallProgress: true,
        learningHours: true,
        isCompleted: true,
        enrollmentTime: true,
        lastActivityTime: true,
        completionTime: true,
      },
    }),
  ]);

  const canonicalByKey = new Map(
    canonicalProgressRows.map((r) => [`${r.userId}:${r.programSlug}:${r.courseSlug}`, r]),
  );

  // Curriculum view: row per (learner × enrolled program × canonical course)
  const curriculumRows: CurriculumRow[] = [];
  for (const learner of learners) {
    const programSlug = learner.enrolledProgram;
    if (!programSlug) continue;
    const program = getProgramBySlug(programSlug);
    if (!program) continue;
    for (const course of program.courses) {
      const progress = canonicalByKey.get(`${learner.id}:${programSlug}:${course.slug}`);
      curriculumRows.push({
        key: `${learner.id}:${programSlug}:${course.slug}`,
        learnerId: learner.id,
        learnerName: learner.fullName ?? '',
        learnerEmail: learner.email ?? '',
        learnerRole: learner.profile?.role ?? 'member',
        programSlug,
        programTitle: program.title,
        courseSlug: course.slug,
        courseName: course.name,
        courseraCourseId: progress?.courseId ?? course.courseraCourseId ?? null,
        status: progress?.status ?? 'NOT_STARTED',
        percentComplete: progress?.percentComplete ?? 0,
        lastActivityAt: progress?.lastActivityAt?.toISOString() ?? null,
        lastUpdatedAt: progress?.lastUpdatedAt?.toISOString() ?? null,
      });
    }
  }

  // Raw Coursera view: row per (learner × actual Coursera course they're in)
  // Best-effort canonical mapping: match by courseraCourseId across all known
  // canonical programs the learner could be on.
  const learnersById = new Map(learners.map((l) => [l.id, l]));
  const rawRows: RawCourseraRow[] = rawCourseraRows.map((row) => {
    const learner = row.userId ? learnersById.get(row.userId) : null;
    let mappedProgramSlug: string | null = null;
    let mappedCourseSlug: string | null = null;
    if (learner?.enrolledProgram) {
      const program = getProgramBySlug(learner.enrolledProgram);
      const match = program?.courses.find(
        (c) =>
          (c.courseraCourseId && c.courseraCourseId === row.courseraCourseId) ||
          (row.courseraCourseSlug && c.slug === row.courseraCourseSlug),
      );
      if (match) {
        mappedProgramSlug = learner.enrolledProgram;
        mappedCourseSlug = match.slug;
      }
    }
    return {
      key: `${row.userId ?? row.externalEmail}:${row.courseraCourseId}`,
      learnerId: row.userId,
      learnerName: learner?.fullName ?? null,
      learnerEmail: learner?.email ?? row.externalEmail,
      learnerRole: learner?.profile?.role ?? null,
      courseraCourseId: row.courseraCourseId,
      courseraCourseSlug: row.courseraCourseSlug,
      courseName: row.courseName,
      university: row.university,
      courseraProgramSlug: row.programSlug,
      courseraProgramName: row.programName,
      mappedProgramSlug,
      mappedCourseSlug,
      percentComplete: Number(row.overallProgress),
      learningHours: Number(row.learningHours),
      isCompleted: row.isCompleted,
      enrollmentTime: row.enrollmentTime?.toISOString() ?? null,
      lastActivityTime: row.lastActivityTime?.toISOString() ?? null,
      completionTime: row.completionTime?.toISOString() ?? null,
    };
  });

  return (
    <PortalPageFrame>
      <PageHeader
        title="Training progress"
        subtitle="All learners across both canonical curriculum (DB course_progress) and raw Coursera enrollments (coursera_course_progress). Sort any column."
      />
      <TrainingProgressClient curriculumRows={curriculumRows} rawRows={rawRows} />
    </PortalPageFrame>
  );
}
