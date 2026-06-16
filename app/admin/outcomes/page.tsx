import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import OutcomesDashboard from '@/components/admin/OutcomesDashboard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return buildPageMetadataAsync({
    title: t('outcomes.title') || 'Outcomes Dashboard',
    description: t('outcomes.description') || 'Placement rates, salary data, and program effectiveness',
    path: '/admin/outcomes',
  });
}

export default async function OutcomesPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login?redirect=/admin/outcomes');
  }

  const admin = await isAdmin(user.id);
  if (!admin) {
    redirect('/dashboard');
  }

  return <OutcomesDashboard />;
}
