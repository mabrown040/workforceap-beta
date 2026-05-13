import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import CareerMappingsClient, { type AuditEntry } from './CareerMappingsClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return buildPageMetadataAsync({
    title: t('careerMappingsONET'),
    description: t('manageRoleMappings'),
    path: '/admin/career-mappings',
  });
}

const HISTORY_LIMIT = 20;

export default async function AdminCareerMappingsPage() {
  // Last 20 mapping audit entries for the inline History panel.
  // Permissions are enforced by the existing /admin layout — no extra guard here.
  const rows = await prisma.auditLog.findMany({
    where: {
      targetType: 'career_program_mapping',
      action: {
        in: [
          'mapping_created',
          'mapping_updated',
          'mapping_deactivated',
          'mapping_reactivated',
          'mapping_deleted',
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
    include: {
      actor: { select: { fullName: true, email: true } },
    },
  });

  const history: AuditEntry[] = rows.map((r) => ({
    id: r.id,
    action: r.action,
    targetId: r.targetId,
    actorName: r.actor?.fullName ?? r.actor?.email ?? null,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <CareerMappingsClient history={history} />;
}
