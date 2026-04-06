import { prisma } from '@/lib/db/prisma';

export const DEFAULT_ORG_SLUG = 'workforceap';

let cachedDefaultOrgId: string | null = null;

/** Single-tenant default org (migration seeds slug workforceap). */
export async function getDefaultOrganizationId(): Promise<string> {
  if (cachedDefaultOrgId) return cachedDefaultOrgId;
  const row = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
    select: { id: true },
  });
  if (row) {
    cachedDefaultOrgId = row.id;
    return row.id;
  }
  // Drifted DB or partial seed: use oldest org so admin/layout do not hard-crash.
  const fallback = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!fallback) {
    throw new Error(
      `Default organization missing (slug=${DEFAULT_ORG_SLUG}). Run migrations and seed.`
    );
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[tenant] slug "${DEFAULT_ORG_SLUG}" not found; using organization ${fallback.id}. Run seed/migrations.`
    );
  } else {
    console.warn(`[tenant] default org slug missing; using fallback organization id=${fallback.id}`);
  }
  cachedDefaultOrgId = fallback.id;
  return fallback.id;
}
