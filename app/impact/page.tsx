import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Our Impact',
  description:
    'See how Workforce Advancement Project expands access to career training through employer-aligned programs, partnerships, and member support.',
  path: '/impact',
});

const IMPACT_STATS = [
  { value: '25+', label: 'Years removing barriers to workforce opportunity' },
  { value: '2,000+', label: 'Learners trained through WorkforceAP-led programs' },
  { value: `${WORKFORCEAP_PROGRAM_CATALOG_SIZE}`, label: 'Career tracks aligned to real employer demand' },
  { value: '$0', label: 'No cost for members — funded by grants and partnerships' },
];

export default function ImpactPage() {
  return (
    <div className="inner-page marketing-mobile-pb-for-bottom-nav">
      <section className="content-section" style={{ paddingBottom: '2rem' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ maxWidth: '48rem', marginBottom: '2.5rem' }}>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'block' }}>
              Our Impact
            </span>
            <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
              Workforce development built for <span style={{ color: 'var(--color-accent)' }}>access, outcomes, and scale</span>
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.8, margin: 0 }}>
              Workforce Advancement Project helps people move into stronger career paths through no-cost training, employer-informed program design,
              and wraparound support that keeps momentum moving after enrollment.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '2.5rem',
            }}
          >
            {IMPACT_STATS.map((stat) => (
              <div key={stat.label} className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1, marginBottom: '0.75rem' }}>
                  {stat.value}
                </div>
                <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <section className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
              <h2 style={{ color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>How the model works</h2>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, margin: 0 }}>
                Employer partnerships and public funding help cover program access, support services, and workforce readiness so members can focus on learning and placement.
              </p>
            </section>

            <section className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
              <h2 style={{ color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>What members receive</h2>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, margin: 0 }}>
                Career-aligned training, recognized certificates, structured guidance, and support with applications, resumes, and employer introductions when timing is right.
              </p>
            </section>

            <section className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
              <h2 style={{ color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>Why it matters</h2>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, margin: 0 }}>
                The goal is not just course completion. It is durable movement toward employment, higher earnings, and clearer next steps for the people and communities WorkforceAP serves.
              </p>
            </section>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '2rem' }}>
            <Link href="/apply" className="btn btn-primary">Apply Now</Link>
            <Link href="/what-we-do" className="btn btn-outline">Learn How It Works</Link>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
