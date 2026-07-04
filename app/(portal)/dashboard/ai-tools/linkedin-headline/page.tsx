import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import LinkedInHeadlineForm from '@/components/portal/tools/LinkedInHeadlineForm';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('linkedinHeadlineMetaTitle'),
    description: t('linkedinHeadlineMetaDesc'),
    path: '/dashboard/ai-tools/linkedin-headline',
  });
}

export default async function LinkedInHeadlinePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/linkedin-headline');

  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div
        style={{
          padding: '1.25rem 2rem 1.5rem',
          borderBottom: '1px solid var(--surface-container-high)',
          background: 'var(--surface-container-low)',
        }}
      >
        <PageHeader
          title="LinkedIn Headline"
          subtitle="Craft a compelling LinkedIn headline that gets you noticed by recruiters."
          breadcrumbs={[
            { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'LinkedIn Headline' },
          ]}
        />
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
          <LinkedInHeadlineForm />
        </div>
        <ToolHistoryPanel userId={user.id} toolType="linkedin_headline" />
      </div>
    </div>
  );
}
