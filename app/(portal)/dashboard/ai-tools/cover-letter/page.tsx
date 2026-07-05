import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MailOpen } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import CoverLetterForm from '@/components/portal/tools/CoverLetterForm';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { DesignSurface, CardHead } from '@/components/portal/kit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('coverLetterMetaTitle'),
    description: t('coverLetterMetaDesc'),
    path: '/dashboard/ai-tools/cover-letter',
  });
}

export default async function CoverLetterPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/cover-letter');

  return (
    <DesignSurface surface="warm">
      <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>
        <div style={{ paddingBottom: '6rem' }}>
          <div
            style={{
              padding: '1rem 1rem 1.25rem',
              borderBottom: '1px solid var(--wa-border)',
              background: 'var(--wa-surface)',
            }}
          >
            <PageHeader
              title="Cover Letter Builder"
              subtitle="Tailored cover letters that connect your experience to the job."
              breadcrumbs={[
                { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
                { label: 'Cover Letter' },
              ]}
            />
          </div>

          <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
            <div className="wa-kit-card" style={{ marginBottom: '1rem' }}>
              <CardHead title="Cover letter builder" />
              <div className="wa-flex wa-items-start wa-gap-3">
                <div
                  aria-hidden="true"
                  style={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: 'var(--wa-radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'color-mix(in srgb, var(--wa-info) 12%, transparent)',
                    color: 'var(--wa-info)',
                  }}
                >
                  <MailOpen size={17} />
                </div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--wa-muted)', margin: 0 }}>
                  Create a compelling, tailored cover letter in minutes. The tool connects your experience
                  directly to the job requirements, highlighting why you&rsquo;re the right fit.
                </p>
              </div>
            </div>

            <div className="wa-kit-card">
              <CoverLetterForm />
            </div>

            <ToolHistoryPanel userId={user.id} toolType="cover_letter" />
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
