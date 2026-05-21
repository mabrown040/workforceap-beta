import { PROGRAMS } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';

export type ActiveProgramSlug = {
  slug: string;
  lastModified: Date;
};

export async function getActiveProgramSlugsForSitemap(): Promise<ActiveProgramSlug[]> {
  const bySlug = new Map<string, Date>();

  for (const program of PROGRAMS) {
    bySlug.set(program.slug, new Date());
  }

  if (shouldSkipOptionalDbQueriesAtBuild()) {
    return [...bySlug.entries()].map(([slug, lastModified]) => ({ slug, lastModified }));
  }

  try {
    const rows = await prisma.organizationProgramCatalog.findMany({
      where: { status: 'active' },
      select: { programSlug: true, updatedAt: true },
      take: 5000,
    });

    for (const row of rows) {
      const existing = bySlug.get(row.programSlug);
      if (!existing || row.updatedAt > existing) {
        bySlug.set(row.programSlug, row.updatedAt);
      }
    }
  } catch {
    // DB unavailable at build/runtime.
  }

  return [...bySlug.entries()]
    .map(([slug, lastModified]) => ({ slug, lastModified }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
