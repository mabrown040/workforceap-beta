import {
  APPROVED_CURRICULUM_VERSION,
  getProgramCurriculumManifest,
  normalizeCourseraCourseId,
} from '@/lib/content/programCurriculumManifest';

export type ProviderContent = {
  id: string;
  slug?: string | null;
  name?: string | null;
  contentType?: string | null;
};

export type ProviderTrack = {
  id: string;
  courses: ProviderContent[];
};

export type ApprovedCurriculumTrackValidation = {
  programSlug: string;
  curriculumVersion: string;
  collectionId: string;
  expectedProviderIds: string[];
  actualProviderIds: string[];
  missingProviderIds: string[];
  extraProviderIds: string[];
  duplicateProviderIds: string[];
  nonCourseContents: Array<{ id: string; contentType: string }>;
  orderMatches: boolean;
  exactMatch: boolean;
};

export type ApprovedCurriculumCatalogValidation = {
  programSlug: string;
  curriculumVersion: string;
  expectedProviderCourses: Array<{ id: string; slug: string }>;
  matchedProviderCourses: Array<{
    id: string;
    expectedSlug: string;
    providerSlug: string | null;
    providerName: string | null;
    contentType: string;
  }>;
  missingProviderIds: string[];
  duplicateProviderIds: string[];
  nonCourseContents: Array<{ id: string; contentType: string }>;
  providerSlugDrift: Array<{
    id: string;
    expectedSlug: string;
    providerSlug: string | null;
  }>;
  exactMappingValid: boolean;
};

type B4BValidationPage<T> = {
  elements: readonly T[];
  paging?: { next?: number; total?: number };
};

/** Drain every provider page or throw; a partial catalog can never be proof. */
export async function drainB4BValidationPages<T>(
  loadPage: (args: { start: number; limit: number }) => Promise<B4BValidationPage<T>>,
  options: { pageLimit?: number; safetyCap?: number } = {},
): Promise<{ elements: T[]; pagesFetched: number }> {
  const pageLimit = options.pageLimit ?? 1000;
  const safetyCap = options.safetyCap ?? 1000;
  if (!Number.isInteger(pageLimit) || pageLimit <= 0) {
    throw new Error('B4B validation pageLimit must be a positive integer');
  }
  if (!Number.isInteger(safetyCap) || safetyCap <= 0) {
    throw new Error('B4B validation safetyCap must be a positive integer');
  }

  const elements: T[] = [];
  const visitedStarts = new Set<number>();
  let start = 0;

  for (let pagesFetched = 1; pagesFetched <= safetyCap; pagesFetched += 1) {
    if (visitedStarts.has(start)) {
      throw new Error(`B4B validation pagination repeated offset ${start}`);
    }
    visitedStarts.add(start);
    const page = await loadPage({ start, limit: pageLimit });
    const pageElements = Array.from(page.elements);
    elements.push(...pageElements);
    const total = page.paging?.total;
    const inferredNext = start + pageElements.length;

    if (pageElements.length === 0) {
      if (Number.isFinite(total) && total != null && start < total) {
        throw new Error('B4B validation pagination ended before its reported total');
      }
      return { elements, pagesFetched };
    }

    const reportedNext = page.paging?.next;
    if (reportedNext != null) {
      if (!Number.isInteger(reportedNext) || reportedNext <= start) {
        throw new Error(`B4B validation pagination returned invalid next offset ${reportedNext}`);
      }
      start = reportedNext;
    } else if (Number.isFinite(total) && total != null && inferredNext < total) {
      start = inferredNext;
    } else if (pageElements.length >= pageLimit) {
      start = inferredNext;
    } else {
      return { elements, pagesFetched };
    }

    if (pagesFetched === safetyCap) {
      throw new Error(`B4B validation pagination exceeded ${safetyCap} pages`);
    }
  }

  throw new Error('B4B validation pagination did not terminate');
}

/**
 * Prove each approved provider binding against the organization-wide B4B
 * catalog. Catalog extras are intentionally irrelevant: this validates the
 * course identities, not membership in a particular learning path.
 */
export function validateApprovedCurriculumCatalog(args: {
  programSlug: string;
  providerContents: readonly ProviderContent[];
}): ApprovedCurriculumCatalogValidation {
  const manifest = getProgramCurriculumManifest(
    args.programSlug,
    APPROVED_CURRICULUM_VERSION,
  );
  if (!manifest) throw new Error(`No approved curriculum manifest for ${args.programSlug}`);

  const expectedProviderCourses = manifest.courses
    .filter((course) => course.kind === 'coursera')
    .map((course) => ({
      id: normalizeCourseraCourseId(course.courseraCourseId),
      slug: course.courseraSlug!,
    }));
  const providerById = new Map<string, ProviderContent[]>();
  for (const content of args.providerContents) {
    const id = normalizeCourseraCourseId(content.id);
    if (!id) continue;
    const rows = providerById.get(id) ?? [];
    rows.push(content);
    providerById.set(id, rows);
  }

  const missingProviderIds: string[] = [];
  const duplicateProviderIds: string[] = [];
  const nonCourseContents: Array<{ id: string; contentType: string }> = [];
  const providerSlugDrift: ApprovedCurriculumCatalogValidation['providerSlugDrift'] = [];
  const matchedProviderCourses: ApprovedCurriculumCatalogValidation['matchedProviderCourses'] = [];

  for (const expected of expectedProviderCourses) {
    const matches = providerById.get(expected.id) ?? [];
    if (matches.length === 0) {
      missingProviderIds.push(expected.id);
      continue;
    }
    if (matches.length > 1) duplicateProviderIds.push(expected.id);
    const provider = matches[0]!;
    const contentType = provider.contentType?.trim() || 'Unknown';
    const providerSlug = provider.slug?.trim() || null;
    matchedProviderCourses.push({
      id: expected.id,
      expectedSlug: expected.slug,
      providerSlug,
      providerName: provider.name?.trim() || null,
      contentType,
    });
    for (const match of matches) {
      const matchType = match.contentType?.trim() || 'Unknown';
      const matchSlug = match.slug?.trim() || null;
      if (matchType.toLowerCase() !== 'course') {
        nonCourseContents.push({ id: expected.id, contentType: matchType });
      }
      if (matchSlug !== expected.slug) {
        providerSlugDrift.push({
          id: expected.id,
          expectedSlug: expected.slug,
          providerSlug: matchSlug,
        });
      }
    }
  }

  return {
    programSlug: manifest.programSlug,
    curriculumVersion: manifest.version,
    expectedProviderCourses,
    matchedProviderCourses,
    missingProviderIds,
    duplicateProviderIds,
    nonCourseContents,
    providerSlugDrift,
    exactMappingValid:
      missingProviderIds.length === 0 &&
      duplicateProviderIds.length === 0 &&
      nonCourseContents.length === 0 &&
      providerSlugDrift.length === 0,
  };
}

/** Read-only exact-set validation for a candidate Coursera learning path. */
export function validateApprovedCurriculumTrack(args: {
  programSlug: string;
  providerProgram: ProviderTrack;
}): ApprovedCurriculumTrackValidation {
  const manifest = getProgramCurriculumManifest(
    args.programSlug,
    APPROVED_CURRICULUM_VERSION,
  );
  if (!manifest) throw new Error(`No approved curriculum manifest for ${args.programSlug}`);

  const expectedProviderIds = manifest.courses
    .filter((course) => course.kind === 'coursera')
    .map((course) => normalizeCourseraCourseId(course.courseraCourseId));
  const actualProviderIds = args.providerProgram.courses.map((course) =>
    normalizeCourseraCourseId(course.id),
  );
  const expectedSet = new Set(expectedProviderIds);
  const actualSet = new Set(actualProviderIds);
  const counts = new Map<string, number>();
  for (const providerId of actualProviderIds) {
    counts.set(providerId, (counts.get(providerId) ?? 0) + 1);
  }

  const missingProviderIds = expectedProviderIds.filter((id) => !actualSet.has(id));
  const extraProviderIds = actualProviderIds.filter((id) => !expectedSet.has(id));
  const duplicateProviderIds = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  const nonCourseContents = args.providerProgram.courses
    .filter((course) => (course.contentType?.trim() || 'Unknown').toLowerCase() !== 'course')
    .map((course) => ({
      id: normalizeCourseraCourseId(course.id),
      contentType: course.contentType?.trim() || 'Unknown',
    }));
  const orderMatches =
    expectedProviderIds.length === actualProviderIds.length &&
    expectedProviderIds.every((id, index) => actualProviderIds[index] === id);
  const exactMatch =
    missingProviderIds.length === 0 &&
    extraProviderIds.length === 0 &&
    duplicateProviderIds.length === 0 &&
    nonCourseContents.length === 0 &&
    orderMatches;

  return {
    programSlug: manifest.programSlug,
    curriculumVersion: manifest.version,
    collectionId: args.providerProgram.id,
    expectedProviderIds,
    actualProviderIds,
    missingProviderIds,
    extraProviderIds,
    duplicateProviderIds,
    nonCourseContents,
    orderMatches,
    exactMatch,
  };
}
