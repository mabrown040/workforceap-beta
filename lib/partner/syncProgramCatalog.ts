import type { PrismaClient } from '@prisma/client';

export async function syncPartnerProgramCatalog(
  db: Pick<PrismaClient, 'partnerProgramCatalog'>,
  partnerId: string,
  programSlugs: string[],
): Promise<void> {
  const slugs = programSlugs.map((s) => s.trim()).filter(Boolean);
  for (const [index, programSlug] of slugs.entries()) {
    await db.partnerProgramCatalog.upsert({
      where: { partnerId_programSlug: { partnerId, programSlug } },
      create: { partnerId, programSlug, displayOrder: index, featured: index === 0 },
      update: { displayOrder: index, featured: index === 0 },
    });
  }
  await db.partnerProgramCatalog.deleteMany({
    where: slugs.length > 0
      ? { partnerId, programSlug: { notIn: slugs } }
      : { partnerId },
  });
}
