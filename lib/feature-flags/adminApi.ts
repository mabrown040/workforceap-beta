import { prisma } from '@/lib/db/prisma';

export async function fetchFeatureFlags() {
  return prisma.featureFlag.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export function validateCreateBody(body: Record<string, unknown>): { error?: string; data?: Record<string, unknown> } {
  const { key, name, description, enabled, rolloutPercentage, allowedRoles } = body;

  if (!key || typeof key !== 'string' || !key.trim() || !name || typeof name !== 'string' || !name.trim()) {
    return { error: 'key and name are required' };
  }

  const rollPct = Math.max(0, Math.min(100, Number(rolloutPercentage) || 0));
  const roles = Array.isArray(allowedRoles)
    ? allowedRoles.filter((r: unknown) => typeof r === 'string') as string[]
    : [];

  return {
    data: {
      key: key.trim(),
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() || null : null,
      enabled: !!enabled,
      rolloutPercentage: rollPct,
      allowedRoles: roles,
    },
  };
}
