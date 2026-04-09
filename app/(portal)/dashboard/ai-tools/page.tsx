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
    <div style={{ paddingBottom: '5rem' }}>
      {/* Breadcrumb — desktop only */}
      <div className="wa-hidden wa-md:wa-block" style={{ paddingBottom: '0.5rem' }}>
        <PortalBreadcrumb items={[
          { label: 'Member Portal', href: '/dashboard' },
          { label: 'AI Career Toolkit' },
        ]} />
      </div>

      {/* Page header — tight */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '0.2rem 0.5rem', borderRadius: '9999px', background: 'rgba(173,44,77,0.1)', color: 'var(--color-accent)' }}>
                Beta Access
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--color-on-surface)', margin: 0 }}>
              AI Career Toolkit
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0', lineHeight: 1.5 }}>
              Resume, interview, job match, and more — all in one place.
            </p>
          </div>
          <Link href="/dashboard/ai-tools/history" className="btn btn-outline btn-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>history</span>
            My results
          </Link>
        </div>
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

      {/* Voice interview */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center' }}>
        <Link
          href="/dashboard/ai-tools/voice-interview"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>mic</span>
          Voice mock interview (ElevenLabs)
        </Link>
      </div>

      <div className="wa-block wa-md:wa-hidden">
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
