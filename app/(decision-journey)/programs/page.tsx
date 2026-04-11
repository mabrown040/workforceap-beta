import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/app/seo';
import ProgramsContent from './ProgramsContent';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { PROGRAM_SUBGROUPS, orderedSubgroupIdsWithPrograms } from '@/lib/content/programSubgroup';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career Training Programs — Nationwide Certificates',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} free career training programs with industry certifications from IBM, Google, AWS, Microsoft, and CompTIA. No-cost certifications for qualifying residents nationwide.`,
  path: '/programs',
});

export default function ProgramsPage() {
  const mobileBrowseChips = [
    { href: '#program-catalog', label: 'All' },
    ...orderedSubgroupIdsWithPrograms(PROGRAMS).map((id) => ({
      href: `#subgroup-${id}`,
      label: PROGRAM_SUBGROUPS.find((s) => s.id === id)?.shortLabel ?? id,
    })),
  ];

  return (
    <div className="inner-page programs-page marketing-stack marketing-stack--enter">
      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT ≤640px — Stitch-aligned
          ══════════════════════════════════════════════ */}
      {/* Inline styles only: Tailwind uses wa- prefix — unprefixed utility classes do not exist in CSS */}
      <div className="marketing-mobile marketing-mobile-pb-for-bottom-nav" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
        <div style={{ paddingTop: '1.25rem', paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
          <div style={{ marginBottom: '1.75rem', marginTop: '0.75rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--color-on-surface)', margin: 0 }}>
              Find the Right <br />
              <span style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>Program</span>
            </h2>
            <div style={{ height: '4px', width: '3rem', marginTop: '0.75rem', borderRadius: '9999px', background: 'var(--color-gold)' }} />
          </div>

          <div
            style={{
              display: 'flex',
              overflowX: 'auto',
              gap: '0.5rem',
              marginBottom: '1.75rem',
              marginLeft: '-1.25rem',
              marginRight: '-1.25rem',
              paddingLeft: '1.25rem',
              paddingRight: '1.25rem',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {mobileBrowseChips.map((chip, i) => (
              <a
                key={chip.href + chip.label}
                href={chip.href}
                style={{
                  flexShrink: 0,
                  padding: '0.625rem 1.25rem',
                  minHeight: '44px',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  ...(i === 0 ? { background: 'var(--color-accent)', color: 'var(--color-white, #fff)' } : { background: 'var(--surface-container-low)', color: 'var(--color-on-surface-variant)' }),
                }}
              >
                {chip.label}
              </a>
            ))}
          </div>

          <section style={{ marginBottom: '2.25rem' }}>
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                color: 'var(--color-white, #fff)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))',
                minHeight: 200,
              }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '8rem', height: '8rem', borderRadius: '9999px', marginRight: '-4rem', marginTop: '-4rem', background: 'rgba(255,255,255,0.05)', filter: 'blur(20px)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', background: 'var(--color-gold)', color: 'var(--color-on-surface)' }}>Start Here</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Digital Literacy</h2>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0, color: 'rgba(255,203,209,0.9)' }}>Essential skills for the modern workforce</p>
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.7, fontWeight: 500 }}>Duration</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>4 weeks</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.7, fontWeight: 500 }}>Cost</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>$0 cost</span>
                  </div>
                </div>
                <Link href="/programs/digital-literacy-empowerment-class" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-white, #fff)', color: 'var(--color-accent-dark)', flexShrink: 0 }} aria-label="Open Digital Literacy program">
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>

          <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '0.5rem' }}>
            <a href="#program-catalog" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent-dark)', textDecoration: 'none' }}>
              See all programs
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_forward</span>
            </a>
          </div>
        </div>

        <div
          className="marketing-mobile-sticky-above-bottom-nav"
          style={{
            position: 'fixed',
            zIndex: 40,
            left: 0,
            right: 0,
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          <Link
            href="/find-your-path"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '0.75rem',
              padding: '1rem',
              minHeight: '48px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              background: 'var(--color-on-surface)',
              color: 'var(--color-white, #fff)',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true">psychology</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.3 }}>Not sure where to start? Take the Pathfinder quiz</span>
            </div>
            <span className="material-symbols-outlined" style={{ flexShrink: 0 }} aria-hidden="true">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP LAYOUT ≥641px
          ══════════════════════════════════════════════ */}
      <div className="marketing-desktop">

      {/* ── Hero Section ── */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="editorial-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem', alignItems: 'center' }}>
            {/* Left — 7 col */}
            <div className="programs-hero-left" style={{ gridColumn: '1 / 8' }}>
              <span
                className="text-label-upper"
                style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'block' }}
              >
                Choose Your Path
              </span>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>
                Find the right program{' '}
                <span style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}>for your goals.</span>
              </h1>
              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--color-on-surface-variant)',
                  maxWidth: '42rem',
                  lineHeight: 1.7,
                }}
              >
                WorkforceAP offers {WORKFORCEAP_PROGRAM_CATALOG_SIZE} no-cost programs that help members
                build practical skills and move toward better employment. Use the guided tools below to
                find the best fit&mdash;based on your interests, timeline, and where you want to go.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem', alignItems: 'center' }}>
                <ExperimentedCtaLink
                  experiment="programs_primary_cta"
                  variants={[
                    { id: 'control', label: 'Find Your Career Path \u2192', className: 'btn btn-primary', href: '/find-your-path' },
                    { id: 'quiz_first', label: 'Take the Quiz \u2192', className: 'btn btn-primary', href: '/find-your-path' },
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
                  Compare programs side-by-side
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

      </div>{/* end desktop: hero */}

      {/* ══════════════════════════════════════════════
          HOW TO CHOOSE + TOOL ROUTING — desktop only
          ══════════════════════════════════════════════ */}
      <div className="marketing-desktop">

      {/* ── Tool Routing ── */}
      <section style={{ padding: '3rem 0 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <Link
              href="/find-your-path"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.875rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent)',
                color: 'var(--color-white, #fff)',
                fontWeight: 700,
                fontSize: '0.9375rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">psychology</span>
              Find Your Career Path — Take the Quiz
            </Link>
            <Link
              href="/program-comparison"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.875rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-accent)',
                color: 'var(--color-accent)',
                fontWeight: 700,
                fontSize: '0.9375rem',
                textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">compare_arrows</span>
              Compare Programs
            </Link>
            <Link
              href="/salary-guide"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.875rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--outline-variant)',
                color: 'var(--color-on-surface)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">payments</span>
              View Salary Guide
            </Link>
          </div>
        </div>
      </section>

      {/* ── How to Choose ── */}
      <section style={{ padding: '3rem 0 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem 3rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.375rem',
                fontWeight: 800,
                color: 'var(--color-on-surface)',
                marginBottom: '0.5rem',
              }}
            >
              How to choose a program
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.75rem', maxWidth: '44rem' }}>
              The right program depends on where you are now and where you want to go. Consider these
              factors before picking a track:
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {[
                { icon: 'interests', label: 'Your interests', desc: 'What topics genuinely curious you — tech, healthcare, business, or something else.' },
                { icon: 'devices', label: 'Comfort with technology', desc: 'Some programs assume no prior tech experience; others move faster from day one.' },
                { icon: 'schedule', label: 'Your timeline', desc: 'How quickly you need to be working. Programs range from 4 weeks to several months.' },
                { icon: 'work', label: 'Job direction', desc: 'The specific roles you\'re aiming for — knowing the title helps narrow the track.' },
                { icon: 'trending_up', label: 'Learning curve preference', desc: 'Whether you want a beginner-friendly ramp or a steeper, faster path into a field.' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--color-accent)', fontSize: '1.5rem', flexShrink: 0, marginTop: '0.125rem' }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: '0 0 0.25rem' }}>{item.label}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '1.75rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
              Not sure which factors apply to you?{' '}
              <Link href="/find-your-path" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                Pathfinder walks you through it in about two minutes.
              </Link>
            </p>
          </div>
        </div>
      </section>

      </div>{/* end how-to-choose desktop */}

      {/* Full catalog — one anchor `#program-catalog` for mobile + desktop + deep links */}
      <div id="program-catalog" className="programs-page-catalog-anchor" style={{ scrollMarginTop: '0.75rem' }}>
        <ProgramsContent sectionId={null} />
      </div>

      <div className="marketing-desktop">

      {/* ── Journey Section — 4-step flow ── */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
              From enrollment to employment
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '32rem', margin: '0 auto' }}>
              WorkforceAP supports members at every step — from choosing a program through landing a job in their field.
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
              { num: '01', icon: 'assessment', title: 'Find Your Fit', desc: 'Use Pathfinder to match your interests, timeline, and goals to the right program.' },
              { num: '02', icon: 'workspace_premium', title: 'Build Skills', desc: 'Complete self-paced or cohort-based training and earn an industry-recognized certificate.' },
              { num: '03', icon: 'trending_up', title: 'Get Job-Ready', desc: 'Resume review, mock interviews, and practical preparation for the roles you\'re targeting.' },
              { num: '04', icon: 'handshake', title: 'Connect to Work', desc: 'Direct introductions to our network of employer partners actively hiring program completers.' },
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
                      '--ms-fill': 1,
                    }}
                   aria-hidden="true">
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
            style={{ color: 'var(--color-white, #fff)', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}
          >
            Ready to take the next step?
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
            No-cost training and job-placement support for eligible members — built with employers
            so you move into real work in your field.
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
                color: 'var(--color-on-surface)',
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
                color: 'var(--color-white, #fff)',
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

      {/* Responsive styles (layout toggle lives at top of page) */}
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

      </div>{/* end desktop wrapper */}

    </div>
  );
}
