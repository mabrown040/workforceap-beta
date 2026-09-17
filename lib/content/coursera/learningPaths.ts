/**
 * Coursera Learning Paths ("collections") that carry WorkforceAP programs.
 *
 * Coursera For Business exposes one umbrella program for the org ("Workforce
 * Advancement Project"). Every WAP program lives inside it as a Learning Path.
 * The enrollmentReports feed reports that path in two ways:
 *
 *   - as its own row, whose `contentId` is the path's 22-character id and whose
 *     `overallProgress` is Coursera's program-level completion; and
 *   - on every course row, as `collectionId` / `collectionName`, naming the path
 *     the learner took that course under.
 *
 * Neither fact was used before this registry existed: path rows landed in the
 * umbrella program as "unknown courses", and shared courses were attributed by
 * guessing among the programs that list them. This module is the one place
 * that knows path → WAP program. It is pure so ingestion code and `node --test`
 * can import it without the Prisma / `server-only` chain.
 *
 * Provenance (all 2026-09-17): path ids come from `courseraDiscoveredCatalog.ts`
 * (`learningPathId`); the six collection ids and the B4B display names were
 * read from live `coursera_course_progress` rows; Coursera path slugs came from
 * a read-only pass over the Coursera admin UI. Paths marked `unverified` have
 * never been seen on the live feed. Update this list when a path is created or
 * renamed in the Coursera admin UI.
 */
import { normalizeCourseraCourseId } from '@/lib/content/programCurriculumManifest';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';

export type CourseraLearningPath = {
  /** Path id as enrollmentReports `contentId` and the admin URL report it. */
  learningPathId: string;
  /** Display name as B4B reports it on the path's own row (`contentName`). */
  name: string;
  /** Other spellings B4B has used for the same path (e.g. as `collectionName`). */
  aliases?: readonly string[];
  /** Canonical WAP program slug, or null while the path has no WAP home. */
  programSlug: string | null;
  /** Short collection id seen on enrollment rows; learned from the live feed. */
  collectionId?: string;
  /** Coursera URL slug of the path, from the admin UI. */
  courseraSlug?: string;
  /** True when the id has not yet been observed on the live enrollment feed. */
  unverified?: boolean;
  note?: string;
};

export const COURSERA_LEARNING_PATHS: readonly CourseraLearningPath[] = Object.freeze([
  {
    learningPathId: 'vjCRy6uOReCwkcurjsXg3Q',
    name: 'AI Practitioner Professional Certificate',
    programSlug: 'ai-practitioner-professional-certificate-aws',
    collectionId: '0TmQl',
    courseraSlug: 'ai-practitioner-professional-learning-path-z271k',
    note:
      'Distinct from the IBM "AI and Software Developer" path (16 courses each). The WAP program row is still titled "AI Professional Developer Certificate (IBM)"; that title belongs to the other path.',
  },
  {
    learningPathId: 'fT-1P-CkT6q_tT_gpM-qJw',
    name: 'AI and Software Developer Professional Certificate (IBM)',
    programSlug: 'software-developer-professional-certificate-ibm',
    collectionId: '6m4yZ',
    courseraSlug: 'software-developer-professional-certificate-ibm-drln2',
    note: 'The WAP identifier drops the leading "AI and"; Coursera keeps it.',
  },
  {
    learningPathId: 'o9PJJ-ReQ_KTySfkXuPyHw',
    name: 'IT Support Professional Certificate (IBM)',
    programSlug: 'it-support-professional-certificate-ibm',
    collectionId: '0lodU',
  },
  {
    learningPathId: 'vaH4UkrHSKSh-FJKxxik4Q',
    name: 'Project Management Professional Certificate (Microsoft)',
    programSlug: 'project-management-professional-certificate-microsoft',
    collectionId: '1cvGr',
  },
  {
    learningPathId: 'iMhjZsGTRkSIY2bBk-ZEhA',
    // "Heath" is Coursera's spelling on the live feed; keep it so exact-name
    // matches on `collectionName` succeed.
    name: 'Medical Billing, Coding, and Heath Information Technician Certificate (MBCHIT)',
    aliases: ['Medical Billing, Coding, and Health Information Technician Certificate (MBCHIT)'],
    programSlug: 'health-information-technology-mchit',
    collectionId: 'CRbEJ',
  },
  {
    learningPathId: 'gCtwKvPFS36rcCrzxSt-Yg',
    name: 'Networking and Cybersecurity Professional Certificate (CompTIA Net+,Sec+)',
    aliases: ['Cybersecurity and Networking Professional Certificate (Net+,Sec+)'],
    // Coursera runs Network+ and Security+ as ONE combined path. WAP sells
    // them as two programs, so this path has no single WAP home yet. Leaving
    // it unresolved keeps attribution honest: rows under it stay raw-only
    // instead of being credited to a program by guess.
    programSlug: null,
    collectionId: '81uci',
    note: 'Needs a product decision: a combined WAP program, or a per-course split between CompTIA Network+ and Security+.',
  },
  {
    learningPathId: 'C-5mIgyaSLGuZiIMmrixWg',
    name: 'CompTIA A+ Professional Certificate',
    programSlug: 'comptia-a-professional-certificate',
    courseraSlug: 'comptia-a-professional-certificate-pathway-b0aco',
    unverified: true,
  },
  {
    learningPathId: 'Wj6KdjQrQfm-inY0K6H5xg',
    name: 'Data Science Professional Certificate (IBM)',
    programSlug: 'data-science-professional-certificate-ibm',
    unverified: true,
  },
  {
    learningPathId: 'Dz4BBgGAS1i-AQYBgLtYgA',
    name: 'Data Analytics Professional Certificate (Google)',
    programSlug: 'data-analytics-professional-certificate-google',
    unverified: true,
  },
  {
    learningPathId: 'Xvd7I_wBSNO3eyP8AXjTfA',
    name: 'Digital Marketing & E-Commerce Professional Certificate (Google)',
    programSlug: 'digital-marketing-e-commerce-google',
    unverified: true,
  },
  {
    learningPathId: 'rrX4ZPagR5K1-GT2oGeS9Q',
    name: 'UX Design Professional Certificate (Google)',
    programSlug: 'ux-design-professional-certificate-google',
    unverified: true,
  },
  {
    learningPathId: 'q5z39pYDSM6c9_aWA4jOLw',
    name: 'AWS Cloud Technology (Amazon)',
    programSlug: 'aws-cloud-technology-amazon',
    unverified: true,
  },
  {
    learningPathId: 'QnQ2KKmHTmu0Niiphy5rsQ',
    name: 'IT Automation with Python (Google)',
    programSlug: 'it-automation-with-python-google',
    unverified: true,
  },
  {
    learningPathId: 'Qkse5-KHSUyLHufih3lMPg',
    name: 'CompTIA Network+ Professional Certificate',
    programSlug: 'comptia-network-professional-certificate',
    unverified: true,
    note: 'Coursera may deliver Network+ only through the combined Net+/Sec+ path above; this separate id has not been seen on the feed.',
  },
  {
    learningPathId: 'p4o8q6jBSOOKPKuowQjjFw',
    name: 'CompTIA Security+ Professional Certificate',
    programSlug: 'comptia-security-professional-certificate',
    unverified: true,
    note: 'See the Network+ entry; the combined Net+/Sec+ path is the one the live feed shows.',
  },
]);

/**
 * `contentType` values B4B uses for a path-level enrollment row. Compared
 * case-insensitively; a course row reports `Course`.
 */
export const LEARNING_PATH_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'specialization',
  'learningpath',
  'learning_path',
  'learning-path',
  's12n',
]);

export function isLearningPathContentType(contentType: string | null | undefined): boolean {
  if (typeof contentType !== 'string') return false;
  return LEARNING_PATH_CONTENT_TYPES.has(contentType.trim().toLowerCase());
}

/** Exact-name matching tolerates case and whitespace only; spelling is data. */
export function normalizeLearningPathName(name: string | null | undefined): string {
  return typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
}

export type LearningPathIndex = {
  byId: Map<string, CourseraLearningPath>;
  byCollectionId: Map<string, CourseraLearningPath>;
  byName: Map<string, CourseraLearningPath>;
};

export function buildLearningPathIndex(
  paths: readonly CourseraLearningPath[] = COURSERA_LEARNING_PATHS,
): LearningPathIndex {
  const index: LearningPathIndex = {
    byId: new Map(),
    byCollectionId: new Map(),
    byName: new Map(),
  };
  for (const path of paths) addLearningPathToIndex(index, path);
  return index;
}

export function addLearningPathToIndex(index: LearningPathIndex, path: CourseraLearningPath): void {
  const id = normalizeCourseraCourseId(path.learningPathId);
  if (!id) return;
  index.byId.set(id, path);
  if (path.collectionId) index.byCollectionId.set(path.collectionId.trim(), path);
  for (const name of [path.name, ...(path.aliases ?? [])]) {
    const key = normalizeLearningPathName(name);
    if (key && !index.byName.has(key)) index.byName.set(key, path);
  }
}

export function cloneLearningPathIndex(index: LearningPathIndex): LearningPathIndex {
  return {
    byId: new Map(index.byId),
    byCollectionId: new Map(index.byCollectionId),
    byName: new Map(index.byName),
  };
}

/** Look a path up by its content id, tolerating `Course~` / `Specialization~` prefixes. */
export function findLearningPathById(
  contentId: string | null | undefined,
  index: LearningPathIndex = DEFAULT_INDEX,
): CourseraLearningPath | null {
  const id = normalizeCourseraCourseId(contentId);
  return id ? index.byId.get(id) ?? null : null;
}

/** Resolve the path a course row was taken under: collection id first, then exact name. */
export function findLearningPathByCollection(
  collection: { collectionId?: string | null; collectionName?: string | null },
  index: LearningPathIndex = DEFAULT_INDEX,
): CourseraLearningPath | null {
  const collectionId = collection.collectionId?.trim();
  if (collectionId) {
    const byId = index.byCollectionId.get(collectionId);
    if (byId) return byId;
  }
  const nameKey = normalizeLearningPathName(collection.collectionName);
  return nameKey ? index.byName.get(nameKey) ?? null : null;
}

/** The canonical WAP program a path belongs to, or null while unresolved. */
export function learningPathProgramSlug(path: CourseraLearningPath | null | undefined): string | null {
  const slug = path?.programSlug?.trim();
  return slug ? canonicalizeProgramSlug(slug) : null;
}

/** Every registered path id, for SQL exclusions and seeder guards. */
export const KNOWN_LEARNING_PATH_IDS: readonly string[] = Object.freeze(
  COURSERA_LEARNING_PATHS.map((path) => path.learningPathId),
);

const DEFAULT_INDEX = buildLearningPathIndex();
