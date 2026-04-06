import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find your career',
  description: 'O*NET Interest Profiler and O*NET skill mapping — choose how to explore careers.',
  path: '/dashboard/learning/find-your-career',
});

export default async function FindYourCareerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/learning/find-your-career');

  return (
    <>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>
          <Link href="/dashboard/learning" style={{ color: 'var(--color-accent)' }}>
            Learning Hub
          </Link>
          <span style={{ margin: '0 0.35rem' }}>/</span>
          <span>Find your career</span>
        </nav>

        <h1 className="portal-page-title" style={{ marginBottom: '0.5rem' }}>
          Find your career
        </h1>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          Pick the path that fits right now. The <strong>Interest Profiler</strong> surfaces what you like to do (RIASEC).
          <strong> Skill mapping</strong> shows what occupations require — helpful if you already have a target role.
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <li>
            <Link
              href="/dashboard/learning/interest-profiler"
              className="stitch-card"
              style={{
                display: 'block',
                padding: '1.25rem',
                borderRadius: 12,
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>
                  explore
                </span>
                <strong style={{ fontSize: '1.05rem' }}>O*NET Interest Profiler</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>
                30-question Mini-IP, RIASEC scores, and ties to WorkforceAP programs.
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/ai-tools/skill-mapper"
              className="stitch-card"
              style={{
                display: 'block',
                padding: '1.25rem',
                borderRadius: 12,
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>
                  radar
                </span>
                <strong style={{ fontSize: '1.05rem' }}>O*NET skill mapping</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>
                Explore occupation skills, competency charts, and gaps — same experience as Career Tools → AI Tools → Skill
                mapping.
              </p>
            </Link>
          </li>
        </ul>

        <p style={{ marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
          O*NET Interest Profiler™ is a trademark of the U.S. Department of Labor. WorkforceAP uses O*NET Web Services under
          license for educational purposes.
        </p>
      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
