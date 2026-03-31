import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Workforce Development Training & Certifications',
  description:
    'How WorkforceAP works: employer-aligned training, no-cost to participants, job placement support. Operating model that scales beyond one market.',
  path: '/what-we-do',
});

const BENTO_ITEMS = [
  {
    icon: 'school',
    title: 'Employer-Led Curricula',
    desc: 'Training programs designed in direct partnership with employers — Google, IBM, AWS, CompTIA — so every credential maps to an open role.',
    span: 'tall',
  },
  {
    icon: 'lock_open',
    title: 'Zero-Barrier Access',
    desc: 'No tuition. No prerequisites. Funding comes from grants and employer partnerships, never from participants. Career training should be a right, not a privilege.',
    span: 'large',
  },
  {
    icon: 'verified',
    title: 'Validated Outcomes',
    desc: 'Industry-recognized certificates. Skills assessments. Job placement support. We measure what matters — jobs landed.',
    span: 'small',
  },
  {
    icon: 'hub',
    title: 'Regional Scalability',
    desc: 'A repeatable model built to serve communities nationwide — not just one local market.',
    span: 'small',
  },
];

const VALUES = [
  {
    num: '01',
    title: 'Equity as Foundation',
    desc: 'Fair access to opportunity — no one should pay for the training that gets them hired. We dismantle systemic barriers by design.',
  },
  {
    num: '02',
    title: 'Outcome-Obsessed',
    desc: 'Our success metric is your hire. When you land a job, we\'ve done our job. Every program, partnership, and dollar is measured by career outcomes.',
  },
  {
    num: '03',
    title: 'Radical Partnership',
    desc: 'Government, employers, community orgs — we leverage collective strength so participants don\'t carry the load alone.',
  },
];

export default function WhatWeDoPage() {
  return (
    <div className="inner-page">
      <div className="wa-hidden md:wa-block marketing-desktop">
      {/* ── Hero ── */}
      <section
        style={{
          position: 'relative',
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Background image + gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url(https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1600&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(18,20,22,0.92) 0%, rgba(18,20,22,0.7) 50%, rgba(173,44,77,0.3) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 'var(--max-width)', padding: '6rem 1.5rem' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.375rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--color-gold)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', verticalAlign: '-2px', marginRight: '0.35rem' }}>
              history_edu
            </span>
            Creating Opportunity for All Since 1999
          </span>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: 'var(--color-white)',
              maxWidth: '48rem',
              marginBottom: '2rem',
            }}
          >
            Redefining the Architecture{' '}
            <span style={{ color: 'var(--color-accent)' }}>of Opportunity</span>
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              color: 'rgba(255,255,255,0.75)',
              maxWidth: '36rem',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
            }}
          >
            Employer-aligned training. No cost to participants. Job placement built in.
            A model that works — and scales.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <Link
              href="/programs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--color-accent)',
                color: '#fff',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'var(--transition-base)',
              }}
            >
              Explore Our Impact
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_forward</span>
            </Link>
            <Link
              href="/contact?topic=partnership"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'var(--transition-base)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>handshake</span>
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

      {/* ── Legacy Section ── */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '3rem',
              alignItems: 'center',
            }}
          >
            {/* Leader portrait with overlay card */}
            <div style={{ gridColumn: 'span 5', position: 'relative' }} className="wwd-legacy-portrait">
              <div
                style={{
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  aspectRatio: '3 / 4',
                  background: 'var(--surface-container)',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80"
                  alt="Diverse team collaborating on workforce development"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '-1.5rem',
                  right: '-1.5rem',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  padding: '1.5rem 2rem',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-glow-accent)',
                }}
              >
                <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>25+</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
                  Years
                </div>
              </div>
            </div>

            {/* Text content */}
            <div style={{ gridColumn: 'span 7' }} className="wwd-legacy-text">
              <h2
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-on-surface)',
                  lineHeight: 1.1,
                  marginBottom: '1.5rem',
                }}
              >
                Investing in the Future{' '}
                <span style={{ color: 'var(--color-accent)' }}>Workforce</span>
              </h2>

              <blockquote
                style={{
                  borderLeft: '3px solid var(--color-accent)',
                  paddingLeft: '1.5rem',
                  margin: '0 0 2rem',
                  color: 'var(--color-on-surface-variant)',
                  fontSize: '1.125rem',
                  fontStyle: 'italic',
                  lineHeight: 1.7,
                }}
              >
                Built on 25+ years of workforce development — Goodwill, Austin Area Urban League,
                state and local initiatives. We know what works. Employers fund talent pipelines.
                Grants fund access. We don&rsquo;t charge participants.
              </blockquote>

              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '2rem' }}>
                Our programs align with <strong>WIOA (Workforce Innovation and Opportunity Act)</strong> eligibility
                criteria, including low-income individuals, dislocated workers, adult learners, and veterans seeking
                career advancement.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem',
                }}
              >
                <div
                  style={{
                    padding: '1.5rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                    borderLeft: '3px solid var(--color-gold)',
                  }}
                >
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--color-gold)', lineHeight: 1 }}>
                    $700M+
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600 }}>
                    Cumulative economic impact across programs and placements
                  </div>
                </div>
                <div
                  style={{
                    padding: '1.5rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                    borderLeft: '3px solid var(--color-accent)',
                  }}
                >
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1 }}>
                    2,000+
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600 }}>
                    Lives impacted through workforce programs over 25 years
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Architecture of Impact — Bento Grid ── */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
              }}
            >
              The Architecture of{' '}
              <span style={{ color: 'var(--color-accent)' }}>Impact</span>
            </h2>
          </div>

          <div
            className="wwd-bento-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gridAutoRows: 'minmax(180px, auto)',
              gap: '1.5rem',
            }}
          >
            {BENTO_ITEMS.map((item, i) => {
              const spanStyles: Record<string, React.CSSProperties> = {
                tall: { gridColumn: 'span 4', gridRow: 'span 2' },
                large: { gridColumn: 'span 8', gridRow: 'span 1' },
                small: { gridColumn: 'span 4', gridRow: 'span 1' },
              };
              return (
                <div
                  key={item.title}
                  className="stitch-card"
                  style={{
                    ...spanStyles[item.span],
                    padding: '2.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    gap: '1rem',
                    background: i === 0
                      ? 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))'
                      : 'var(--surface-container)',
                    borderRadius: 'var(--radius-xl)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'var(--transition-base)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '2.5rem',
                      color: i === 0 ? 'rgba(255,255,255,0.9)' : 'var(--color-accent)',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {item.icon}
                  </span>
                  <h3
                    style={{
                      fontSize: item.span === 'small' ? '1.125rem' : '1.5rem',
                      fontWeight: 700,
                      color: i === 0 ? '#fff' : 'var(--color-on-surface)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: i === 0 ? 'rgba(255,255,255,0.8)' : 'var(--color-on-surface-variant)',
                      lineHeight: 1.7,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Values Section ── */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
              }}
            >
              What We Stand For
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }} className="wwd-values-grid">
            {VALUES.map((v) => (
              <div
                key={v.num}
                style={{
                  padding: '2.5rem',
                  background: 'var(--surface-container)',
                  borderRadius: 'var(--radius-xl)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'var(--transition-base)',
                }}
              >
                {/* Large hover number */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-0.5rem',
                    right: '1rem',
                    fontSize: '8rem',
                    fontWeight: 900,
                    color: 'var(--color-accent)',
                    opacity: 0.06,
                    lineHeight: 1,
                    pointerEvents: 'none',
                    transition: 'var(--transition-base)',
                  }}
                >
                  {v.num}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '1rem',
                  }}
                >
                  {v.num}
                </div>
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--color-on-surface)',
                    marginBottom: '0.75rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {v.title}
                </h3>
                <p
                  style={{
                    color: 'var(--color-on-surface-variant)',
                    lineHeight: 1.7,
                    fontSize: '0.9rem',
                  }}
                >
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            style={{
              textAlign: 'center',
              padding: '5rem 3rem',
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
              borderRadius: 'var(--radius-xl)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 30% 50%, rgba(255,187,0,0.12) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.02em',
                marginBottom: '1rem',
                position: 'relative',
              }}
            >
              Ready to Build the Future?
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '1.125rem',
                maxWidth: '32rem',
                margin: '0 auto 2.5rem',
                position: 'relative',
              }}
            >
              Join individuals who are transforming their careers through employer-aligned training and certifications.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', position: 'relative' }}>
              <Link
                href="/apply"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#fff',
                  color: 'var(--color-accent)',
                  padding: '1rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Apply Now
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_forward</span>
              </Link>
              <Link
                href="/programs"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  padding: '1rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Explore Programs
              </Link>
              <Link
                href="/leadership"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--color-gold)',
                  color: 'var(--color-on-surface)',
                  padding: '1rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Meet Our Team
              </Link>
            </div>
          </div>
        </div>
      </section>
      </div>{/* end desktop */}

      <div className="md:wa-hidden marketing-mobile marketing-mobile-pb-for-bottom-nav">
      {/* ── Mobile-only Stitch layout (≤640px) ── */}
      <section className="px-4 pt-10 pb-4" style={{ background: 'var(--color-surface)' }}>
        {/* Hero H1 with gradient span */}
        <span className="block text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#8c0f37' }}>Our Impact</span>
        <h2 className="text-4xl font-extrabold tracking-tight leading-[1.1] mb-6" style={{ color: 'var(--color-on-surface)' }}>
          Bridging the{' '}
          <span style={{ background: 'linear-gradient(135deg, #8c0f37 0%, #ad2c4d 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Opportunity Gap
          </span>{' '}
          with a training-to-workforce engine.
        </h2>

        {/* Impact stats 2×2 grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { val: '2,000+', label: 'People Served', accent: '#8c0f37' },
            { val: '$0', label: 'Cost to Members', accent: '#7b5800' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-5" style={{ background: '#f0edec', borderLeft: `4px solid ${s.accent}` }}>
              <div className="text-2xl font-black" style={{ color: s.accent }}>{s.val}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mobile-only: Mission/Values cards stacked (≤640px) ── */}
      <section className="px-4 pb-8" style={{ background: 'var(--color-surface)' }}>
        <h2 className="text-2xl font-bold tracking-tight mb-5" style={{ color: 'var(--color-on-surface)' }}>Our Core Values</h2>
        <div className="space-y-4">
          {[
            { icon: 'payments', title: 'Access First', desc: "Education shouldn't have a paywall. We believe talent is universal, but opportunity is not.", accent: '#8c0f37' },
            { icon: 'handshake', title: 'Employer Aligned', desc: 'We train for the roles companies actually need, ensuring your new skills are in high demand.', accent: '#7b5800' },
            { icon: 'verified', title: 'Outcome Accountable', desc: 'Success is measured by your paycheck. Our model only works when you are working.', accent: '#8c0f37' },
          ].map((v) => (
            <div key={v.title} className="rounded-xl p-5" style={{ background: 'var(--surface-container-low)', boxShadow: '0 2px 8px rgba(28,27,27,0.06)' }}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg" style={{ background: `${v.accent}10` }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: v.accent }}>{v.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-on-surface)' }}>{v.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>{v.desc}</p>
b3850e5 (fix: what-we-do mobile broken H1 tag, dead CTAs, Take Action button now routes)
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mobile-only: 4-step program flow (≤640px) ── */}
      <section className="px-4 py-10" style={{ background: '#f0edec' }}>
        <h2 className="text-2xl font-bold tracking-tight mb-7" style={{ color: 'var(--color-on-surface)' }}>The Journey</h2>
        <div className="space-y-5 relative">
          <div className="absolute left-[22px] top-2 bottom-2 w-px" style={{ background: 'rgba(140,15,55,0.2)' }} />
          {[
            { step: '01', title: 'Application', desc: '10-minute online form to start your journey and share your potential.' },
            { step: '02', title: 'Training', desc: 'Industry-aligned curriculum from global leaders in tech and business.' },
            { step: '03', title: 'Certification', desc: 'Earn credentials recognized by top employers as a mark of excellence.' },
            { step: '04', title: 'Placement', desc: 'Direct pipeline to hiring partners and long-term career support.' },
          ].map((s) => (
            <div key={s.step} className="relative pl-12">
              <div className="absolute left-[14px] top-1 w-4 h-4 rounded-full border-4" style={{ background: '#8c0f37', borderColor: '#f0edec', outline: '3px solid rgba(140,15,55,0.1)' }} />
              <span className="block text-[10px] font-black tracking-widest uppercase mb-1" style={{ color: '#ad2c4d' }}>Step {s.step}</span>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-on-surface)' }}>{s.title}</h3>
              <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>{s.desc}</p>
b3850e5 (fix: what-we-do mobile broken H1 tag, dead CTAs, Take Action button now routes)
            </div>
          ))}
        </div>
      </section>

      {/* ── Mobile-only: Partner pills (≤640px) ── */}
      <section className="px-4 py-10" style={{ background: 'var(--color-surface)' }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-center mb-5" style={{ color: 'var(--color-on-surface-variant)' }}>Supported By Industry Giants</p>
b3850e5 (fix: what-we-do mobile broken H1 tag, dead CTAs, Take Action button now routes)
        <div className="flex flex-wrap justify-center gap-2">
          {['Google', 'IBM', 'AWS', 'CompTIA', 'Coursera'].map((p) => (
            <span key={p} className="px-4 py-2 rounded-full text-xs font-bold" style={{ background: '#e5e2e1', color: 'var(--color-on-surface)' }}>{p}</span>
          ))}
        </div>
      </section>

      {/* ── Mobile-only: Bottom CTA band (≤640px) ── */}
      <section
        style={{
          padding: '2.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          background: '#1c1b1b',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff' }}>Ready to transform your career?</h2>
        <Link
          href="/apply"
          style={{
            display: 'block',
            width: '100%',
            maxWidth: '24rem',
            fontWeight: 700,
            padding: '1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '0.75rem',
            background: '#8c0f37',
            color: '#fff',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          Start an Application
        </Link>
        <Link
          href="/how-it-works"
          style={{
            display: 'block',
            width: '100%',
            maxWidth: '24rem',
            fontWeight: 700,
            padding: '1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            border: '1px solid rgba(252,249,248,0.2)',
            color: 'var(--color-surface)',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          See the Process
        </Link>
      </section>
      </div>{/* end mobile */}

      <style>{`
        @media (max-width: 1023px) {
          .wwd-legacy-portrait { grid-column: span 12 !important; max-width: 400px; margin: 0 auto; }
          .wwd-legacy-text { grid-column: span 12 !important; }
          .wwd-values-grid { grid-template-columns: 1fr !important; }
          .wwd-bento-grid > div { grid-column: span 12 !important; grid-row: span 1 !important; }
        }
        @media (max-width: 767px) {
          .wwd-legacy-portrait { max-width: 100%; }
        }
      `}</style>

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
