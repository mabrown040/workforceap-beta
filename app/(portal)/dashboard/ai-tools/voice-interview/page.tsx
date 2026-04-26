import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import VoiceInterviewScaffold from '@/components/portal/tools/VoiceInterviewScaffold';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { getUser } from '@/lib/auth/server';

export const metadata: Metadata = buildPageMetadata({
  title: 'Voice Interview',
  description: 'Practice a live voice mock interview with optional camera recording and real-time coaching feedback.',
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
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '1rem',
          }}
        >
          <Link href="/dashboard/ai-tools" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
            AI Tools
          </Link>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden="true">chevron_right</span>
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>Voice Interview</span>
        </nav>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Voice Interview</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', maxWidth: 640 }}>
          Open a dedicated mock interview flow, answer questions out loud, and get live coaching feedback in a setup built specifically for practice.
        </p>
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
