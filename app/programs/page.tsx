import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ProgramsContent from './ProgramsContent';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs — Nationwide Certifications',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} free career training programs with industry certifications from IBM, Google, AWS, Microsoft, and CompTIA. No-cost certifications for qualifying residents nationwide.`,
  path: '/programs',
});

export default function ProgramsPage() {
  return (
    <div className="inner-page programs-page">
      {/* ── Hero Section ── */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="editorial-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem', alignItems: 'center' }}>
            {/* Left — 7 col */}
            <div className="programs-hero-left" style={{ gridColumn: '1 / 8' }}>
              <span
                className="text-label-upper"
                style={{ color: 'var(--color-gold)', marginBottom: '1rem', display: 'block' }}
              >
                Curated Excellence
              </span>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>
                Industry-Recognized{' '}
                <span style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}>Certifications.</span>
              </h1>
              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--color-on-surface-variant)',
                  maxWidth: '42rem',
                  lineHeight: 1.7,
                }}
              >
                Bridging the education-to-career gap with {WORKFORCEAP_PROGRAM_CATALOG_SIZE} no-cost
                certification programs built alongside{' '}
                <strong>IBM</strong>, <strong>Google</strong>, and <strong>Amazon</strong>.
                Use fit, timeline, and readiness&mdash;not just the title&mdash;to choose your track.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem', alignItems: 'center' }}>
                <ExperimentedCtaLink
                  experiment="programs_primary_cta"
                  variants={[
                    { id: 'control', label: 'Find Your Career \u2192', className: 'btn btn-primary', href: '/find-your-path' },
                    { id: 'quiz_first', label: 'Take 2-Min Quiz \u2192', className: 'btn btn-primary', href: '/find-your-path' },
                  ]}
                />
                <Link
                  href="/program-comparison"
                  style={{
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textDecoration: 'underline',
                    textUnderlineOffset: '4px',
                  }}
                >
                  Or compare programs side-by-side
                </Link>
              </div>
            </div>

            {/* Right — 5 col hero image */}
            <div className="programs-hero-right" style={{ gridColumn: '8 / -1', position: 'relative' }}>
              <div
                style={{
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '4 / 5',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                }}
              >
                <Image
                  src="/images/hero-people.jpg"
                  alt="Professionals collaborating on certification programs"
                  fill
                  style={{ objectFit: 'cover' }}
                  priority
                />
                {/* Gradient overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)',
                    borderRadius: 'var(--radius-xl)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Decision Journey Nav ── */}
      <section className="content-section" style={{ paddingTop: '0.5rem', paddingBottom: 0 }}>
        <div className="container">
          <ProgramsDecisionJourneyNav current="programs" />
        </div>
      </section>

      {/* ── Program Cards (dynamic, from ProgramsContent) ── */}
      <ProgramsContent />

      {/* ── Journey Section — 4-step flow ── */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
              The Workforce Advancement Journey
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '32rem', margin: '0 auto' }}>
              From enrollment to employment, we support every step of your professional evolution.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '2rem',
              position: 'relative',
            }}
            className="programs-journey-grid"
          >
            {[
              { num: '01', icon: 'assessment', title: 'Assessment', desc: 'Discover your strengths through our career path mapping tool.' },
              { num: '02', icon: 'workspace_premium', title: 'Certification', desc: 'Intensive, self-paced or cohort-based training with industry mentors.' },
              { num: '03', icon: 'trending_up', title: 'Career Readiness', desc: 'Resume workshops, mock interviews, and professional brand building.' },
              { num: '04', icon: 'handshake', title: 'Placement', desc: 'Direct connection to our network of 150+ employer partners.' },
            ].map((step) => (
              <div key={step.num} style={{ position: 'relative', textAlign: 'left', padding: '2rem 1.5rem' }}>
                <div
                  style={{
                    fontSize: '5rem',
                    fontWeight: 900,
                    color: 'var(--color-on-surface)',
                    opacity: 0.06,
                    position: 'absolute',
                    top: '0',
                    left: '1rem',
                    userSelect: 'none',
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </div>
                <div style={{ position: 'relative', zIndex: 1, paddingTop: '1.5rem' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: 'var(--color-accent)',
                      fontSize: '1.75rem',
                      marginBottom: '0.75rem',
                      display: 'block',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {step.icon}
                  </span>
                  <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-accent)' }}>
                    {step.title}
                  </h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="content-section" style={{ padding: '5rem 1rem' }}>
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            background: 'var(--color-accent)',
            borderRadius: 'var(--radius-xl)',
            padding: '4rem 3rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <h2
            className="text-display-sm"
            style={{ color: '#fff', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}
          >
            Your Next Step Starts Here
          </h2>
          <p
            style={{
              color: 'rgba(255,203,209,0.9)',
              fontSize: '1.125rem',
              marginBottom: '2.5rem',
              maxWidth: '36rem',
              margin: '0 auto 2.5rem',
              position: 'relative',
              zIndex: 1,
            }}
          >
            Join thousands of graduates who have transitioned into high-paying tech careers through
            our nationwide scholarship programs.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Link
              href="/apply"
              style={{
                background: 'var(--color-gold)',
                color: '#1c1b1b',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Start Application
            </Link>
            <Link
              href="/contact"
              style={{
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Talk to an Advisor
            </Link>
          </div>
        </div>
      </section>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1023px) {
          .programs-hero-left { grid-column: 1 / -1 !important; }
          .programs-hero-right { grid-column: 1 / -1 !important; }
          .programs-hero-right > div { aspect-ratio: 16 / 9 !important; max-height: 320px; }
          .programs-journey-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .programs-journey-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}
