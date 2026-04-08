import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import VoiceCoachesPromo from '@/components/portal/VoiceCoachesPromo';
import AiToolsHubSection from '@/components/portal/AiToolsHubSection';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import PortalCard from '@/components/portal/ui/PortalCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Career Toolkit',
  description: 'AI-powered tools to strengthen your resume, practice interviews, and more.',
  path: '/dashboard/ai-tools',
});

export default async function AIToolsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools');

  let suggestedActions: Array<{ label: string; href: string }> = [];
  try {
    const briefContext = await getCareerBriefContext(user.id);
    suggestedActions = briefContext.recommendedActions.filter((a) => a.href.startsWith('/dashboard/ai-tools')).slice(0, 3);
  } catch {
    suggestedActions = [
      { label: 'Build your resume', href: '/dashboard/ai-tools/resume-rewriter' },
      { label: 'Practice interview questions', href: '/dashboard/ai-tools/interview-practice' },
      { label: 'Log your first application', href: '/dashboard/job-applications' },
    ];
  }

  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div className="wa-pb-24 wa-md:wa-pb-0">
        <div className="wa-hidden wa-md:wa-block" style={{ padding: '1.5rem 1.5rem 0', maxWidth: '1100px', margin: '0 auto' }}>
          <PortalBreadcrumb items={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'AI Career Toolkit' },
          ]} />
        </div>
        <section
          style={{
            padding: 'clamp(2rem, 4vw, 3rem) 1.5rem 2rem',
            textAlign: 'center',
            background: 'linear-gradient(180deg, var(--surface-container-low) 0%, var(--surface-container-lowest) 100%)',
          }}
        >
          <p
            className="wa-block wa-md:wa-hidden"
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              marginBottom: '0.5rem',
            }}
          >
            Included for members
          </p>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              background: 'rgba(173,44,77,0.12)',
              color: 'var(--color-accent)',
              marginBottom: '1rem',
            }}
          >
            Beta Access
          </span>
          <h1 className="text-display-sm" style={{ margin: '0 0 0.5rem' }}>
            AI Career Toolkit
          </h1>
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              maxWidth: '520px',
              margin: '0 auto 1.5rem',
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
              lineHeight: 1.6,
            }}
          >
            AI-powered tools to strengthen your resume, practice interviews, and stand out to employers.
          </p>

          <div className="wa-block wa-md:wa-hidden" style={{ maxWidth: '520px', margin: '0 auto 1.25rem' }}>
            <PortalCard
              className="portal-card--flat"
            >
              <div
                style={{
                  position: 'relative',
                  height: '7rem',
                  overflow: 'hidden',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  background:
                    'linear-gradient(135deg, var(--color-accent-dark) 0%, var(--color-accent) 100%)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '7rem',
                    height: '7rem',
                    borderRadius: '9999px',
                    marginRight: '-3rem',
                    marginTop: '-3rem',
                    background: 'color-mix(in srgb, var(--color-gold) 18%, transparent)',
                    filter: 'blur(40px)',
                  }}
                />
                <h2
                  className="wa-text-base wa-font-bold"
                  style={{ color: 'var(--color-white)', margin: 0, position: 'relative', zIndex: 1 }}
                >
                  Smart Recommendations
                </h2>
                <p
                  style={{
                    color: 'color-mix(in srgb, var(--color-white) 92%, transparent)',
                    fontSize: '0.75rem',
                    margin: '0.25rem 0 0',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  AI-driven paths tailored for your goals.
                </p>
              </div>
            </PortalCard>
          </div>

          {suggestedActions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
              {suggestedActions.map((a) => (
                <Link
                  key={a.href + a.label}
                  href={a.href}
                  className="btn btn-primary"
                >
                  {a.label}
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/dashboard/ai-tools/history"
            className="btn btn-outline"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              history
            </span>
            View my past results
          </Link>
        </section>

        <VoiceCoachesPromo />

        <AiToolsHubSection />

        <section
          style={{
            padding: '0 clamp(1rem, 4vw, 1.5rem) 1rem',
            maxWidth: '1100px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <Link
            href="/dashboard/ai-tools/voice-interview"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden>
              mic
            </span>
            Voice mock interview (ElevenLabs)
          </Link>
        </section>

        <section
          style={{
            padding: '2rem clamp(1rem, 4vw, 1.5rem)',
            borderTop: '1px solid var(--surface-container-high)',
            maxWidth: '1100px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'clamp(0.5rem, 3vw, 3rem)',
              flexWrap: 'wrap',
            }}
          >
            {[
              { title: 'Included', desc: 'No add-on fees for enrolled members', icon: 'verified' },
              { title: 'Private', desc: 'Your drafts stay with you', icon: 'lock' },
              { title: 'Flexible', desc: 'Use whenever you need', icon: 'schedule' },
            ].map((item) => (
              <div
                key={item.title}
                className="metric-card"
                style={{
                  textAlign: 'center',
                  background: 'transparent',
                  border: 'none',
                  padding: '1rem',
                  maxWidth: '200px',
                  flex: '1 1 100px',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '1.5rem', color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'block' }}
                >
                  {item.icon}
                </span>
                <div className="metric-value" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  {item.title}
                </div>
                <div className="metric-label" style={{ fontSize: '0.8125rem', lineHeight: 1.4, marginTop: '0.35rem' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="wa-block wa-md:wa-hidden">
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
