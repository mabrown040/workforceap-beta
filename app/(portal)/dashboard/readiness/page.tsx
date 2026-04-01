import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ReadinessMemberClient from './ReadinessMemberClient';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import '@/css/counselor.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career Readiness',
  description: 'Your job readiness checklist.',
  path: '/dashboard',
});

export default async function DashboardReadinessPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/readiness');

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '0.25rem' }}>
            Career Readiness
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Your readiness score across 4 key categories.
          </p>
        </div>

        <div style={{ padding: '0 1rem 1rem' }}>
          <div
            className="stitch-card"
            style={{
              padding: '1.25rem',
              border: '1px solid var(--outline-variant)',
              borderRadius: '0.875rem',
              background: 'var(--surface-container-lowest)',
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.12em] font-semibold"
              style={{ color: 'var(--color-accent)', marginBottom: '0.75rem' }}
            >
              Readiness coach (voice)
            </p>
            <PortalVoiceSession
              sessionEndpoint="/api/member/readiness/voice-session"
              title="Talk through your readiness plan"
              description="Ask about interviews, certifications, LinkedIn, or your next milestone."
              accent="#0d9488"
              accentDark="#0f766e"
              speakingLabel="Coach is speaking…"
              listeningLabel="Listening — share where you are"
            />
          </div>
        </div>

        {/* Large SVG Score Ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 1rem 0.5rem' }}>
          <svg width="160" height="160" viewBox="0 0 160 160" fill="none" aria-label="Career readiness score ring">
            {/* Background track */}
            <circle cx="80" cy="80" r="68" stroke="var(--surface-container-highest)" strokeWidth="10" />
            {/* Score ring — 72% = dashoffset: circumference * (1 - 0.72) */}
            {/* circumference = 2π*68 ≈ 427.3 */}
            <circle
              cx="80"
              cy="80"
              r="68"
              stroke="var(--color-accent)"
              strokeWidth="10"
              strokeDasharray="427.3"
              strokeDashoffset="119.6"
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
            />
            <text x="80" y="72" textAnchor="middle" fill="var(--color-on-surface)" fontSize="32" fontWeight="700">
              72
            </text>
            <text x="80" y="95" textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="13">
              / 100
            </text>
            <text x="80" y="115" textAnchor="middle" fill="var(--color-accent)" fontSize="11" fontWeight="600">
              Good Standing
            </text>
          </svg>
        </div>

        {/* 4 Category Progress Bars */}
        <div style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}>
          {[
            { label: 'Resume', pct: 80, icon: 'description', color: 'var(--color-blue)' },
            { label: 'Certifications', pct: 67, icon: 'workspace_premium', color: 'var(--color-accent)' },
            { label: 'Interview Prep', pct: 55, icon: 'record_voice_over', color: 'var(--color-green)' },
            { label: 'LinkedIn', pct: 40, icon: 'person_check', color: 'var(--color-gold, #f59e0b)' },
          ].map((cat) => (
            <div key={cat.label} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '1rem', color: cat.color, fontVariationSettings: "'FILL' 1" }}
                  >
                    {cat.icon}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{cat.label}</span>
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: cat.color }}>{cat.pct}%</span>
              </div>
              <div
                style={{
                  height: '8px',
                  background: 'var(--surface-container-highest)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <svg width={`${cat.pct}%`} height="8" style={{ display: 'block' }} aria-hidden="true">
                  <rect x="0" y="0" width="100%" height="8" rx="4" fill={cat.color} />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Priority Action CTA */}
        <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
          <div
            style={{
              background: 'var(--surface-container)',
              borderRadius: '0.875rem',
              padding: '1rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.375rem', color: 'var(--color-gold, #f59e0b)', fontVariationSettings: "'FILL' 1", flexShrink: 0 }}
              >
                priority_high
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>Priority Action</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
                  Boost your LinkedIn score — connect your profile to unlock employer visibility.
                </div>
                <a
                  href="/dashboard/profile"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    borderRadius: '0.5rem',
                    padding: '0.4375rem 0.875rem',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    textDecoration: 'none',
                  }}
                >
                  Update Profile
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <MobileBottomNav variant="portal" />
      </div>

      {/* ── DESKTOP ── */}
      <div className="wa-hidden wa-md:wa-block">
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Your Career Readiness</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
            Track your progress from training to career. Your counselor updates this checklist as you hit milestones.
          </p>
          <div
            className="stitch-card"
            style={{
              marginBottom: '1.5rem',
              padding: '1.5rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
              Readiness coach (voice)
            </h2>
            <PortalVoiceSession
              sessionEndpoint="/api/member/readiness/voice-session"
              title="Talk through your readiness plan"
              description="Ask about interviews, certifications, LinkedIn, or your next milestone."
              accent="#0d9488"
              accentDark="#0f766e"
              speakingLabel="Coach is speaking…"
              listeningLabel="Listening — share where you are"
            />
          </div>
          <ReadinessMemberClient />
        </div>
      </div>
    </>
  );
}
