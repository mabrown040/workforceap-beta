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

let cachedResources: MemberResource[] | null = null;

export async function getMemberResources(): Promise<MemberResource[]> {
  if (cachedResources) return cachedResources;
  try {
    const index = await import('../../content/member-resources/index.json');
    const data = index.default ?? index;
    const raw = Array.isArray(data) ? data : [];
    cachedResources = raw as MemberResource[];
    return cachedResources;
  } catch {
    return [];
  }
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
