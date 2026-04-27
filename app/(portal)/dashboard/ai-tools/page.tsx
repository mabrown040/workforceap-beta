import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';
import VoiceCoachesPromo from '@/components/portal/VoiceCoachesPromo';
import { AI_TOOLKIT_EXTRA_SECTIONS } from '@/lib/portal/aiToolsHub';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import PortalCard from '@/components/portal/ui/PortalCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Toolkit',
  description: 'Guided member tools for resumes, applications, interviews, LinkedIn, and job-search strategy.',
  path: '/dashboard/ai-tools',
});

export default async function AIToolsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools');

  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div className="wa-pb-24 md:wa-pb-0">
        <div className="wa-hidden md:wa-block" style={{ padding: '1.5rem 1.5rem 0', maxWidth: '1100px', margin: '0 auto' }}>
          <PortalBreadcrumb items={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'AI Toolkit' },
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
            className="wa-block md:wa-hidden"
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
            AI Toolkit
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
            Start with the 5 core tools below, then move step by step through resume prep, applications, interviews, and profile polish.
          </p>

          <div className="wa-block md:wa-hidden" style={{ maxWidth: '520px', margin: '0 auto 1.25rem' }}>
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
                  Start with these 5 tools
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
                  Start here first, then follow the guided steps below.
                </p>
              </div>
            </PortalCard>
          </div>

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
      </div>

      {/* Voice coaches — compact at top */}
      <div style={{ marginBottom: '1.5rem' }}>
        <VoiceCoachesPromo />
      </div>

      <section style={{ maxWidth: '1100px', margin: '0 auto 2rem', padding: '0 clamp(1rem, 4vw, 1.5rem)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>apps</span>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Guided Job Search Steps
          </h2>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <PortalCard className="portal-card--flat">
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
              Looking for your application tracker? It now lives under <strong style={{ color: 'var(--color-on-surface)' }}>Jobs</strong> so your saved roles and application status stay with the rest of your job search workflow.
            </p>
            <div style={{ marginTop: '0.875rem' }}>
              <Link href="/dashboard/job-applications" className="btn btn-outline">
                Open Application Tracker
              </Link>
            </div>
          </PortalCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {AI_TOOLKIT_EXTRA_SECTIONS.map((section) => (
            <PortalCard key={section.title} className="portal-card--flat">
              <div style={{ marginBottom: '0.875rem' }}>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                  {section.title}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                {section.tools.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="portal-quick-action-item"
                    style={{ textDecoration: 'none', padding: '0.75rem 0.875rem', flex: '1 1 160px', maxWidth: '220px' }}
                  >
                    <div className="portal-quick-action-item__icon">
                      <span className="material-symbols-outlined" style={{ fontSize: '1.05rem', fontVariationSettings: "'FILL' 1" }}>{tool.icon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="portal-quick-action-item__label"
                        style={{ whiteSpace: 'normal', lineHeight: 1.35, overflowWrap: 'break-word' }}
                      >
                        {tool.label}
                      </p>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', opacity: 0.35, flexShrink: 0, marginTop: '0.15rem' }}>chevron_right</span>
                  </Link>
                ))}
              </div>
            </PortalCard>
          ))}
        </div>
      </section>

      <div className="wa-block md:wa-hidden">
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
