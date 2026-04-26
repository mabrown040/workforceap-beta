import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { getUser } from '@/lib/auth/server';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career and Business Coach',
  description: 'A general career and business coach for project management, sales, marketing, and professional development questions.',
  path: '/dashboard/ai-tools/career-business-coach',
});

export default async function CareerBusinessCoachPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/career-business-coach');

  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
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
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>Career and Business Coach</span>
        </nav>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Career and Business Coach</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', maxWidth: 640 }}>
          Ask about project management, sales strategy, guerrilla marketing, communication challenges, or any career and business topic.
        </p>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
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
              'Project management and team communication',
              'Sales strategy and marketing plans',
              'Career growth and professional skills',
              'Business problem-solving and advice',
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

        <VoiceAgentSurface
          badge="Career & Business Coach"
          headline="Talk through any career or business challenge"
          subtext="Project management, sales, marketing, communication — get guidance tailored to your situation."
          icon="💼"
          glowColor="#2563eb"
          gradient="linear-gradient(135deg, #1e40af 0%, #2563eb 45%, #60a5fa 100%)"
        >
          <PortalVoiceSession
            sessionEndpoint="/api/member/career-business-coach/voice-session"
            completionEndpoint="/api/member/career-business-coach/completion"
            title="Career and Business Coach"
            description="Share your challenge — project management, sales, marketing, or career growth."
            accent="#2563eb"
            accentDark="#1e40af"
            speakingLabel="Coach is speaking…"
            listeningLabel="Listening…"
          />
        </VoiceAgentSurface>
      </div>

      <div className="wa-block md:wa-hidden">
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
