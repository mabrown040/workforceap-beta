import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getAnalyticsOverview } from '@/lib/admin/analytics';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return buildPageMetadataAsync({
    title: t('analytics.title') || 'Analytics Overview',
    description: t('analytics.description') || 'Enrollment, progress, and outcomes at a glance.',
    path: '/admin/analytics',
  });
}

export default async function AnalyticsPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login?redirect=/admin/analytics');
  }

  const admin = await isAdmin(user.id);
  if (!admin) {
    redirect('/dashboard');
  }

  const orgId = await getActorOrganizationId(user.id);
  const data = await getAnalyticsOverview(orgId ?? undefined);

  return <AnalyticsDashboard data={data} />;
}
