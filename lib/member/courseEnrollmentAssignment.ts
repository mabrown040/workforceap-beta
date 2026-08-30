import type { Prisma } from '@prisma/client';
import {
  canonicalizeProgramSlug,
  programSlugReadCandidates,
} from '@/lib/content/programSlug';
import { LEGACY_CURRICULUM_VERSION } from '@/lib/content/programCurriculumManifest';

type EnrollmentCreateData = Omit<
  Prisma.CourseEnrollmentUncheckedCreateInput,
  'userId' | 'programSlug' | 'curriculumVersion'
> & { curriculumVersion: string };

type EnrollmentUpdateData = Omit<
  Prisma.CourseEnrollmentUncheckedUpdateInput,
  'curriculumVersion'
> & { curriculumVersion?: never };

/**
 * Create or update one logical program assignment without duplicating an
 * older row stored under a retired program alias. New rows always use the
 * canonical slug; existing rows keep both their stored slug and immutable
 * curriculumVersion and are updated by primary key.
 */
export async function upsertEquivalentCourseEnrollment(
  tx: Prisma.TransactionClient,
  args: {
    userId: string;
    programSlug: string;
    preserveLegacyAssignment?: boolean;
    create: EnrollmentCreateData;
    update: EnrollmentUpdateData;
  },
) {
  const canonicalProgramSlug = canonicalizeProgramSlug(args.programSlug);
  const equivalentRows = await tx.courseEnrollment.findMany({
    where: {
      userId: args.userId,
      programSlug: { in: programSlugReadCandidates(canonicalProgramSlug) },
    },
    select: { id: true, programSlug: true, isPrimary: true },
  });
  const existing = equivalentRows.sort((a, b) => {
    const aCanonical = a.programSlug === canonicalProgramSlug ? 1 : 0;
    const bCanonical = b.programSlug === canonicalProgramSlug ? 1 : 0;
    if (aCanonical !== bCanonical) return bCanonical - aCanonical;
    return Number(b.isPrimary) - Number(a.isPrimary);
  })[0];

  if (existing) {
    return tx.courseEnrollment.update({
      where: { id: existing.id },
      data: args.update,
    });
  }

  let curriculumVersion = args.create.curriculumVersion;
  if (curriculumVersion !== LEGACY_CURRICULUM_VERSION) {
    const equivalentProgramSlugs = programSlugReadCandidates(canonicalProgramSlug);
    const [courseProgressCount, programProgressCount] = await Promise.all([
      tx.courseProgress.count({
        where: {
          userId: args.userId,
          programSlug: { in: equivalentProgramSlugs },
        },
      }),
      tx.memberProgramProgress.count({
        where: {
          userId: args.userId,
          programSlug: { in: equivalentProgramSlugs },
        },
      }),
    ]);
    if (
      args.preserveLegacyAssignment === true
      || courseProgressCount > 0
      || programProgressCount > 0
    ) {
      // A missing CourseEnrollment is a pre-versioning compatibility gap, not
      // permission to reinterpret existing progress as the newest curriculum.
      // Preserve the learner on legacy; a deliberate migration must be a
      // separate attended operation with its own proof and rollback.
      curriculumVersion = LEGACY_CURRICULUM_VERSION;
    }
  }

  // Keep exact-key retry safety for concurrent requests while still handling
  // legacy aliases through the lookup above.
  return tx.courseEnrollment.upsert({
    where: {
      userId_programSlug: {
        userId: args.userId,
        programSlug: canonicalProgramSlug,
      },
    },
    create: {
      ...args.create,
      userId: args.userId,
      programSlug: canonicalProgramSlug,
      curriculumVersion: curriculumVersion,
    },
    update: { ...args.update },
  });
}
