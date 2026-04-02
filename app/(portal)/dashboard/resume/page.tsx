import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getProfileCompleteness } from '@/lib/resume/profileCompleteness';
import ResumeClient from './ResumeClient';
import MobileBottomNav from '@/components/MobileBottomNav';
import ResumeMobileResumeTools from '@/components/portal/ResumeMobileResumeTools';
import ResumeMobileQuickActions from '@/components/portal/ResumeMobileQuickActions';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resume',
  description: 'Upload, generate, and manage your resume.',
  path: '/dashboard',
});

export default async function DashboardResumePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/resume');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  if (!dbUser) redirect('/login');

  const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
  const completeness = getProfileCompleteness(dbUser.profile, dbUser);

  const witData = {
    name: dbUser.fullName ?? '',
    email: dbUser.email,
    phone: dbUser.phone ?? dbUser.profile?.profilePhone ?? '',
    recentEmployer: '—', // would need work history
    targetJob: program?.title ?? dbUser.enrolledProgram ?? 'Target role',
    skills: program?.skills?.join(', ') ?? '—',
  };

  const hasEnhanced = !!dbUser.profile?.resumeEnhancedPath;
  const hasOriginal = !!dbUser.profile?.resumeOriginalPath;
  const aiScore = hasEnhanced ? completeness : null;

  return (
    <>
      <h1 className="sr-only">My Resume</h1>
      {/* ── MOBILE ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '0.25rem' }}>
            My Resume
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Upload, generate, and manage your resume.
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
              Resume coach (voice)
            </p>
            <PortalVoiceSession
              sessionEndpoint="/api/member/resume-coach/session"
              title="Practice your pitch"
              description="Talk through experience bullets, gaps, or how to frame your target role."
              accent="#2563eb"
              accentDark="#1d4ed8"
              speakingLabel="Coach is speaking…"
              listeningLabel="Listening — describe your background"
            />
          </div>
        </div>

        {/* AI Score Badge */}
        {aiScore !== null && (
          <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            <div
              style={{
                background: 'var(--surface-container)',
                borderRadius: '0.875rem',
                padding: '0.875rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '52px',
                  height: '52px',
                  flexShrink: 0,
                }}
              >
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
                  <circle cx="26" cy="26" r="22" stroke="var(--surface-container-highest)" strokeWidth="4" />
                  <circle
                    cx="26"
                    cy="26"
                    r="22"
                    stroke="var(--color-accent)"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - aiScore / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 26 26)"
                  />
                  <text x="26" y="30" textAnchor="middle" fill="var(--color-accent)" fontSize="11" fontWeight="700">
                    {aiScore}
                  </text>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>AI Resume Score</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                  {aiScore >= 80 ? 'Strong profile' : aiScore >= 60 ? 'Good — keep building' : 'Needs improvement'}
                </div>
              </div>
              <span
                className="material-symbols-outlined"
                style={{ marginLeft: 'auto', fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
            </div>
          </div>
        )}

        {/* Resume Preview Card */}
        <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
          <div
            style={{
              background: 'var(--surface-container)',
              borderRadius: '0.875rem',
              padding: '1rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}
              >
                description
              </span>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Resume Preview</span>
              {hasEnhanced && (
                <span
                  style={{
                    marginLeft: 'auto',
                    background: 'rgba(173,44,77,0.12)',
                    color: 'var(--color-accent)',
                    borderRadius: '999px',
                    padding: '0.125rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  AI Enhanced
                </span>
              )}
            </div>

            {/* Name & contact */}
            <div style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{witData.name || 'Your Name'}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                {witData.email && <span>{witData.email}</span>}
                {witData.phone && <span>· {witData.phone}</span>}
              </div>
            </div>

            {/* Summary line */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Target Role
              </div>
              <div style={{ fontSize: '0.875rem' }}>{witData.targetJob}</div>
            </div>

            {/* Skills */}
            {witData.skills && witData.skills !== '—' && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                  Key Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {witData.skills.split(',').slice(0, 4).map((s) => (
                    <span
                      key={s.trim()}
                      style={{
                        background: 'var(--surface-container-highest)',
                        borderRadius: '999px',
                        padding: '0.1875rem 0.625rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!hasOriginal && !hasEnhanced && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(173,44,77,0.06)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
                Upload a resume below (PDF, DOC, or DOCX), or generate one with AI.
              </div>
            )}
          </div>
        </div>

        <ResumeMobileResumeTools
          completeness={completeness}
          initialHasOriginal={hasOriginal}
          initialHasEnhanced={hasEnhanced}
        />

        <ResumeMobileQuickActions />

        <MobileBottomNav variant="portal" />
      </div>

      {/* ── DESKTOP ── */}
      <div className="wa-hidden wa-md:wa-block">
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Resume</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
            Upload your resume, generate an AI-enhanced version, and prepare for WorkInTexas.
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
              Resume coach (voice)
            </h2>
            <PortalVoiceSession
              sessionEndpoint="/api/member/resume-coach/session"
              title="Practice your pitch"
              description="Talk through experience bullets, gaps, or how to frame your target role."
              accent="#2563eb"
              accentDark="#1d4ed8"
              speakingLabel="Coach is speaking…"
              listeningLabel="Listening — describe your background"
            />
          </div>
          <ResumeClient
            completeness={completeness}
            witData={witData}
            hasOriginal={hasOriginal}
            hasEnhanced={hasEnhanced}
          />
        </div>
      </div>
    </>
  );
}
