import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import VoiceInterviewScaffold from '@/components/portal/tools/VoiceInterviewScaffold';
import VoiceSessionIntroStrip from '@/components/portal/tools/VoiceSessionIntroStrip';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { getUser } from '@/lib/auth/server';

export const metadata: Metadata = buildPageMetadata({
  title: 'Voice Interview Practice',
  description: 'Practice a live voice mock interview for a specific job or role, with optional camera recording and real-time coaching feedback.',
  path: '/dashboard/ai-tools/voice-interview',
});

export default async function VoiceInterviewPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/voice-interview');

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      <div
        style={{
          padding: '1.25rem 2rem 1.5rem',
          borderBottom: '1px solid var(--surface-container-high)',
          background: 'var(--surface-container-low)',
        }}
      >
        <PageHeader
          title="Voice Interview Practice"
          subtitle="Open a dedicated mock interview flow, answer questions out loud, and get live coaching feedback in a setup built specifically for practice."
          breadcrumbs={[
            { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'Voice Interview Practice' },
          ]}
        />
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 1rem 0' }}>
        <VoiceSessionIntroStrip
          items={['Microphone required, camera optional', 'Live prompts and coaching as you answer', 'Save recordings for your own review']}
        />
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
