import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import LeadershipContent from './LeadershipContent';

export const metadata: Metadata = buildPageMetadata({
  title: 'Board & Leadership',
  description:
    "Why WorkforceAP's leadership team makes us unusually credible: 25+ years Austin workforce experience, employer-side tech leaders, military discipline, and community roots.",
  path: '/leadership',
});

export default function LeadershipPage() {
  return (
    <div className="inner-page">
      {/* Hero / Mission Section */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1400 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 60%', minWidth: '300px' }}>
              <span
                className="text-label-upper"
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  background: 'rgba(173,44,77,0.1)',
                  color: 'var(--color-accent)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '1.5rem',
                  fontSize: '0.75rem',
                }}
              >
                Leadership &amp; Governance
              </span>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '2rem' }}>
                Stewards of the{' '}
                <span style={{ background: 'linear-gradient(to right, var(--color-accent-light), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Future Workforce.
                </span>
              </h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', maxWidth: '42rem', lineHeight: 1.7 }}>
                Our board and leadership bring the combination that makes WorkforceAP work:{' '}
                <strong>decades of Austin workforce experience</strong>,{' '}
                <strong>employer-side tech credibility</strong>,{' '}
                <strong>military and operations discipline</strong>, and{' '}
                <strong>community roots</strong> that connect training to real outcomes.
              </p>
            </div>
            <div style={{ flex: '1 1 30%', minWidth: '240px' }}>
              <div className="stitch-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-accent)' }}>
                  <span className="material-symbols-outlined">verified</span>
                  <span className="text-label-upper">Established 2024</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', fontStyle: 'italic', borderLeft: '2px solid rgba(173,44,77,0.2)', paddingLeft: '1rem', paddingBlock: '0.25rem' }}>
                  &ldquo;This isn&rsquo;t a generic nonprofit team. These are people who&rsquo;ve run programs at scale, led at Goodwill and Urban League, built systems at IBM and Microsoft, commanded in the Army and at AWS &mdash; and who show up for Austin.&rdquo;
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LeadershipContent />
      <Footer />
    </div>
  );
}
