import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { getBoardSnapshot, BoardOutcomesPeriod } from '@/lib/admin/boardOutcomes';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import OutcomesSnapshot from '@/components/admin/OutcomesSnapshot';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return buildPageMetadataAsync({
    title: t('outcomes.title') || 'Outcomes Dashboard',
    description: t('outcomes.description') || 'Placement rates, salary data, and program effectiveness',
    path: '/admin/outcomes',
  });
}

export default async function OutcomesPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/login?redirect=/admin/outcomes');
  }

  const admin = await isAdmin(user.id);
  if (!admin) {
    redirect('/dashboard');
  }

  const orgId = await getActorOrganizationId(user.id);
  const params = await searchParams;
  const period = (params?.period ?? 'all-time') as BoardOutcomesPeriod;
  const snapshot = await getBoardSnapshot(period, orgId ?? undefined);

  return <OutcomesSnapshot initialSnapshot={snapshot} initialPeriod={period} />;
}
