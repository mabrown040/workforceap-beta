import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';
import VoiceCoachesPromo from '@/components/portal/VoiceCoachesPromo';
import { AI_TOOLS_HUB } from '@/lib/portal/aiToolsHub';
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

  // Flatten all tools into a single list for the quick-access grid
  const allTools = AI_TOOLS_HUB.flatMap((cat) =>
    cat.links.map((link) => ({ ...link, icon: cat.icon, category: cat.title }))
  );

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

      {/* All tools in one dense grid — no scrolling required */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>grid_view</span>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            All Tools
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem' }}>
          {allTools.map((tool) => (
            <Link
              key={tool.href + tool.label}
              href={tool.href}
              className="portal-quick-action-item"
              style={{ textDecoration: 'none', minHeight: '92px', height: '100%' }}
            >
              <div className="portal-quick-action-item__icon">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{tool.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  className="portal-quick-action-item__label"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '2.1rem',
                  }}
                >
                  {tool.label}
                </p>
                <p className="portal-quick-action-item__desc">{tool.category}</p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.3, flexShrink: 0 }}>chevron_right</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="wa-block wa-md:wa-hidden">
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
