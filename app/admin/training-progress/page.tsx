import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';
import { getProgramBySlug, PROGRAMS } from '@/lib/content/programs';
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
    take: 5000,
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

  const [canonicalProgressRows, rawCourseraRows, dbMappings, courseEnrollmentRows] = await Promise.all([
    prisma.courseProgress.findMany({
      take: 5000,
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
      take: 5000,
      // Intentionally NOT filtered by `userId in learnerIds`. We want to
      // surface every Coursera enrollment the org has — including rows whose
      // courseraEmail never matched a WAP user. Those orphans are exactly the
      // ones an admin needs to reconcile (matching `/admin/coursera`'s
      // unmatched-learners panel). The UI flags them as `(unmapped user)`.
      orderBy: [{ lastActivityTime: 'desc' }],
      select: {
        userId: true,
        externalEmail: true,
        externalName: true,
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
    prisma.courseraCanonicalCourseMapping.findMany({
      take: 5000,
      select: {
        courseraCourseId: true,
        canonicalProgramSlug: true,
        canonicalCourseSlug: true,
      },
    }),
    // Multi-program: drive the curriculum view from EVERY enrollment row
    // (primary + secondary), not just `User.enrolledProgram`. The legacy
    // single-program field stays as a fallback below for users without any
    // CourseEnrollment rows yet (seeded test users).
    prisma.courseEnrollment.findMany({
      take: 5000,
      where: { userId: { in: learnerIds } },
      select: {
        userId: true,
        programSlug: true,
        isPrimary: true,
      },
    }),
  ]);

  const dbMappingByCourseraId = new Map(
    dbMappings.map((m) => [m.courseraCourseId, m]),
  );

  const canonicalByKey = new Map(
    canonicalProgressRows.map((r) => [`${r.userId}:${r.programSlug}:${r.courseSlug}`, r]),
  );

  // Multi-program: bucket every CourseEnrollment row by user so we can
  // emit curriculum rows for primary + secondary programs in one pass.
  const enrollmentsByUser = new Map<string, typeof courseEnrollmentRows>();
  for (const row of courseEnrollmentRows) {
    const bucket = enrollmentsByUser.get(row.userId);
    if (bucket) bucket.push(row);
    else enrollmentsByUser.set(row.userId, [row]);
  }

  // Curriculum view: row per (learner × enrolled program × canonical course).
  // For multi-program learners we emit one block per enrolled program, in
  // this order: primary first, then each secondary alphabetically by program
  // title. The `programRole` field lets the client component show a
  // `secondary` pill on rows from non-primary programs.
  const curriculumRows: CurriculumRow[] = [];
  for (const learner of learners) {
    const learnerEnrollments = enrollmentsByUser.get(learner.id) ?? [];

    // Build the ordered list of programs to render for this learner. When
    // CourseEnrollment rows exist, they drive the view (primary first, then
    // secondaries alpha by program title). Otherwise fall back to the
    // legacy `User.enrolledProgram` so seeded users without a backfilled
    // enrollment row still get a curriculum block (treated as primary).
    type ProgramEmit = { programSlug: string; programRole: 'primary' | 'secondary' };
    let programsToEmit: ProgramEmit[] = [];

    if (learnerEnrollments.length > 0) {
      const primary = learnerEnrollments.find((e) => e.isPrimary) ?? null;
      const secondaries = learnerEnrollments
        .filter((e) => e !== primary)
        .map((e) => ({
          programSlug: e.programSlug,
          programTitle: getProgramBySlug(e.programSlug)?.title ?? e.programSlug,
        }))
        .sort((a, b) => a.programTitle.localeCompare(b.programTitle));

      if (primary) {
        programsToEmit.push({ programSlug: primary.programSlug, programRole: 'primary' });
      }
      for (const s of secondaries) {
        programsToEmit.push({ programSlug: s.programSlug, programRole: 'secondary' });
      }
    } else if (learner.enrolledProgram) {
      programsToEmit = [{ programSlug: learner.enrolledProgram, programRole: 'primary' }];
    }

    for (const { programSlug, programRole } of programsToEmit) {
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
          programRole,
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
  }

  // Raw Coursera view: row per (learner × actual Coursera course they're in)
  // Mapping resolution order:
  //   1. DB-curated mapping in coursera_canonical_course_mappings (admin-edited)
  //   2. Static program-def mapping via courseraCourseId / slug
  //   3. Unmapped — surface the inline "Map this" form in the UI
  const learnersById = new Map(learners.map((l) => [l.id, l]));
  const rawRows: RawCourseraRow[] = rawCourseraRows.map((row) => {
    const learner = row.userId ? learnersById.get(row.userId) : null;
    let mappedProgramSlug: string | null = null;
    let mappedCourseSlug: string | null = null;
    let mappingSource: 'db' | 'static' | null = null;

    const dbMatch = dbMappingByCourseraId.get(row.courseraCourseId);
    if (dbMatch) {
      mappedProgramSlug = dbMatch.canonicalProgramSlug;
      mappedCourseSlug = dbMatch.canonicalCourseSlug;
      mappingSource = 'db';
    } else if (learner?.enrolledProgram) {
      const program = getProgramBySlug(learner.enrolledProgram);
      const match = program?.courses.find(
        (c) =>
          (c.courseraCourseId && c.courseraCourseId === row.courseraCourseId) ||
          (row.courseraCourseSlug && c.slug === row.courseraCourseSlug),
      );
      if (match) {
        mappedProgramSlug = learner.enrolledProgram;
        mappedCourseSlug = match.slug;
        mappingSource = 'static';
      }
    }
    return {
      key: `${row.userId ?? row.externalEmail}:${row.courseraCourseId}`,
      learnerId: row.userId,
      // When a learner's Coursera email never matched a WAP user, fall back
      // to the externalName from the Coursera CSV/API so the row is still
      // identifiable in the table — and flag the identity gap explicitly.
      learnerName: learner?.fullName ?? row.externalName ?? null,
      learnerEmail: learner?.email ?? row.externalEmail,
      learnerRole: learner?.profile?.role ?? null,
      identityMatched: Boolean(learner),
      courseraCourseId: row.courseraCourseId,
      courseraCourseSlug: row.courseraCourseSlug,
      courseName: row.courseName,
      university: row.university,
      courseraProgramSlug: row.programSlug,
      courseraProgramName: row.programName,
      mappedProgramSlug,
      mappedCourseSlug,
      mappingSource,
      suggestedProgramSlug: learner?.enrolledProgram ?? null,
      percentComplete: Number(row.overallProgress),
      learningHours: Number(row.learningHours),
      isCompleted: row.isCompleted,
      enrollmentTime: row.enrollmentTime?.toISOString() ?? null,
      lastActivityTime: row.lastActivityTime?.toISOString() ?? null,
      completionTime: row.completionTime?.toISOString() ?? null,
    };
  });

  // Catalog of canonical (programSlug, courseSlug, courseName) options the
  // client can offer in the "Map this" dropdown. Built from the static
  // program definitions in lib/content/programs.ts.
  const canonicalCatalog = PROGRAMS.map((program) => ({
    programSlug: program.slug,
    programTitle: program.title,
    courses: program.courses.map((c) => ({
      slug: c.slug,
      name: c.name,
      courseraCourseId: c.courseraCourseId ?? null,
    })),
  }));

  return (
    <PortalPageFrame>
      <PageHeader
        title="Training progress"
        subtitle="All learners across both canonical curriculum (DB course_progress) and raw Coursera enrollments (coursera_course_progress). Sort any column."
      />
      <TrainingProgressClient
        curriculumRows={curriculumRows}
        rawRows={rawRows}
        canonicalCatalog={canonicalCatalog}
      />
    </PortalPageFrame>
  );
}
