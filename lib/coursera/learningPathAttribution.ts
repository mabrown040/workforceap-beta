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
 * Collection ids are short opaque tokens. The registry knows every collection
 * the org's Curriculum download lists; a path's own row also carries its
 * collection id, so one pass over a batch teaches the index any collection
 * created since the download (`withLearnedCollections`). A course row that
 * arrives with no collection at all falls back to curated membership, and only
 * when exactly one collection lists the course. Pure; no Prisma or `server-only`.
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
import { uniqueCuratedCollectionForCourse } from '@/lib/content/coursera/curatedCollections';
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
  /**
   * True when the row named no collection and the path was inferred from
   * curated membership (the course is listed by exactly one collection).
   */
  inferred: boolean;
};

function syntheticPath(report: LearningPathReportLike): CourseraLearningPath {
  return {
    learningPathId: normalizeCourseraCourseId(report.contentId),
    name: report.contentName?.trim() || report.contentId.trim(),
    programSlug: null,
    collectionId: report.collectionId?.trim() ?? '',
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

/**
 * For a course row: the path it was taken under and that path's WAP program.
 *
 * The row's own `collectionId` / `collectionName` is authoritative. A row that
 * names a collection the registry does not know resolves to nothing rather
 * than to a guess. Only a row with no collection information at all falls
 * back to the Curriculum download, and only when exactly one collection lists
 * the course; the thirteen shared courses stay unresolved.
 */
export function resolveReportCollection(
  report: Pick<LearningPathReportLike, 'collectionId' | 'collectionName'> & { contentId?: string | null },
  index: LearningPathIndex = buildLearningPathIndex(),
): CollectionResolution | null {
  const path = findLearningPathByCollection(report, index);
  if (path) return { path, programSlug: learningPathProgramSlug(path), inferred: false };
  if (report.collectionId?.trim() || report.collectionName?.trim()) return null;

  const curated = uniqueCuratedCollectionForCourse(report.contentId);
  const byMembership = curated ? index.byCollectionId.get(curated.collectionId) : undefined;
  return byMembership
    ? { path: byMembership, programSlug: learningPathProgramSlug(byMembership), inferred: true }
    : null;
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
