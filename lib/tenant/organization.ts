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
  if (!row) {
    throw new Error(
      `Default organization missing (slug=${DEFAULT_ORG_SLUG}). Run migrations and seed.`
    );
  }
  cachedDefaultOrgId = row.id;
  return row.id;
}
