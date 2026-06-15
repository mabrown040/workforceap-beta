import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isEmployer } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import EmployerOutcomesDashboard from '@/components/employer/EmployerOutcomesDashboard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('employer');
  return buildPageMetadataAsync({
    title: t('outcomes.title') || 'Hiring Outcomes',
    description: t('outcomes.description') || 'Your hiring pipeline effectiveness',
    path: '/employer/outcomes',
  });
}

export default async function EmployerOutcomesPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login?redirect=/employer/outcomes');
  }

  const employer = await isEmployer(user.id);
  if (!employer) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmployerOutcomesDashboard />
      </div>
    </div>
  );
}
