export type ResourceCategory =
  | 'Resume'
  | 'Interviewing'
  | 'Career Planning'
  | 'AI Skills'
  | 'Job Search';

export type ResourceStage =
  | 'New to workforce'
  | 'Mid-career pivot'
  | 'Recent graduate';

export type MemberResource = {
  id: string;
  title: string;
  summary: string;
  category: ResourceCategory;
  stage: ResourceStage;
  tags: string[];
  url: string;
  type: 'document' | 'video' | 'link';
  file?: string;
};

export type MemberResourcesResult = {
  resources: MemberResource[];
  loadFailed: boolean;
};

export type MemberResourcesOptions = {
  readOnlyAudit?: boolean;
};

let cachedResources: MemberResource[] | null = null;

export async function getMemberResourcesResult(
  options?: MemberResourcesOptions,
): Promise<MemberResourcesResult> {
  const useCache = !options?.readOnlyAudit;
  if (useCache && cachedResources) {
    return { resources: cachedResources, loadFailed: false };
  }

  try {
    const index = await import('../../content/member-resources/index.json');
    const data = index.default ?? index;
    const raw = Array.isArray(data) ? data : [];
    const resources = [...raw] as MemberResource[];
    if (useCache) cachedResources = resources;
    return { resources, loadFailed: false };
  } catch {
    return { resources: [], loadFailed: true };
  }
}

export async function getMemberResources(
  options?: MemberResourcesOptions,
): Promise<MemberResource[]> {
  return (await getMemberResourcesResult(options)).resources;
}

export const CATEGORIES: ResourceCategory[] = [
  'Resume',
  'Interviewing',
  'Career Planning',
  'AI Skills',
  'Job Search',
];

export const STAGES: ResourceStage[] = [
  'New to workforce',
  'Mid-career pivot',
  'Recent graduate',
];
