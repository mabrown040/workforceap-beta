import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import ElevatorPitchClient from '@/components/portal/tools/ElevatorPitchClient';
import { prefillElevatorPitch } from '@/lib/ai/prefillFromMemberState';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { DesignSurface } from '@/components/portal/kit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('elevatorPitchMetaTitle'),
    description: t('elevatorPitchMetaDesc'),
    path: '/dashboard/ai-tools/elevator-pitch',
  });
}

type SearchParams = Promise<{ prefill?: string }>;

export default async function ElevatorPitchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/elevator-pitch');

  const sp = await searchParams;
  const shouldPrefill = sp.prefill === 'true';
  let initialData: Awaited<ReturnType<typeof prefillElevatorPitch>> | null = null;
  if (shouldPrefill) {
    try {
      initialData = await prefillElevatorPitch(user.id);
    } catch (err) {
      console.error('[elevator-pitch page] prefill failed', err);
    }
  }

  return (
    <DesignSurface surface="warm">
      <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>
        <div style={{ padding: '1.25rem 2rem 1.5rem', borderBottom: '1px solid var(--wa-border)', background: 'var(--wa-surface)' }}>
          <PageHeader
            title="AI Elevator Introduction"
            subtitle="Answer a few quick questions. AI writes your 10–20 second intro, saves it, emails it to you, then lets you rehearse it with your voice."
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'AI Elevator Introduction' },
            ]}
          />
        </div>
        <div style={{ paddingBottom: '6rem' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>
            <div className="wa-kit-card">
              <ElevatorPitchClient initialData={initialData} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <ToolHistoryPanel
                userId={user.id}
                toolTypes={['career_counselor']}
                inputSummaryStartsWith="AI elevator speech for"
                title="Previous AI elevator introductions"
                emptyMessage="No saved elevator introductions yet. Generate your first one above."
              />
            </div>
          </div>
          <MobileBottomNav variant="portal" />
        </div>
      </div>
    </DesignSurface>
  );
}
