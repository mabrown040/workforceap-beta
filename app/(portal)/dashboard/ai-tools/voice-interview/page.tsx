import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { getUser } from '@/lib/auth/server';

const VoiceInterviewScaffold = dynamic(() => import('@/components/portal/tools/VoiceInterviewScaffold'), {
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="portal-card portal-card--flat"
      style={{
        minHeight: 320,
        padding: '2.5rem 1.25rem',
        borderRadius: 12,
        textAlign: 'center',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}
    >
      Loading voice interview…
    </div>
  ),
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('voiceInterviewMetaTitle'),
    description: t('voiceInterviewMetaDesc'),
    path: '/dashboard/ai-tools/voice-interview',
  });
}

export default async function VoiceInterviewPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/voice-interview');

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
          title="Voice Job/Role Interviewer"
          subtitle="Open a dedicated mock interview flow, answer questions out loud, and get live coaching feedback in a setup built specifically for practice."
          breadcrumbs={[
            { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'Voice Job/Role Interviewer' },
          ]}
        />
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 1rem 0' }}>
        <div
          className="portal-card portal-card--flat"
          style={{
            padding: '1rem 1.1rem',
            borderRadius: 16,
            marginBottom: '1rem',
            background: 'var(--surface-container-low)',
          }}
        >
          <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {[
              'Microphone required, camera optional',
              'Live prompts and coaching as you answer',
              'Save recordings for your own review',
            ].map((item) => (
              <div key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--color-on-surface-variant)', fontSize: '0.82rem', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden>
                  check_circle
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Single scaffold — duplicate mobile/desktop mounts caused two independent button states */}
      <div style={{ paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <VoiceInterviewScaffold />
          <ToolHistoryPanel
            userId={user.id}
            toolType="voice_interview_video"
            title="Recent saved interview recordings"
            emptyMessage="No saved recordings yet. If you just finished a session and it does not appear, try refreshing in a few minutes."
          />
        </div>
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
