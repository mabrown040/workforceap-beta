import { prisma } from '@/lib/db/prisma';
import { PROGRAMS, type Program as StaticProgram, getProgramBySlug } from '@/lib/content/programs';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';

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

/** Same shape as DB-backed rows, built only from `lib/content/programs` (offline / empty catalog). */
function activeProgramsFromStaticCatalog(): ActiveProgramView[] {
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

/**
 * Active programs for the default org: DB catalog rows merged with static `PROGRAMS` for courses/skills.
 * Falls back to static-only when the catalog is empty (first deploy) or when the database is unreachable
 * / not seeded (local dev without `DATABASE_URL`).
 */
export async function getActivePrograms(organizationId?: string): Promise<ActiveProgramView[]> {
  if (shouldSkipOptionalDbQueriesAtBuild()) {
    return activeProgramsFromStaticCatalog();
  }

  try {
    const orgId = organizationId ?? (await getDefaultOrganizationId());

    const rows = await prisma.organizationProgramCatalog.findMany({
      take: 5000,
      where: { organizationId: orgId, status: 'active' },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    if (rows.length === 0) {
      return activeProgramsFromStaticCatalog();
    }

    return rows.map((r) => {
      const staticP = getProgramBySlug(r.programSlug);
      return {
        slug: r.programSlug,
        name: staticP?.title ?? r.name,
        description: r.description,
        category: staticP?.categoryLabel ?? r.category,
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
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[getActivePrograms] Using static program catalog (database unavailable or default org missing).',
        err,
      );
    }
    return activeProgramsFromStaticCatalog();
  }
}

export function isProgramSlugActiveInCatalog(
  active: ActiveProgramView[],
  slug: string
): boolean {
  return active.some((p) => p.slug === slug);
}
