/**
 * Read-only Coursera catalog coverage report.
 *
 * Compares the Curriculum download (`curatedCollections`), the Learning Path
 * registry (`learningPaths`), and the committed discovered catalog
 * (`courseraDiscoveredCatalog`) so admins can see course-list drift without a
 * live Coursera API call. Pure; safe for `node --test`.
 */
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { normalizeCourseraCourseId } from '@/lib/content/programCurriculumManifest';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';

import { CURATED_COLLECTIONS } from './curatedCollections';
import {
  COURSERA_LEARNING_PATHS,
  type CourseraLearningPath,
} from './learningPaths';

export type CatalogCoverageIssue =
  | 'missing_learning_path_id'
  | 'missing_discovered_catalog'
  | 'discovered_missing_curated_courses'
  | 'discovered_extra_courses'
  | 'unverified_path';

export type CatalogCoverageRow = {
  collectionId: string;
  name: string;
  programSlug: string | null;
  learningPathId: string | null;
  curatedCourseCount: number;
  discoveredCourseCount: number | null;
  curatedOnlyCourseIds: readonly string[];
  discoveredOnlyCourseIds: readonly string[];
  issues: readonly CatalogCoverageIssue[];
};

export type CatalogCoverageSummary = {
  pathCount: number;
  pathsWithIssues: number;
  missingLearningPathIds: number;
  missingDiscoveredCatalog: number;
  pathsWithCourseDrift: number;
};

export type CatalogCoverageReport = {
  rows: readonly CatalogCoverageRow[];
  summary: CatalogCoverageSummary;
};

function courseIdSet(ids: Iterable<string | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const raw of ids) {
    const id = normalizeCourseraCourseId(raw);
    if (id) out.add(id);
  }
  return out;
}

function sortedIds(ids: Iterable<string>): string[] {
  return [...ids].sort((a, b) => a.localeCompare(b));
}

function discoveredCourseIdsForProgram(programSlug: string | null): Set<string> | null {
  if (!programSlug) return null;
  const canonical = canonicalizeProgramSlug(programSlug);
  const entry =
    DISCOVERED_COURSERA_PROGRAMS[canonical] ?? DISCOVERED_COURSERA_PROGRAMS[programSlug];
  if (!entry) return null;
  return courseIdSet(entry.courses.map((course) => course.courseId));
}

function curatedCourseIdsForCollection(collectionId: string): Set<string> {
  const collection = CURATED_COLLECTIONS.find((row) => row.collectionId === collectionId);
  if (!collection) return new Set();
  return courseIdSet(collection.courses.map((course) => course.courseId));
}

export function buildCatalogCoverageRow(path: CourseraLearningPath): CatalogCoverageRow {
  const curatedIds = curatedCourseIdsForCollection(path.collectionId);
  const discoveredIds = discoveredCourseIdsForProgram(path.programSlug);

  const curatedOnly = new Set<string>();
  const discoveredOnly = new Set<string>();
  if (discoveredIds) {
    for (const id of curatedIds) {
      if (!discoveredIds.has(id)) curatedOnly.add(id);
    }
    for (const id of discoveredIds) {
      if (!curatedIds.has(id)) discoveredOnly.add(id);
    }
  }

  const issues: CatalogCoverageIssue[] = [];
  if (!path.learningPathId) issues.push('missing_learning_path_id');
  if (path.unverified) issues.push('unverified_path');
  if (discoveredIds === null) {
    issues.push('missing_discovered_catalog');
  } else {
    if (curatedOnly.size > 0) issues.push('discovered_missing_curated_courses');
    if (discoveredOnly.size > 0) issues.push('discovered_extra_courses');
  }

  return {
    collectionId: path.collectionId,
    name: path.name,
    programSlug: path.programSlug,
    learningPathId: path.learningPathId,
    curatedCourseCount: curatedIds.size,
    discoveredCourseCount: discoveredIds ? discoveredIds.size : null,
    curatedOnlyCourseIds: Object.freeze(sortedIds(curatedOnly)),
    discoveredOnlyCourseIds: Object.freeze(sortedIds(discoveredOnly)),
    issues: Object.freeze(issues),
  };
}

export function buildCatalogCoverageReport(
  paths: readonly CourseraLearningPath[] = COURSERA_LEARNING_PATHS,
): CatalogCoverageReport {
  const rows = Object.freeze(paths.map(buildCatalogCoverageRow));
  let missingLearningPathIds = 0;
  let missingDiscoveredCatalog = 0;
  let pathsWithCourseDrift = 0;
  let pathsWithIssues = 0;

  for (const row of rows) {
    if (row.issues.length > 0) pathsWithIssues += 1;
    if (row.issues.includes('missing_learning_path_id')) missingLearningPathIds += 1;
    if (row.issues.includes('missing_discovered_catalog')) missingDiscoveredCatalog += 1;
    if (
      row.issues.includes('discovered_missing_curated_courses') ||
      row.issues.includes('discovered_extra_courses')
    ) {
      pathsWithCourseDrift += 1;
    }
  }

  return {
    rows,
    summary: {
      pathCount: rows.length,
      pathsWithIssues,
      missingLearningPathIds,
      missingDiscoveredCatalog,
      pathsWithCourseDrift,
    },
  };
}

export function catalogCoverageIssueLabel(issue: CatalogCoverageIssue): string {
  switch (issue) {
    case 'missing_learning_path_id':
      return 'Missing Learning Path id';
    case 'missing_discovered_catalog':
      return 'No discovered catalog entry';
    case 'discovered_missing_curated_courses':
      return 'Discovered catalog missing curated courses';
    case 'discovered_extra_courses':
      return 'Discovered catalog has extra courses';
    case 'unverified_path':
      return 'Unverified on live feed';
    default: {
      const _exhaustive: never = issue;
      return _exhaustive;
    }
  }
}
