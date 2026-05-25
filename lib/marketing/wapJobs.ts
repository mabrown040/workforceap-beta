import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';

export type WapJobListing = {
  id: string;
  title: string;
  location: string;
  type: string;
  descriptionMd: string;
  applyUrl: string;
  createdAt: Date;
};

export async function loadOpenWapJobs(): Promise<WapJobListing[]> {
  if (shouldSkipOptionalDbQueriesAtBuild()) return [];

  try {
    return await prisma.wapJob.findMany({
      where: { status: 'open' },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        location: true,
        type: true,
        descriptionMd: true,
        applyUrl: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error('[loadOpenWapJobs]', error);
    return [];
  }
}

export function formatWapJobType(type: string): string {
  switch (type) {
    case 'FT':
      return 'Full-time';
    case 'PT':
      return 'Part-time';
    case 'Contract':
      return 'Contract';
    default:
      return type;
  }
}
