import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import LinkedInAboutForm from '@/components/portal/tools/LinkedInAboutForm';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('linkedinAboutMetaTitle'),
    description: t('linkedinAboutMetaDesc'),
    path: '/dashboard/ai-tools/linkedin-about',
  });
}

export default async function LinkedInAboutPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/linkedin-about');

  return (
    <>
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div
        style={{
          padding: '1.25rem 2rem 1.5rem',
          borderBottom: '1px solid var(--surface-container-high)',
          background: 'var(--surface-container-low)',
        }}
      >
        <PageHeader
          title="LinkedIn About"
          subtitle="Add your target role and highlights. If you have a resume on file, we prefill from it and use the full text when generating your 3-paragraph About section."
          breadcrumbs={[
            { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'LinkedIn About' },
          ]}
        />
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
          <LinkedInAboutForm />
        </div>
        <ToolHistoryPanel userId={user.id} toolType="linkedin_about" />
      </div>
    </div>    </>
  );
}
