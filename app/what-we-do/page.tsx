import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { prisma } from '@/lib/db/prisma';
import { getPlacementPublicMetrics } from '@/lib/outcomes/placementPublicMetrics';
import { makeServerT } from '@/lib/i18n/serverLabels';
import { getLocale } from '@/lib/i18n/serverLocale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = makeServerT(locale);
  return buildPageMetadata({
    title: t('Workforce Development Training & Industry Certificates'),
    description:
      t('WorkforceAP is built on 25+ years of workforce development leadership. Employer-aligned training, career support, and grant- and partner-funded access for qualifying members.'),
    path: '/what-we-do',
  });
}

const BENTO_ITEMS = [
  {
    icon: 'school',
    title: 'Employer-Influenced Curricula',
    desc: 'Training programs shaped with employer input ΓÇö Google, IBM, AWS, Microsoft, CompTIA ΓÇö so credentials map to real hiring needs.',
    span: 'tall',
  },
  {
    icon: 'lock_open',
    title: 'Zero-Barrier Access',
    desc: 'No cost for qualifying members. No prerequisites. Funding comes from grants and partnerships that can cover access for eligible participants.',
    span: 'large',
  },
  {
    icon: 'verified',
    title: 'Validated Outcomes',
    desc: 'Industry-recognized certificates. Skills assessments. Job placement support. We track member progress and career outcomes over time.',
    span: 'small',
  },
  {
    icon: 'hub',
    title: 'Regional Scalability',
    desc: 'A repeatable model built to serve communities nationwide ΓÇö not just one local market.',
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
    desc: 'Government, Employers, Non-profit & Community Organizations, and Churches ΓÇö we bring the right people together so members don\'t have to figure it out alone.',
  },
];

export default async function WhatWeDoPage() {
  let placementMetrics = {
    placedCount: 0,
    withRetentionNote: 0,
    lastPlacedAt: null as Date | null,
    asOfLabel: 'Outcomes data unavailable',
  };
  try {
    placementMetrics = await getPlacementPublicMetrics(prisma);
  } catch {
    // keep defaults
  }

  let pipelineEmployers: { id: string; companyName: string; logoUrl: string | null; industry: string | null }[] = [];
  try {
    pipelineEmployers = await prisma.employer.findMany({
      where: { hiringPipelineActive: true, status: 'active' },
      select: { id: true, companyName: true, logoUrl: true, industry: true },
      take: 12,
      orderBy: { updatedAt: 'desc' },
    });
  } catch {
    // Column may not exist yet if migration hasn't been applied — section renders empty until then
  }


  return (
    <div className="inner-page">
      {/* ΓöÇΓöÇ Hero ΓöÇΓöÇ */}
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
            backgroundImage: 'url(/images/austin-skyline.jpg)',
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
            Built on Decades of Workforce Experience
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
            Employer-aligned training. No cost for qualifying members. Career support throughout the journey.
            A model that works ΓÇö and scales.
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

      {/* Find Your Path CTA */}
      <section style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--color-light)' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>Not sure where to start?</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
          <a href="/find-your-path" className="btn btn-accent btn-lg" style={{ fontSize: '1.1rem', padding: '0.875rem 2rem' }}>
            Find Your Path
          </a>
          <Link href="/wioa-qualification" className="btn btn-secondary btn-lg" style={{ fontSize: '1.1rem', padding: '0.875rem 2rem' }}>
            Check WIOA Options
          </Link>
        </div>
      </section>

      {/* ΓöÇΓöÇ Legacy Section ΓöÇΓöÇ */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            className="wwd-legacy-grid"
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
                  src="/images/hero-people.jpg"
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
                  Years Experience
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
                Built on 25+ years of workforce development leadership across Goodwill, Austin Area Urban League,
                and state and local initiatives. We know what works. Employers help shape talent pipelines.
                Grants and partnerships fund access. We don&rsquo;t charge members.
              </blockquote>

              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '2rem' }}>
                Some programs may align with <strong>WIOA (Workforce Innovation and Opportunity Act)</strong> eligibility guidelines
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
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-gold)', lineHeight: 1.3 }}>
                    Nonprofit &amp; 501(c)(3)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600 }}>
                    WorkforceAP is a national nonprofit and 501(c)(3) organization serving communities nationwide.
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
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1.2 }}>
                    {placementMetrics.placedCount}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600 }}>
                    Placements on file in WorkforceAP systems (n). {placementMetrics.asOfLabel}
                  </div>
                  <p style={{ margin: '0.65rem 0 0', fontSize: '0.72rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>
                    Historical training reach through workforce partnerships remains 2,000+ — a separate figure from this portal placement counter.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ΓöÇΓöÇ Making an impact — Bento Grid ΓöÇΓöÇ */}
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

      {/* ΓöÇΓöÇ Values Section ΓöÇΓöÇ */}
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

      {/* ΓöÇΓöÇ CTA ΓöÇΓöÇ */}
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

      <style>{`
        @media (max-width: 1023px) {
          .wwd-legacy-grid { gap: 2rem !important; }
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
      {/* Spacer for mobile bottom nav ΓÇö ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
