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
  let rows: any[] = [];
  try {
    const orgId = organizationId ?? (await getDefaultOrganizationId());
    rows = await prisma.organizationProgramCatalog.findMany({
      where: { organizationId: orgId, status: 'active' },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  } catch (e) {
    // DB unavailable (local dev without DB) — fall through to static fallback
    console.warn('[programCatalog] DB unavailable, using static fallback:', (e as Error).message?.slice(0, 80));
  }

  if (rows.length === 0) {
    return PROGRAMS.filter(() => true).map((p, i) => ({
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
