/**
 * Attribute Coursera B4B enrollment rows to Learning Paths.
 *
 * Two questions, both answered from the feed itself plus the registry in
 * `lib/content/coursera/learningPaths.ts`:
 *
 *   1. Is this row the path itself (program-level progress) rather than a
 *      course? → `matchLearningPathReport`
 *   2. Which path was this course taken under, and which WAP program is that?
 *      → `resolveReportCollection`
 *
 * Collection ids are short opaque tokens that only the feed exposes. A path's
 * own row carries its collection id, so one pass over a batch teaches the
 * index every collection it needs before course rows are attributed
 * (`withLearnedCollections`). Pure; no Prisma or `server-only`.
 */
import {
  addLearningPathToIndex,
  buildLearningPathIndex,
  cloneLearningPathIndex,
  findLearningPathByCollection,
  findLearningPathById,
  isLearningPathContentType,
  learningPathProgramSlug,
  type CourseraLearningPath,
  type LearningPathIndex,
} from '@/lib/content/coursera/learningPaths';
import { normalizeCourseraCourseId } from '@/lib/content/programCurriculumManifest';

export type LearningPathReportLike = {
  contentId: string;
  contentType?: string | null;
  contentName?: string | null;
  collectionId?: string | null;
  collectionName?: string | null;
};

export type LearningPathMatch = {
  path: CourseraLearningPath;
  /** False when the row is a path by `contentType` but the id is not registered. */
  known: boolean;
  /** Canonical WAP program, or null while the path is unresolved / unknown. */
  programSlug: string | null;
};

export type CollectionResolution = {
  path: CourseraLearningPath;
  programSlug: string | null;
};

function syntheticPath(report: LearningPathReportLike): CourseraLearningPath {
  return {
    learningPathId: normalizeCourseraCourseId(report.contentId),
    name: report.contentName?.trim() || report.contentId.trim(),
    programSlug: null,
    collectionId: report.collectionId?.trim() || undefined,
    unverified: true,
    note: 'Seen on the live feed but not registered in lib/content/coursera/learningPaths.ts.',
  };
}

/**
 * Decide whether an enrollment row is a Learning Path row. Registered ids win
 * regardless of `contentType` (the canonical table once held a path id as a
 * "course"); an unregistered id counts only when B4B labels it as a path.
 */
export function matchLearningPathReport(
  report: LearningPathReportLike,
  index: LearningPathIndex = buildLearningPathIndex(),
): LearningPathMatch | null {
  const known = findLearningPathById(report.contentId, index);
  if (known) {
    return { path: known, known: true, programSlug: learningPathProgramSlug(known) };
  }
  if (isLearningPathContentType(report.contentType) && normalizeCourseraCourseId(report.contentId)) {
    return { path: syntheticPath(report), known: false, programSlug: null };
  }
  return null;
}

/**
 * Teach a copy of the index every collection id the batch reveals. Only a
 * path's own row is trusted to bind `collectionId` → path; a course row's
 * collection is what we are trying to resolve, never evidence.
 */
export function withLearnedCollections(
  reports: Iterable<LearningPathReportLike>,
  base: LearningPathIndex = buildLearningPathIndex(),
): LearningPathIndex {
  const index = cloneLearningPathIndex(base);
  for (const report of reports) {
    const collectionId = report.collectionId?.trim();
    if (!collectionId || index.byCollectionId.has(collectionId)) continue;
    const match = matchLearningPathReport(report, index);
    if (!match) continue;
    addLearningPathToIndex(index, { ...match.path, collectionId });
  }
  return index;
}

/** For a course row: the path it was taken under and that path's WAP program. */
export function resolveReportCollection(
  report: Pick<LearningPathReportLike, 'collectionId' | 'collectionName'>,
  index: LearningPathIndex = buildLearningPathIndex(),
): CollectionResolution | null {
  const path = findLearningPathByCollection(report, index);
  return path ? { path, programSlug: learningPathProgramSlug(path) } : null;
}

/**
 * The `program_slug` a raw `coursera_course_progress` row should carry.
 * Coursera's own statement of where the learner is (the path) outranks our
 * inference from course mappings, which outranks the umbrella program.
 */
export function rawProgressProgramSlug(args: {
  learningPath: LearningPathMatch | null;
  collectionProgramSlug: string | null;
  targetProgramSlug: string | null | undefined;
  fallbackProgramSlug: string;
}): string {
  if (args.learningPath) return args.learningPath.programSlug ?? args.fallbackProgramSlug;
  return args.collectionProgramSlug ?? args.targetProgramSlug ?? args.fallbackProgramSlug;
}
