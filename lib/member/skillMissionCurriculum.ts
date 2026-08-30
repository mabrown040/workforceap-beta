import {
  getSkillMissionDefinition,
  getSkillMissionDefinitionsForProgram,
  type SkillMissionDefinition,
} from '@/lib/content/skillMissionCatalog';
import { getProgramBySlug, type ProgramCourse } from '@/lib/content/programs';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';
import {
  LEGACY_CURRICULUM_VERSION,
} from '@/lib/content/programCurriculumManifest';
import {
  getProgramCoursesForCurriculumVersion,
  normalizeCurriculumVersion,
} from '@/lib/member/curriculumAssignment';
import { normalizeCourseName } from '@/lib/member/missionCourseUnlock';

type MissionCurriculumCourse = ProgramCourse & {
  legacyCourseSlugs?: readonly string[];
};

export type ResolvedSkillMission = {
  definition: SkillMissionDefinition;
  assignedCourseSlug: string;
  unlockSlugs: string[];
};

export type SkillMissionEnrollment = {
  programSlug: string;
  curriculumVersion: string | null | undefined;
  isPrimary: boolean;
};

export type SkillMissionAssignment = {
  programSlug: string;
  curriculumVersion: string;
};

function findAssignedCourse(
  definition: SkillMissionDefinition,
  courses: readonly MissionCurriculumCourse[],
): MissionCurriculumCourse | null {
  const directMatches = courses.filter((course) =>
    course.slug === definition.courseSlug
      || (course.legacyCourseSlugs ?? []).includes(definition.courseSlug),
  );
  if (directMatches.length === 1) return directMatches[0]!;
  if (directMatches.length > 1) return null;

  const normalizedTitle = normalizeCourseName(definition.courseTitle);
  const titleMatches = courses.filter(
    (course) => normalizeCourseName(course.name) === normalizedTitle,
  );
  return titleMatches.length === 1 ? titleMatches[0]! : null;
}

/**
 * Resolve only missions that belong to the learner's immutable curriculum.
 * Unknown versions, unresolved programs, and ambiguous course matches return
 * no missions instead of falling back to the public/legacy course list.
 */
export function resolveSkillMissionsForCurriculum(args: {
  programSlug: string;
  curriculumVersion: string | null | undefined;
}): ResolvedSkillMission[] {
  const programSlug = canonicalizeProgramSlug(args.programSlug);
  const program = getProgramBySlug(programSlug);
  if (!program) return [];

  let courses: MissionCurriculumCourse[];
  let curriculumVersion: string;
  try {
    curriculumVersion = normalizeCurriculumVersion(args.curriculumVersion);
    courses = getProgramCoursesForCurriculumVersion(
      program,
      curriculumVersion,
    ) as MissionCurriculumCourse[];
  } catch {
    return [];
  }

  const resolved: ResolvedSkillMission[] = [];
  for (const definition of getSkillMissionDefinitionsForProgram(programSlug)) {
    const assignedCourse = findAssignedCourse(definition, courses);
    if (!assignedCourse) {
      if (curriculumVersion !== LEGACY_CURRICULUM_VERSION) continue;
      resolved.push({
        definition,
        assignedCourseSlug: definition.courseSlug,
        unlockSlugs: [definition.courseSlug],
      });
      continue;
    }

    const unlockSlugs = new Set<string>([
      assignedCourse.slug,
      ...(assignedCourse.legacyCourseSlugs ?? []),
    ]);
    if (curriculumVersion === LEGACY_CURRICULUM_VERSION) {
      unlockSlugs.add(definition.courseSlug);
    }
    resolved.push({
      definition,
      assignedCourseSlug: assignedCourse.slug,
      unlockSlugs: [...unlockSlugs],
    });
  }
  return resolved;
}

export function resolveSkillMissionForCurriculum(args: {
  programSlug: string;
  curriculumVersion: string | null | undefined;
  missionCourseSlug: string;
}): ResolvedSkillMission | null {
  return resolveSkillMissionsForCurriculum(args).find(
    ({ definition }) => definition.courseSlug === args.missionCourseSlug,
  ) ?? null;
}

export function buildSkillMissionEventKey(args: {
  programSlug: string;
  curriculumVersion: string | null | undefined;
  missionCourseSlug: string;
}): string {
  const programSlug = canonicalizeProgramSlug(args.programSlug);
  const curriculumVersion = normalizeCurriculumVersion(args.curriculumVersion);
  if (curriculumVersion === LEGACY_CURRICULUM_VERSION) {
    return `${programSlug}:mission:${args.missionCourseSlug}`;
  }
  return `${programSlug}:curriculum:${curriculumVersion}:mission:${args.missionCourseSlug}`;
}

export function parseSkillMissionEventKey(key: string): {
  programSlug: string;
  curriculumVersion: string;
  missionCourseSlug: string;
} | null {
  const marker = ':mission:';
  const markerIndex = key.indexOf(marker);
  if (markerIndex <= 0 || key.indexOf(marker, markerIndex + marker.length) !== -1) return null;

  const prefix = key.slice(0, markerIndex);
  const missionCourseSlug = key.slice(markerIndex + marker.length).trim();
  if (!missionCourseSlug) return null;

  const versionMarker = ':curriculum:';
  const versionIndex = prefix.indexOf(versionMarker);
  const rawProgramSlug = versionIndex >= 0 ? prefix.slice(0, versionIndex) : prefix;
  const rawVersion = versionIndex >= 0
    ? prefix.slice(versionIndex + versionMarker.length)
    : LEGACY_CURRICULUM_VERSION;
  if (!rawProgramSlug || !rawVersion) return null;

  try {
    return {
      programSlug: canonicalizeProgramSlug(rawProgramSlug),
      curriculumVersion: normalizeCurriculumVersion(rawVersion),
      missionCourseSlug,
    };
  } catch {
    return null;
  }
}

/** Resolve an assigned program, or the primary assignment when none is requested. */
export function resolveSkillMissionAssignment(args: {
  enrolledProgram: string | null | undefined;
  enrollments: readonly SkillMissionEnrollment[];
  requestedProgramSlug?: string | null;
}): SkillMissionAssignment | null {
  const canonicalLegacyProgram = args.enrolledProgram
    ? canonicalizeProgramSlug(args.enrolledProgram)
    : null;
  const requestedProgramSlug = args.requestedProgramSlug
    ? canonicalizeProgramSlug(args.requestedProgramSlug)
    : null;
  if (requestedProgramSlug) {
    const requestedEnrollment = args.enrollments.find(
      (enrollment) => canonicalizeProgramSlug(enrollment.programSlug) === requestedProgramSlug,
    );
    if (requestedEnrollment) {
      if (!getProgramBySlug(requestedProgramSlug)) return null;
      try {
        return {
          programSlug: requestedProgramSlug,
          curriculumVersion: normalizeCurriculumVersion(requestedEnrollment.curriculumVersion),
        };
      } catch {
        return null;
      }
    }
    if (
      args.enrollments.length === 0
      && canonicalLegacyProgram === requestedProgramSlug
      && getProgramBySlug(requestedProgramSlug)
    ) {
      return {
        programSlug: requestedProgramSlug,
        curriculumVersion: LEGACY_CURRICULUM_VERSION,
      };
    }
    return null;
  }

  const primaryEnrollment = args.enrollments.find((enrollment) => enrollment.isPrimary);
  const matchingLegacyEnrollment = canonicalLegacyProgram
    ? args.enrollments.find(
        (enrollment) => canonicalizeProgramSlug(enrollment.programSlug) === canonicalLegacyProgram,
      )
    : null;
  const enrollment = primaryEnrollment
    ?? matchingLegacyEnrollment
    ?? (args.enrollments.length === 1 ? args.enrollments[0]! : null);

  if (enrollment) {
    const programSlug = canonicalizeProgramSlug(enrollment.programSlug);
    if (!getProgramBySlug(programSlug)) return null;
    try {
      return {
        programSlug,
        curriculumVersion: normalizeCurriculumVersion(enrollment.curriculumVersion),
      };
    } catch {
      return null;
    }
  }

  if (!canonicalLegacyProgram || !getProgramBySlug(canonicalLegacyProgram)) return null;
  return {
    programSlug: canonicalLegacyProgram,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
  };
}

export function getMissionDefinitionForEventKey(key: string): SkillMissionDefinition | null {
  const parsed = parseSkillMissionEventKey(key);
  if (!parsed) return null;
  return getSkillMissionDefinition(parsed.programSlug, parsed.missionCourseSlug);
}
