import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ProgramsContent from './ProgramsContent';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs in Austin, TX',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} free career training programs in Austin, TX. CompTIA, Google Cybersecurity, AWS Cloud, IBM Data Science, medical coding, manufacturing — no-cost certifications for qualifying Austin-area residents.`,
  path: '/programs',
});

export default function ProgramsPage() {
  return (
    <div className="inner-page programs-page">
      {/* Hero Section */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="editorial-grid">
            <div style={{ gridColumn: '1 / -1' }} className="programs-hero-left">
              <span className="text-label-upper" style={{ color: 'var(--color-gold)', marginBottom: '1rem', display: 'block' }}>
                Curated Excellence
              </span>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>
                Industry-Recognized <span style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}>Certifications.</span>
              </h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', maxWidth: '42rem', lineHeight: 1.7 }}>
                {WORKFORCEAP_PROGRAM_CATALOG_SIZE} no-cost career programs with industry certifications from Google, IBM, AWS, Microsoft, and CompTIA.
                Use fit, timeline, and readiness &mdash; not just the title &mdash; to choose your track.
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
                  style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'underline', textUnderlineOffset: '4px' }}
                >
                  Or compare programs side-by-side
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Decision Journey Nav */}
      <section className="content-section" style={{ paddingTop: '0.5rem', paddingBottom: 0 }}>
        <div className="container">
          <ProgramsDecisionJourneyNav current="programs" />
        </div>
      </section>

      {/* AI Support Callout */}
      <section className="content-section" style={{ paddingTop: '1rem', paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div className="stitch-card" style={{ padding: '1.5rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', margin: 0 }}>
              <strong>AI-powered support:</strong> After you enroll, the member portal includes guided tools for resumes,
              interviews, and applications &mdash; alongside counselor coaching.
            </p>
          </div>
        </div>
      </section>

      {/* Program Cards */}
      <ProgramsContent />

      {/* Journey Overview Section */}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', position: 'relative' }}>
            {[
              { num: '01', title: 'Assessment', desc: 'Discover your strengths through our career path mapping tool.' },
              { num: '02', title: 'Certification', desc: 'Intensive, self-paced or cohort-based training with industry mentors.' },
              { num: '03', title: 'Career Readiness', desc: 'Resume workshops, mock interviews, and professional brand building.' },
              { num: '04', title: 'Placement', desc: 'Direct connection to our network of 150+ employer partners.' },
            ].map((step) => (
              <div key={step.num} style={{ position: 'relative', textAlign: 'left' }}>
                <div style={{ fontSize: '3.75rem', fontWeight: 900, color: 'rgba(88,65,68,0.12)', position: 'absolute', top: '-2rem', left: 0, userSelect: 'none' }}>
                  {step.num}
                </div>
                <div style={{ position: 'relative', zIndex: 1, paddingTop: '1rem' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-accent)' }}>{step.title}</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="content-section" style={{ padding: '5rem 1rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--color-accent)', borderRadius: 'var(--radius-xl)', padding: '4rem 3rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <h2 className="text-display-sm" style={{ color: '#fff', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
            Your Next Step Starts Here
          </h2>
          <p style={{ color: 'rgba(255,203,209,0.9)', fontSize: '1.125rem', marginBottom: '2.5rem', maxWidth: '36rem', margin: '0 auto 2.5rem', position: 'relative', zIndex: 1 }}>
            Join 5,000+ graduates who have transitioned into high-paying tech careers through our scholarship programs.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
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

      <style>{`
        @media (min-width: 1024px) {
          .programs-hero-left { grid-column: 1 / 8 !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}
