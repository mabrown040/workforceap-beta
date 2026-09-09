import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { APPROVED_CURRICULUM_VERSION, getProgramCurriculumManifest } from '@/lib/content/programCurriculumManifest';
import { canonicalizeProgramSlug, programSlugReadCandidates } from '@/lib/content/programSlug';
import { getProgramSyllabus } from '@/shared/programSyllabi';
import { getProgramCoursesForCurriculumVersion, normalizeCurriculumVersion } from './curriculumAssignment';
import type { TrainingWorkspace, TrainingWorkspaceUpdate } from './trainingWorkspace';

type WorkspaceDb = Pick<Prisma.TransactionClient, 'courseEnrollment' | 'trainingStudyPlan' | 'trainingCourseWork'>;

export class TrainingWorkspaceError extends Error {
  constructor(public readonly code: 'PROGRAM_NOT_ASSIGNED' | 'CURRICULUM_CHANGED' | 'COURSE_NOT_ASSIGNED', public readonly status: number) {
    super(code);
    this.name = 'TrainingWorkspaceError';
  }
}

async function loadAssignedCurriculum(db: WorkspaceDb, userId: string, programSlug?: string | null) {
  const enrollment = await db.courseEnrollment.findFirst({
    where: {
      userId,
      ...(programSlug ? { programSlug: { in: programSlugReadCandidates(programSlug) } } : {}),
      user: { deletedAt: null },
    },
    orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
    select: { programSlug: true, curriculumVersion: true },
  });
  if (!enrollment) return null;
  const canonical = canonicalizeProgramSlug(enrollment.programSlug);
  const program = getProgramBySlug(canonical);
  if (!program) return null;
  let curriculumVersion: string;
  try {
    curriculumVersion = normalizeCurriculumVersion(enrollment.curriculumVersion);
  } catch {
    return null;
  }
  if (curriculumVersion === APPROVED_CURRICULUM_VERSION && !getProgramCurriculumManifest(canonical, curriculumVersion)) return null;
  const courses = getProgramCoursesForCurriculumVersion(program, curriculumVersion);
  return { program, programSlug: canonical, curriculumVersion, courses };
}

async function loadWithDb(db: WorkspaceDb, args: { userId: string; programSlug?: string | null }): Promise<TrainingWorkspace | null> {
  const assigned = await loadAssignedCurriculum(db, args.userId, args.programSlug);
  if (!assigned) return null;
  const { program, programSlug, curriculumVersion, courses } = assigned;
  const key = { userId: args.userId, programSlug, curriculumVersion };
  const plan = await db.trainingStudyPlan.findUnique({
    where: { userId_programSlug_curriculumVersion: key },
  });
  const work = await db.trainingCourseWork.findMany({
    where: { ...key, courseSlug: { in: courses.map((course) => course.slug) } },
    select: { courseSlug: true, notes: true, artifactUrl: true, updatedAt: true },
  });
  const workBySlug = new Map(work.map((row) => [row.courseSlug, row]));
  return {
    programSlug,
    programTitle: program.title,
    curriculumVersion,
    weeklyHours: plan?.weeklyHours ?? null,
    planStartDate: plan?.planStartDate.toISOString().slice(0, 10) ?? null,
    planUpdatedAt: plan?.updatedAt.toISOString() ?? null,
    totalEstimatedHours: courses.reduce((hours, course) => hours + (Number.isFinite(course.estimatedHours) ? Math.max(0, course.estimatedHours) : 0), 0),
    publishedSyllabusHours: getProgramSyllabus(programSlug)?.totalHours ?? null,
    courses: courses.map((course) => {
      const row = workBySlug.get(course.slug);
      return {
        ...course,
        notes: row?.notes ?? '',
        artifactUrl: row?.artifactUrl ?? null,
        updatedAt: row?.updatedAt.toISOString() ?? null,
      };
    }),
  };
}

/** Caller must resolve authenticated own-user identity. Missing tables propagate; never pretend a failed save succeeded. */
export async function loadTrainingWorkspace(args: { userId: string; programSlug?: string | null }): Promise<TrainingWorkspace | null> {
  return prisma.$transaction((tx) => loadWithDb(tx, args));
}

export async function saveTrainingWorkspace(userId: string, input: TrainingWorkspaceUpdate): Promise<TrainingWorkspace> {
  return prisma.$transaction(async (tx) => {
    const assigned = await loadAssignedCurriculum(tx, userId, input.programSlug);
    if (!assigned) throw new TrainingWorkspaceError('PROGRAM_NOT_ASSIGNED', 403);
    if (assigned.curriculumVersion !== input.curriculumVersion) throw new TrainingWorkspaceError('CURRICULUM_CHANGED', 409);
    const key = { userId, programSlug: assigned.programSlug, curriculumVersion: assigned.curriculumVersion };
    if (input.kind === 'plan') {
      const fields = { weeklyHours: input.weeklyHours, planStartDate: new Date(`${input.planStartDate}T00:00:00.000Z`) };
      await tx.trainingStudyPlan.upsert({
        where: { userId_programSlug_curriculumVersion: key },
        create: { ...key, ...fields },
        update: fields,
      });
    } else {
      if (!assigned.courses.some((course) => course.slug === input.courseSlug)) throw new TrainingWorkspaceError('COURSE_NOT_ASSIGNED', 403);
      const courseKey = { ...key, courseSlug: input.courseSlug };
      const fields = { notes: input.notes, artifactUrl: input.artifactUrl };
      await tx.trainingCourseWork.upsert({
        where: { userId_programSlug_curriculumVersion_courseSlug: courseKey },
        create: { ...courseKey, ...fields },
        update: fields,
      });
    }
    const workspace = await loadWithDb(tx, { userId, programSlug: assigned.programSlug });
    if (!workspace) throw new TrainingWorkspaceError('PROGRAM_NOT_ASSIGNED', 403);
    return workspace;
  });
}
