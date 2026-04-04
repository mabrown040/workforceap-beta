import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import SkillMapperClient from '@/components/portal/tools/SkillMapperClient';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Skill Mapper',
  description: 'Explore occupation skills from O*NET. Visualize competency radar charts and top skills for any career path.',
  path: '/dashboard/ai-tools/skill-mapper',
});

export default async function SkillMapperPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/skill-mapper');

  return (
    <>
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <Link
            href="/dashboard/ai-tools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
              color: 'var(--color-accent)',
              textDecoration: 'none',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
          >
            ← AI Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>radar</span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                Skill Mapper
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0' }}>
                Search any occupation to see its top skills and competency radar chart.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem' }}>
          <div className="stitch-card" style={{ padding: '1rem', borderRadius: 12 }}>
            <SkillMapperClient />
          </div>
        </div>

        <MobileBottomNav variant="portal" />
      </div>

      <div className="wa-hidden wa-md:wa-block" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <Link
            href="/dashboard/ai-tools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.85rem',
              color: 'var(--color-on-surface-variant)',
              textDecoration: 'none',
              marginBottom: '0.75rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
            Back to AI Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)' }}>radar</span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Skill Mapper</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
                Search any occupation to see its top skills and competency radar chart.
              </p>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <div className="stitch-card" style={{ padding: '1.5rem' }}>
            <SkillMapperClient />
          </div>
        </div>
      </div>
    </>
  );
}
