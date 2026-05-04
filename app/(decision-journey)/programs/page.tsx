import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/app/seo';
import ProgramsContent from './ProgramsContent';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { PROGRAM_SUBGROUPS, orderedSubgroupIdsWithPrograms } from '@/lib/content/programSubgroup';
import { getServerLabel as t } from '@/lib/i18n/serverLabels';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career Training Programs — Nationwide Certificates',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} career training programs offered at no cost to members, with industry certifications from IBM, Google, AWS, Microsoft, and CompTIA. Nationwide pathways supported by grants and partnerships.`,
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
                {t('Choose Your Path')}
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
                    { id: 'control', label: 'Find Your Path \u2192', className: 'btn btn-primary', href: '/find-your-path' },
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

      <section style={{ padding: '2rem 0 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.5rem' }}>
                  {t('Quick start')}
                </p>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: 0 }}>
                  {t('Start with the lane that fits you best.')}
                </h2>
              </div>
              <Link href="/find-your-path" style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                {t('Not sure? Take the 2-minute pathfinder')}
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              {[
                {
                  eyebrow: 'Beginner-safe',
                  title: 'New to Tech',
                  desc: 'Start with a smoother on-ramp if you want to build confidence with computers before jumping into faster technical tracks.',
                  href: '/programs/digital-literacy-empowerment-class',
                  cta: 'See Digital Literacy path',
                },
                {
                  eyebrow: 'Move quickly',
                  title: 'Fastest path to a job',
                  desc: 'If you need a faster route into tech, start with IT Support. It is one of the clearest paths into real entry-level roles and can open the door to what comes next.',
                  href: '/programs/it-support-professional-certificate-ibm',
                  cta: 'See IT Support path',
                },
                {
                  eyebrow: 'Salary upside',
                  title: 'Strongest earning potential',
                  desc: 'If long-term pay matters most, start with practical technical tracks like IT Support, then explore Cybersecurity and Cloud paths that can lead to stronger salary ceilings.',
                  href: '#subgroup-it-support',
                  cta: 'See IT and Cyber paths',
                },
                {
                  eyebrow: 'People-facing',
                  title: 'Business and customer-facing work',
                  desc: 'If you like organizing, communicating, or helping teams and customers, start with business-oriented options.',
                  href: '#subgroup-leadership',
                  cta: 'Browse business paths',
                },
                {
                  eyebrow: 'Technical and Hands-On',
                  title: 'IT, Cybersecurity, and Practical Technical Work',
                  desc: 'If you want direct technical problem-solving, start with hands-on IT and operations-focused programs.',
                  href: '#subgroup-it-support',
                  cta: 'Browse technical paths',
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-container-high)',
                    border: '1px solid var(--outline-variant)',
                    textDecoration: 'none',
                    color: 'inherit',
                    minHeight: '100%',
                  }}
                >
                  <div>
                    <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.5rem' }}>{item.eyebrow}</p>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: '0 0 0.5rem' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>{item.desc}</p>
                  </div>
                  <span style={{ marginTop: 'auto', color: 'var(--color-accent)', fontWeight: 700 }}>
                    {item.cta} →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW TO CHOOSE + TOOL ROUTING — desktop only
          ══════════════════════════════════════════════ */}
      <div>

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
              {t('Find Your Path — Take the Quiz')}
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
              {t('Compare Programs')}
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
              {t('View Salary Guide')}
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
              {t('How to choose a program')}
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
                { icon: 'interests', label: 'Your interests', desc: 'What genuinely interests you — tech, healthcare, business, or something else.' },
                { icon: 'devices', label: 'Comfort with technology', desc: 'Some programs assume no prior tech experience; others move faster from day one.' },
                { icon: 'schedule', label: 'Your timeline', desc: 'How quickly you need to be working. Some tracks move in 5-hour sections, while others span several months.' },
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

      </div>{/* end how-to-choose */}

      {/* Full catalog — one anchor `#program-catalog` for mobile + desktop + deep links */}
      <div id="program-catalog" className="programs-page-catalog-anchor" style={{ scrollMarginTop: '0.75rem' }}>
        <ProgramsContent sectionId={null} />
      </div>

      <div>

      {/* ── Journey Section — 4-step flow ── */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
              {t('From enrollment to employment')}
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
            {t('Ready to take the next step?')}
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
              {t('Start Application')}
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
              {t('Talk to an Advisor')}
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
        @media (max-width: 767px) {
          .programs-journey-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      </div>{/* end responsive wrapper */}

    </div>
  );
}
