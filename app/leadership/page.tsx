import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import LeadershipContent from './LeadershipContent';
import './leadership.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Board & Leadership',
  description:
    "Meet the leadership team behind WorkforceAP — decades of workforce experience, employer-side tech credibility, military discipline, and nationwide community impact.",
  path: '/leadership',
});

export default function LeadershipPage() {
  return (
    <div className="inner-page">
      {/* ── Hero Section ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .leadership-hero-grid { grid-template-columns: 1fr !important; }
        }
      `}} />
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1400 }}>
          <div
            className="editorial-grid leadership-hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '3rem',
              alignItems: 'start',
            }}
          >
            {/* Left — 2/3 */}
            <div>
              <span
                className="text-label-upper"
                style={{
                  display: 'inline-block',
                  padding: '0.3rem 0.85rem',
                  background: 'rgba(173,44,77,0.08)',
                  color: 'var(--color-accent)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '1.75rem',
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                }}
              >
                Our Leadership
              </span>

              <h1
                className="text-display-lg"
                style={{
                  color: 'var(--color-on-surface)',
                  marginBottom: '2rem',
                  lineHeight: 1.08,
                }}
              >
                Stewards of the{' '}
                <span
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-accent-light), var(--color-accent))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Future Workforce.
                </span>
              </h1>

              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--color-on-surface-variant)',
                  maxWidth: '44rem',
                  lineHeight: 1.75,
                }}
              >
                Our governance team combines{' '}
                <strong>decades of workforce development leadership</strong>,{' '}
                <strong>employer-side tech credibility</strong>,{' '}
                <strong>military and operations discipline</strong>, and{' '}
                <strong>deep community roots</strong> — connecting workforce
                training to real outcomes across the nation.
              </p>
            </div>

            {/* Right — 1/3 quote card */}
            <div
              style={{
                background: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-xl, 1rem)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--color-accent)',
                  alignSelf: 'flex-start',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">
                  verified
                </span>
                <span
                  className="text-label-upper"
                  style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}
                >
                  Established 2025
                </span>
              </div>

              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-on-surface-variant)',
                  fontStyle: 'italic',
                  borderLeft: '2px solid var(--color-accent)',
                  paddingLeft: '1rem',
                  lineHeight: 1.7,
                  margin: 0,
                  opacity: 0.85,
                }}
              >
                &ldquo;This isn&rsquo;t a generic nonprofit team. These are
                people who&rsquo;ve run programs at scale, led at Goodwill and
                Urban League, built systems at IBM and Microsoft, commanded in
                the Army and at AWS &mdash; and who show up nationwide.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      <LeadershipContent />
      <Footer />
    </div>
  );
}
