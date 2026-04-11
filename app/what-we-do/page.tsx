import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

export const metadata: Metadata = buildPageMetadata({
  title: 'Workforce Development Training & Industry Certificates',
  description:
    'WorkforceAP: 25+ years of workforce development. Employer-aligned training, no cost to members, job placement support — a proven model that scales.',
  path: '/what-we-do',
});

const BENTO_ITEMS = [
  {
    icon: 'school',
    title: 'Employer-Influenced Curricula',
    desc: 'Training programs shaped with employer input — Google, IBM, AWS, Microsoft, CompTIA — so credentials map to real hiring needs.',
    span: 'tall',
  },
  {
    icon: 'lock_open',
    title: 'Zero-Barrier Access',
    desc: 'No tuition for members. No prerequisites. Funding comes from grants and partnerships — members are never charged for access.',
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
    title: 'Access as Foundation',
    desc: 'Fair access to opportunity. We work with community organizations, public partners, and employers so more people can reach training and careers.',
  },
  {
    num: '02',
    title: 'Outcome Focus',
    desc: 'Every program, partnership, and investment is designed to expand opportunities, strengthen skills, and deliver meaningful life and career outcomes.',
  },
  {
    num: '03',
    title: 'Key Partnerships',
    desc: 'Government, Employers, Non-profit & Community Organizations, and Churches — we leverage collective strength so members don\'t carry the load alone.',
  },
];

export default function WhatWeDoPage() {
  return (
    <div className="inner-page">
      <div className="marketing-desktop">
      {/* ── Hero ── */}
      <section
        className="wwd-photo-hero"
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
              'linear-gradient(135deg, rgba(18,20,22,0.94) 0%, rgba(18,20,22,0.72) 45%, rgba(173,44,77,0.28) 100%)',
          }}
        />
        {/* Extra bottom scrim so body copy stays readable on bright areas of the photo */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 42%)',
            pointerEvents: 'none',
          }}
          aria-hidden={true}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 'var(--max-width)', padding: '6rem 1.5rem' }}>
          <span
            className="wwd-photo-hero__eyebrow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.375rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#ffe082',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
              textShadow: '0 1px 3px rgba(0,0,0,0.65)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.875rem', marginRight: '0.35rem', color: 'inherit' }}
              aria-hidden
            >
              history_edu
            </span>
            Creating Opportunity for All Since 1999
          </span>

          <h1
            className="wwd-photo-hero__title"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              maxWidth: '48rem',
              marginBottom: '2rem',
              textShadow: '0 2px 32px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.6)',
            }}
          >
            Creating{' '}
            <span style={{ color: '#ffb2bc' }}>Opportunity</span>
          </h1>

          <p
            className="wwd-photo-hero__lede"
            style={{
              fontSize: '1.25rem',
              color: 'rgba(255,255,255,0.94)',
              maxWidth: '36rem',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
              textShadow: '0 1px 18px rgba(0,0,0,0.5)',
            }}
          >
            Employer-aligned training. No cost to members. Job placement built in.
            A model that works — and scales.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <Link
              href="/programs"
              className="wwd-photo-hero__cta-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--color-accent)',
                color: '#ffffff',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'var(--transition-base)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              }}
            >
              Explore Our Impact
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'inherit' }} aria-hidden>
                arrow_forward
              </span>
            </Link>
            <Link
              href="/contact?topic=partnership"
              className="wwd-photo-hero__cta-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid rgba(255,255,255,0.28)',
                color: '#ffffff',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'var(--transition-base)',
                textShadow: '0 1px 10px rgba(0,0,0,0.45)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'inherit' }} aria-hidden>
                handshake
              </span>
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

      {/* Find Your Career CTA */}
      <section style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--color-light)' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>Not sure where to start?</p>
        <a href="/find-your-path" className="btn btn-accent btn-lg" style={{ fontSize: '1.1rem', padding: '0.875rem 2rem' }}>
          Find Your Career
        </a>
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
                Grants fund access. We don&rsquo;t charge members.
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

      {/* ── Making an impact — Bento Grid ── */}
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
              Making an{' '}
              <span style={{ color: 'var(--color-accent)' }}>impact</span>
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
                  className="portal-card portal-card--flat"
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
                      '--ms-fill': 1,
                    }}
                   aria-hidden="true">
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
              Join individuals who are launching new careers through employer-aligned training and certifications.
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
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_forward</span>
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

      <div className="marketing-mobile marketing-mobile-pb-for-bottom-nav">
      {/* ── Mobile rebuild aligned to desktop + Stitch ── */}
      <section
        style={{
          padding: '1rem 1rem 1.5rem',
          background: 'linear-gradient(180deg, #141618 0%, #1c1b1b 58%, var(--color-surface) 58%)',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '1.5rem',
            minHeight: '30rem',
            backgroundImage: 'url(https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(10,12,14,0.16) 0%, rgba(10,12,14,0.56) 34%, rgba(10,12,14,0.92) 100%)',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              minHeight: '30rem',
              padding: '1.5rem',
            }}
          >
            <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.72)' }}>
              What We Do
            </span>
            <h1 style={{ fontSize: '2.15rem', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.02, marginBottom: '0.75rem', color: '#fff' }}>
              Creating Opportunity
            </h1>
            <p style={{ fontSize: '0.98rem', lineHeight: '1.75rem', marginBottom: '1.25rem', color: 'rgba(255,255,255,0.9)' }}>
              Employer-aligned training. No cost to members. Job placement built in.
              A model that works — and scales.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { val: '2,000+', label: 'People Served', accent: '#ad2c4d' },
                { val: '$0', label: 'Cost to Members', accent: '#f0b429' },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    borderRadius: '1rem', padding: '1rem',
                    background: 'rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.16)',
                  }}
                >
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, lineHeight: 1, color: s.accent }}>{s.val}</div>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: '0.5rem', color: 'rgba(255,255,255,0.76)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                href="/programs"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.95rem 1rem',
                  borderRadius: '0.9rem',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                Explore Our Impact
                <span className="material-symbols-outlined" style={{ fontSize: '1.05rem', color: 'inherit' }} aria-hidden>
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/contact?topic=partnership"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.95rem 1rem',
                  borderRadius: '0.9rem',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.05rem', color: 'inherit' }} aria-hidden>
                  handshake
                </span>
                Partner With Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 1rem 2rem', background: 'var(--color-surface)' }}>
        <div style={{ borderRadius: '1.4rem', padding: '1.25rem', background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: '0.5rem', color: 'var(--color-accent)' }}>25+ Years</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.08, color: 'var(--color-on-surface)' }}>
                Investing in the Future Workforce
              </h2>
            </div>
          </div>
          <blockquote
            style={{
              fontSize: '0.98rem', lineHeight: '1.75rem',
              color: 'var(--color-on-surface-variant)',
              borderLeft: '3px solid var(--color-accent)',
              paddingLeft: '1rem',
              margin: 0,
            }}
          >
            Built on 25+ years of workforce development — Goodwill, Austin Area Urban League,
            state and local initiatives. We know what works. Employers fund talent pipelines.
            Grants fund access. We don’t charge members.
          </blockquote>
        </div>
      </section>

      <section style={{ padding: '0 1rem 2rem', background: 'var(--color-surface)' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: '0.5rem', color: 'var(--color-accent)' }}>Making an impact</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--color-on-surface)' }}>How the model works</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {BENTO_ITEMS.map((item, index) => (
            <div
              key={item.title}
              style={{
                borderRadius: '1.4rem', padding: '1.25rem',
                background: index === 1 ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)' : 'var(--surface-container-low)',
                border: index === 1 ? 'none' : '1px solid var(--outline-variant)',
                boxShadow: index === 1 ? '0 18px 40px rgba(140,15,55,0.22)' : '0 6px 20px rgba(28,27,27,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    borderRadius: '1rem', padding: '0.75rem', flexShrink: 0,
                    background: index === 1 ? 'rgba(255,255,255,0.14)' : 'rgba(140,15,55,0.08)',
                    color: index === 1 ? '#fff' : 'var(--color-accent)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'inherit' }} aria-hidden="true">{item.icon}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem', color: index === 1 ? '#fff' : 'var(--color-on-surface)', overflowWrap: 'anywhere' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.875rem', lineHeight: '1.75rem', color: index === 1 ? 'rgba(255,255,255,0.88)' : 'var(--color-on-surface-variant)' }}>{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '2rem 1rem', background: 'var(--surface-container-low)' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: '0.5rem', color: 'var(--color-accent)' }}>What We Stand For</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--color-on-surface)' }}>Our core values</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {VALUES.map((value) => (
            <div key={value.title} style={{ borderRadius: '1.25rem', padding: '1.25rem', background: 'var(--color-surface)', border: '1px solid var(--outline-variant)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{ display: 'flex', height: '2.75rem', width: '2.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 900, background: 'rgba(140,15,55,0.1)', color: 'var(--color-accent)' }}
                >
                  {value.num}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-on-surface)', overflowWrap: 'anywhere' }}>{value.title}</h3>
                  <p style={{ fontSize: '0.875rem', lineHeight: '1.75rem', color: 'var(--color-on-surface-variant)' }}>{value.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '2rem 1rem', background: 'var(--color-surface)' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: '0.5rem', color: 'var(--color-accent)' }}>Our Commitments</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--color-on-surface)' }}>What we promise every member</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { num: '01', title: 'No-Cost Access', desc: 'Training is fully funded through grants and employer partnerships. Members are never charged.' },
            { num: '02', title: 'Employer-Aligned Credentials', desc: 'Curricula built with Google, IBM, AWS, Microsoft, and CompTIA — so your certificate means something to hiring managers.' },
            { num: '03', title: 'Real Job Outcomes', desc: 'We measure success by jobs landed, not seats filled. Placement support is part of every program.' },
            { num: '04', title: 'Community Grounded', desc: 'We partner with local organizations, government programs, and employers in your region — not just a national platform.' },
          ].map((s) => (
            <div key={s.num} style={{ borderRadius: '1.25rem', padding: '1.25rem', background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)' }}>
              <span style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem', color: 'var(--color-accent)' }}>{s.num}</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>{s.title}</h3>
              <p style={{ fontSize: '0.875rem', lineHeight: '1.75rem', color: 'var(--color-on-surface-variant)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '2rem 1rem', background: 'var(--color-surface)' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', textAlign: 'center', marginBottom: '1.25rem', color: 'var(--color-on-surface-variant)' }}>Supported By Industry Giants</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.625rem' }}>
          {['Google', 'IBM', 'AWS', 'Microsoft', 'CompTIA', 'Coursera'].map((p) => (
            <span
              key={p}
              style={{ display: 'inline-block', padding: '0.625rem 1rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--surface-container-low)', color: 'var(--color-on-surface)', border: '1px solid var(--outline-variant)' }}
            >
              {p}
            </span>
          ))}
        </div>
      </section>

      <section
        style={{ padding: '0.5rem 1rem 2rem', background: 'var(--color-surface)' }}
      >
        <div
          style={{
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
            borderRadius: '1.5rem',
            boxShadow: '0 20px 40px rgba(140,15,55,0.2)',
          }}
        >
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.75rem', color: '#fff' }}>
            Ready to build the future?
          </h2>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem', color: 'rgba(255,255,255,0.86)' }}>
            Join individuals who are launching new careers through employer-aligned training and certifications.
          </p>
          <div style={{ display: 'flex', width: '100%', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              href="/apply"
              style={{
                display: 'block',
                width: '100%',
                fontWeight: 800,
                padding: '1rem',
                borderRadius: '0.9rem',
                fontSize: '0.95rem',
                background: 'var(--color-gold)',
                color: '#1c1b1b',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Apply Now
            </Link>
            <Link
              href="/programs"
              style={{
                display: 'block',
                width: '100%',
                fontWeight: 700,
                padding: '1rem',
                borderRadius: '0.9rem',
                fontSize: '0.95rem',
                border: '1px solid rgba(255,255,255,0.24)',
                color: '#fff',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Explore Programs
            </Link>
            <Link
              href="/leadership"
              style={{
                display: 'block',
                width: '100%',
                fontWeight: 700,
                padding: '1rem',
                borderRadius: '0.9rem',
                fontSize: '0.95rem',
                border: '1px solid rgba(255,255,255,0.24)',
                color: '#fff',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Meet Our Team
            </Link>
          </div>
        </div>
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
