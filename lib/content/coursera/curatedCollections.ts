/**
 * Read-side helpers over `curatedCollections.generated.ts`, the org's Coursera
 * Curriculum download rendered as code (see `curatedCollectionsCsv.ts`).
 *
 * Membership answers one question ingestion cannot answer from a course row
 * alone: which collection(s) list this course? Thirteen courses are shared by
 * two collections, so callers must treat "more than one" as unknown rather
 * than guess. Pure; safe for `node --test`.
 */
import { normalizeCourseraCourseId } from '@/lib/content/programCurriculumManifest';

import { CURATED_COLLECTIONS, CURATED_COLLECTIONS_SOURCE } from './curatedCollections.generated';
import type { CuratedCollection, CuratedCourse } from './curatedCollectionsCsv';

export { CURATED_COLLECTIONS, CURATED_COLLECTIONS_SOURCE };
export type { CuratedCollection, CuratedCourse };

const BY_COLLECTION_ID: ReadonlyMap<string, CuratedCollection> = new Map(
  CURATED_COLLECTIONS.map((collection) => [collection.collectionId, collection]),
);

const COLLECTIONS_BY_COURSE_ID: ReadonlyMap<string, readonly CuratedCollection[]> = (() => {
  const index = new Map<string, CuratedCollection[]>();
  for (const collection of CURATED_COLLECTIONS) {
    for (const course of collection.courses) {
      const list = index.get(course.courseId) ?? [];
      list.push(collection);
      index.set(course.courseId, list);
    }
  }
  return index;
})();

export function findCuratedCollection(collectionId: string | null | undefined): CuratedCollection | null {
  const id = collectionId?.trim();
  return id ? BY_COLLECTION_ID.get(id) ?? null : null;
}

/** Every collection that lists the course; tolerates `Course~` / `Specialization~` prefixes. */
export function curatedCollectionsForCourse(courseId: string | null | undefined): readonly CuratedCollection[] {
  const id = normalizeCourseraCourseId(courseId);
  return id ? COLLECTIONS_BY_COURSE_ID.get(id) ?? [] : [];
}

/** The one collection that lists the course, or null when none or several do. */
export function uniqueCuratedCollectionForCourse(courseId: string | null | undefined): CuratedCollection | null {
  const collections = curatedCollectionsForCourse(courseId);
  return collections.length === 1 ? collections[0] : null;
}

export function isCuratedCourseInCollection(
  courseId: string | null | undefined,
  collectionId: string | null | undefined,
): boolean {
  const id = collectionId?.trim();
  return Boolean(id) && curatedCollectionsForCourse(courseId).some((collection) => collection.collectionId === id);
}

/** Course ids that appear in more than one collection: never attribute these by membership. */
export const SHARED_CURATED_COURSE_IDS: readonly string[] = Object.freeze(
  [...COLLECTIONS_BY_COURSE_ID.entries()]
    .filter(([, collections]) => collections.length > 1)
    .map(([courseId]) => courseId),
);
