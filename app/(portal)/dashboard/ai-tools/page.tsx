import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';
import VoiceCoachesPromo from '@/components/portal/VoiceCoachesPromo';
import { AI_TOOLS_HUB } from '@/lib/portal/aiToolsHub';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';

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
            padding: '1rem 1.5rem 1rem',
            background: 'linear-gradient(180deg, var(--surface-container-low) 0%, var(--surface-container-lowest) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(173,44,77,0.12)',
                  color: 'var(--color-accent)',
                }}
              >
                Beta Access
              </span>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.2rem', lineHeight: 1.2 }}>
              AI Career Toolkit
            </h1>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
              AI-powered tools to strengthen your resume, practice interviews, and stand out to employers.
            </p>
          </div>
          <Link
            href="/dashboard/ai-tools/history"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>history</span>
            Past results
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
              style={{ textDecoration: 'none' }}
            >
              <div className="portal-quick-action-item__icon">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{tool.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="portal-quick-action-item__label">{tool.label}</p>
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
