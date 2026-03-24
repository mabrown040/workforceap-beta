import { prisma } from '@/lib/db/prisma';
import { PROGRAMS, type Program as StaticProgram, getProgramBySlug } from '@/lib/content/programs';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

export type ActiveProgramView = {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  deliveryType: string;
  deliveryUrl: string | null;
  deliveryDetails: string | null;
  certifications: string[];
  duration: string | null;
  status: string;
  displayOrder: number;
  featured: boolean;
  /** Enriched from static catalog when slug matches */
  static?: StaticProgram;
};

/**
 * Active programs for the default org: DB catalog rows merged with static `PROGRAMS` for courses/skills.
 * Falls back to static-only when catalog is empty (first deploy).
 */
export async function getActivePrograms(organizationId?: string): Promise<ActiveProgramView[]> {
  const orgId = organizationId ?? (await getDefaultOrganizationId());

  const rows = await prisma.organizationProgramCatalog.findMany({
    where: { organizationId: orgId, status: 'active' },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  if (rows.length === 0) {
    return PROGRAMS.map((p, i) => ({
      slug: p.slug,
      name: p.title,
      description: null,
      category: p.categoryLabel,
      deliveryType: 'internal',
      deliveryUrl: null,
      deliveryDetails: null,
      certifications: [],
      duration: p.duration,
      status: 'active',
      displayOrder: i,
      featured: false,
      static: p,
    }));
  }

  return rows.map((r) => {
    const staticP = getProgramBySlug(r.programSlug);
    return {
      slug: r.programSlug,
      name: r.name,
      description: r.description,
      category: r.category,
      deliveryType: r.deliveryType,
      deliveryUrl: r.deliveryUrl,
      deliveryDetails: r.deliveryDetails,
      certifications: r.certifications,
      duration: r.duration,
      status: r.status,
      displayOrder: r.displayOrder,
      featured: r.featured,
      static: staticP ?? undefined,
    };
  });
}

export function isProgramSlugActiveInCatalog(
  active: ActiveProgramView[],
  slug: string
): boolean {
  return active.some((p) => p.slug === slug);
}
