import type { ProgramCourse } from '@/lib/content/programs';
import {
  getProgramSyllabus,
  type ProgramSyllabus,
  type ProgramSyllabusCourse,
} from '@/shared/programSyllabi';

export const APPROVED_CURRICULUM_VERSION = '2026-approved-v2' as const;
export const LEGACY_CURRICULUM_VERSION = 'legacy-v1' as const;
export const CATALOG_CURRICULUM_VERSION = 'catalog-v1' as const;

export type CurriculumVersion =
  | typeof APPROVED_CURRICULUM_VERSION
  | typeof LEGACY_CURRICULUM_VERSION
  | typeof CATALOG_CURRICULUM_VERSION;

export type CurriculumCourseBinding =
  | {
      kind: 'coursera';
      courseraSlug: string;
      courseraCourseId: string;
      legacyCourseSlugs?: readonly string[];
    }
  | {
      kind: 'workforceap';
      courseSlug: string;
      syllabusCourseName: string;
      legacyCourseSlugs?: readonly string[];
    };

export type MaterializedCurriculumCourse = ProgramCourse & {
  kind: CurriculumCourseBinding['kind'];
  legacyCourseSlugs: readonly string[];
};

export type ProgramCurriculumManifest = {
  programSlug: string;
  version: typeof APPROVED_CURRICULUM_VERSION;
  syllabusSha256: string;
  expectedCourseCount: number;
  expectedProviderCourseCount: number;
  externalTrack: {
    status: 'pending' | 'validated';
    collectionId: string | null;
    /**
     * Validation and rollout are separate gates. `canary` permits only an
     * explicitly authorized canary assignment; normal enrollment writers do
     * not move to v2 until this is deliberately changed to `enabled`.
     */
    assignmentMode: 'disabled' | 'canary' | 'enabled';
  };
  courses: readonly MaterializedCurriculumCourse[];
};

type ManifestDefinition = Omit<ProgramCurriculumManifest, 'courses'> & {
  bindings: readonly CurriculumCourseBinding[];
};

/** Coursera sometimes prefixes the same opaque content id with `Course~`. */
export function normalizeCourseraCourseId(value: string | null | undefined): string {
  return value?.trim().replace(/^(?:Course|Specialization)~/i, '') ?? '';
}

function materializeCourse(
  syllabus: ProgramSyllabus,
  binding: CurriculumCourseBinding,
): MaterializedCurriculumCourse {
  let syllabusCourse: ProgramSyllabusCourse | undefined;
  let slug: string;

  if (binding.kind === 'coursera') {
    syllabusCourse = syllabus.courses.find(
      (course) => course.courseraSlug === binding.courseraSlug,
    );
    slug = binding.courseraSlug;
  } else {
    syllabusCourse = syllabus.courses.find(
      (course) => course.name === binding.syllabusCourseName,
    );
    slug = binding.courseSlug;
  }

  if (!syllabusCourse) {
    throw new Error(
      `Approved curriculum ${syllabus.slug} cannot bind ${
        binding.kind === 'coursera' ? binding.courseraSlug : binding.syllabusCourseName
      } to its regulated syllabus`,
    );
  }

  return Object.freeze({
    kind: binding.kind,
    slug,
    name: syllabusCourse.name,
    estimatedHours: syllabusCourse.hours,
    description: syllabusCourse.description,
    ...(binding.kind === 'coursera'
      ? {
          courseraSlug: binding.courseraSlug,
          courseraCourseId: normalizeCourseraCourseId(binding.courseraCourseId),
        }
      : {}),
    legacyCourseSlugs: Object.freeze([...(binding.legacyCourseSlugs ?? [])]),
  });
}

function materializeManifest(definition: ManifestDefinition): ProgramCurriculumManifest {
  const syllabus = getProgramSyllabus(definition.programSlug);
  if (!syllabus) {
    throw new Error(`Approved curriculum has no syllabus: ${definition.programSlug}`);
  }
  if (syllabus.sourceSha256 !== definition.syllabusSha256) {
    throw new Error(`Approved curriculum syllabus hash drifted: ${definition.programSlug}`);
  }

  const courses = definition.bindings.map((binding) => materializeCourse(syllabus, binding));
  const providerCount = courses.filter((course) => course.kind === 'coursera').length;
  if (
    courses.length !== definition.expectedCourseCount ||
    providerCount !== definition.expectedProviderCourseCount
  ) {
    throw new Error(`Approved curriculum count drifted: ${definition.programSlug}`);
  }

  return Object.freeze({
    programSlug: definition.programSlug,
    version: definition.version,
    syllabusSha256: definition.syllabusSha256,
    expectedCourseCount: definition.expectedCourseCount,
    expectedProviderCourseCount: definition.expectedProviderCourseCount,
    externalTrack: Object.freeze({ ...definition.externalTrack }),
    courses: Object.freeze(courses),
  });
}

const DEFINITIONS: readonly ManifestDefinition[] = [
  {
    programSlug: 'ux-design-professional-certificate-google',
    version: APPROVED_CURRICULUM_VERSION,
    syllabusSha256: '6ac3ac7d95b30786356fbc702245ac0ea42d5410594aa6add3629bdf2385ff08',
    expectedCourseCount: 8,
    expectedProviderCourseCount: 7,
    externalTrack: { status: 'pending', collectionId: null, assignmentMode: 'disabled' },
    bindings: [
      { kind: 'coursera', courseraSlug: 'foundations-user-experience-design', courseraCourseId: 'aDPeKsbTEeqqzg7nmRt_BQ' },
      { kind: 'coursera', courseraSlug: 'start-ux-design-process', courseraCourseId: 'R-r2uwp-Eeuf7w5EwYPThw' },
      { kind: 'coursera', courseraSlug: 'wireframes-low-fidelity-prototypes', courseraCourseId: 'TjOLkAp-EeubJBIM7h4jow' },
      { kind: 'coursera', courseraSlug: 'conduct-ux-research', courseraCourseId: 'U7e_Lgp-EeubJBIM7h4jow' },
      { kind: 'coursera', courseraSlug: 'high-fidelity-designs-prototype', courseraCourseId: 'W5kcLAp-Eeua7xKR7OK1aw' },
      { kind: 'coursera', courseraSlug: 'responsive-web-design-adobe-xd', courseraCourseId: 'YLwdQgp-Eeu0VAqNda9Xjw' },
      { kind: 'coursera', courseraSlug: 'ux-design-jobs', courseraCourseId: 'coP2hgp-Eeuh2QpCvqFzYQ' },
      {
        kind: 'workforceap',
        courseSlug: 'ux-ui-lab-project-test-preparation',
        syllabusCourseName: 'Lab, Project, and Test Preparation',
        legacyCourseSlugs: ['ux-design-professional-certificate-google-course-8'],
      },
    ],
  },
  {
    programSlug: 'data-science-professional-certificate-ibm',
    version: APPROVED_CURRICULUM_VERSION,
    syllabusSha256: 'f1c3f8eb3838bc76bc7863b72ab7245ca5f632131cde28775f1b212037a1289f',
    expectedCourseCount: 9,
    expectedProviderCourseCount: 9,
    externalTrack: { status: 'pending', collectionId: null, assignmentMode: 'disabled' },
    bindings: [
      {
        kind: 'coursera',
        courseraSlug: 'introduction-to-data-engineering',
        courseraCourseId: 'zQV3KCOCEeui6AoQjSZBrQ',
        legacyCourseSlugs: ['data-science-professional-certificate-ibm-course-2'],
      },
      { kind: 'coursera', courseraSlug: 'introduction-to-relational-databases', courseraCourseId: 'qNrWFjDlEeua-goM8-0Q8w' },
      { kind: 'coursera', courseraSlug: 'sql-data-science', courseraCourseId: 'GDQMSxDWEeitFhJL4G-A_g' },
      { kind: 'coursera', courseraSlug: 'python-for-applied-data-science-ai', courseraCourseId: 'ejOz7RDUEei99hK0xs-tsg' },
      { kind: 'coursera', courseraSlug: 'hands-on-introduction-to-linux-commands-and-shell-scripting', courseraCourseId: 'B_rci897EeufchLeGgZGZQ' },
      { kind: 'coursera', courseraSlug: 'etl-and-data-pipelines-shell-airflow-kafka', courseraCourseId: 'gaD7sM97EeuHgw5SCcDQSQ' },
      { kind: 'coursera', courseraSlug: 'data-warehouse-fundamentals', courseraCourseId: 'xdMr0c97EeuHgw5SCcDQSQ' },
      {
        kind: 'coursera',
        courseraSlug: 'relational-database-administration',
        courseraCourseId: 'XXZBGc97EeufchLeGgZGZQ',
        legacyCourseSlugs: ['data-science-professional-certificate-ibm-course-8'],
      },
      {
        kind: 'coursera',
        courseraSlug: 'relational-database-administration-capstone-project',
        courseraCourseId: 'V2tYXNFWEe-3_Q7tYtYdfw',
        legacyCourseSlugs: ['data-science-professional-certificate-ibm-course-9'],
      },
    ],
  },
  {
    programSlug: 'data-analytics-professional-certificate-google',
    version: APPROVED_CURRICULUM_VERSION,
    syllabusSha256: '49079c1479a516089f3a374dbcbc35dc2b0b267eb99c22b22db93ea9777a41af',
    expectedCourseCount: 11,
    expectedProviderCourseCount: 10,
    externalTrack: { status: 'pending', collectionId: null, assignmentMode: 'disabled' },
    bindings: [
      {
        kind: 'coursera',
        courseraSlug: 'introduction-to-management-consulting',
        courseraCourseId: '1psdSVOIEeyc0w4h2jEFEQ',
        legacyCourseSlugs: ['data-analytics-professional-certificate-google-course-1'],
      },
      {
        kind: 'coursera',
        courseraSlug: 'introduction-to-business-analysis',
        courseraCourseId: 'zPU_kmRfEe-e0g4kKcdYJQ',
        legacyCourseSlugs: ['data-analytics-professional-certificate-google-course-2'],
      },
      { kind: 'coursera', courseraSlug: 'project-stakeholder-and-requirements-management-fundamentals', courseraCourseId: 'ma9Rl54ZEfCkjBKc1V0Qpw' },
      { kind: 'coursera', courseraSlug: 'business-strategy-creating-competitive-advantage', courseraCourseId: 'RrWSGy5yEfGRiRLMJS1FiQ' },
      { kind: 'coursera', courseraSlug: 'financial-analysis-and-modeling', courseraCourseId: 'CGp8Nj4JEfGj6wr_-5C2xw' },
      { kind: 'coursera', courseraSlug: 'foundations-data', courseraCourseId: 'kvb6uMbTEeqZOA5eKDHL-w' },
      { kind: 'coursera', courseraSlug: 'ask-questions-make-decisions', courseraCourseId: 'ZEB-Lgp9Eeun_RJEc0KNDw' },
      { kind: 'coursera', courseraSlug: 'data-visualization-dashboards-excel-cognos', courseraCourseId: 'NRRbf9zWEeqPZRKxGtAxBQ' },
      { kind: 'coursera', courseraSlug: 'generative-ai-transform-your-management-consulting', courseraCourseId: 'xZqTjNaNEfC69hJmAzZJ9w' },
      { kind: 'coursera', courseraSlug: 'capstone-integrated-management-consulting-project', courseraCourseId: '0_J99TlPEfGP5A7qtRBM-w' },
      {
        kind: 'workforceap',
        courseSlug: 'management-data-analytics-lab-workforce-readiness',
        syllabusCourseName: 'Management & Data Analytics Lab and Workforce Readiness',
        legacyCourseSlugs: ['data-analytics-professional-certificate-google-course-13'],
      },
    ],
  },
] as const;

export const APPROVED_PROGRAM_CURRICULA: readonly ProgramCurriculumManifest[] =
  Object.freeze(DEFINITIONS.map(materializeManifest));

const MANIFEST_BY_PROGRAM_VERSION = new Map(
  APPROVED_PROGRAM_CURRICULA.map((manifest) => [
    `${manifest.programSlug}|${manifest.version}`,
    manifest,
  ]),
);

export function getProgramCurriculumManifest(
  programSlug: string | null | undefined,
  version: string | null | undefined = APPROVED_CURRICULUM_VERSION,
): ProgramCurriculumManifest | null {
  const normalizedProgramSlug = programSlug?.trim().toLowerCase();
  const normalizedVersion = version?.trim();
  if (!normalizedProgramSlug || !normalizedVersion) return null;
  return MANIFEST_BY_PROGRAM_VERSION.get(`${normalizedProgramSlug}|${normalizedVersion}`) ?? null;
}

export function getApprovedCurriculumCourseAliases(
  programSlug: string,
  version: string = APPROVED_CURRICULUM_VERSION,
): ReadonlyMap<string, string> {
  const manifest = getProgramCurriculumManifest(programSlug, version);
  const aliases = new Map<string, string>();
  for (const course of manifest?.courses ?? []) {
    for (const legacySlug of course.legacyCourseSlugs) aliases.set(legacySlug, course.slug);
  }
  return aliases;
}

export function isExternalCurriculumTrackReady(
  track: ProgramCurriculumManifest['externalTrack'] | null | undefined,
): boolean {
  return Boolean(
    track?.status === 'validated' &&
    typeof track.collectionId === 'string' &&
    track.collectionId.trim().length > 0,
  );
}

export function isApprovedCurriculumReadyForAssignment(
  programSlug: string | null | undefined,
): boolean {
  const track = getProgramCurriculumManifest(programSlug)?.externalTrack;
  return isExternalCurriculumTrackAssignmentReady(track);
}

export function isApprovedCurriculumReadyForCanary(
  programSlug: string | null | undefined,
): boolean {
  const track = getProgramCurriculumManifest(programSlug)?.externalTrack;
  return isExternalCurriculumTrackAssignmentReady(track, { explicitCanary: true });
}

export function isExternalCurriculumTrackAssignmentReady(
  track: ProgramCurriculumManifest['externalTrack'] | null | undefined,
  options: { explicitCanary?: boolean } = {},
): boolean {
  return isExternalCurriculumTrackReady(track)
    && (
      track?.assignmentMode === 'enabled'
      || (options.explicitCanary === true && track?.assignmentMode === 'canary')
    );
}
