import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';

/** Idempotent: upserts one catalog row per static program slug for the org. */
export async function seedOrganizationProgramCatalog(organizationId: string): Promise<void> {
  let order = 0;
  for (const p of PROGRAMS) {
    await prisma.organizationProgramCatalog.upsert({
      where: {
        organizationId_programSlug: { organizationId, programSlug: p.slug },
      },
      create: {
        organizationId,
        programSlug: p.slug,
        name: p.title,
        description: null,
        category: p.categoryLabel,
        deliveryType: 'internal',
        deliveryUrl: null,
        deliveryDetails: null,
        certifications: [],
        duration: p.duration,
        cost: null,
        certCost: null,
        bookCost: null,
        miscCost: null,
        status: 'active',
        displayOrder: order++,
        featured: false,
      },
      update: {
        name: p.title,
        category: p.categoryLabel,
        duration: p.duration,
      },
    });
  }
}
