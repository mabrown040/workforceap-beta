import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Compass } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import GapAnalyzerForm from '@/components/portal/tools/GapAnalyzerForm';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { DesignSurface, CardHead } from '@/components/portal/kit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('gapAnalyzerMetaTitle'),
    description: t('gapAnalyzerMetaDesc'),
    path: '/dashboard/ai-tools/gap-analyzer',
  });
}

export default async function GapAnalyzerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/gap-analyzer');

  return (
    <DesignSurface surface="warm">
      <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>
        <div style={{ paddingBottom: '6rem' }}>
          <div
            style={{
              padding: '1.25rem 2rem 1.5rem',
              borderBottom: '1px solid var(--wa-border)',
              background: 'var(--wa-surface)',
            }}
          >
            <PageHeader
              title="Resume Gap Analyzer"
              subtitle="Upload your resume. We flag employment gaps and suggest framing language for cover letters and interviews so you can address them confidently."
              breadcrumbs={[
                { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
                { label: 'Resume Gap Analyzer' },
              ]}
            />
          </div>

          <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
            <div className="wa-kit-card">
              <CardHead title="Resume gap analyzer" />
              <div className="wa-flex wa-items-start wa-gap-3" style={{ marginBottom: '1.1rem', marginTop: -6 }}>
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
                  <Compass size={17} />
                </div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--wa-muted)', margin: 0 }}>
                  We flag employment gaps and suggest framing language for cover letters and interviews
                  so you can address them confidently.
                </p>
              </div>
              <GapAnalyzerForm />
            </div>

            <ToolHistoryPanel userId={user.id} toolType="gap_analyzer" />
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
