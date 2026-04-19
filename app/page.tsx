import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { MARKETING_JOURNEY_STEPS } from '@/lib/content/marketingJourneySteps';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';

// Product stake: if the homepage uses the brand line "Empowering People. Advancing Futures.",
// keep the supporting copy immediately concrete, member-safe, and operational.
export const metadata: Metadata = buildPageMetadata({
  title: 'Career Training & Industry Certificates',
  description:
    'Occupational and career training at no cost to members — Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Grants and partnerships fund access. Apply today.',
  path: '/',
});

const HERO_IMAGE_SRC = '/images/hero-people.jpg';
const HERO_IMAGE_THUMB = '/images/hero-people.jpg';
const HERO_IMAGE_BLUR =
  'data:image/jpeg;base64,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';

export default async function HomePage() {
  let activePrograms: Awaited<ReturnType<typeof getActivePrograms>> = [];
  try {
    activePrograms = await getActivePrograms();
  } catch (e) {
    console.error('[homepage] getActivePrograms failed', e);
    activePrograms = [];
  }
  const featured = activePrograms.filter((p) => p.featured);
  const homeProgramShowcase =
    activePrograms.length > 0
      ? (featured.length ? featured : activePrograms).slice(0, 3)
      : PROGRAMS.slice(0, 3).map((p, i) => ({
          slug: p.slug,
          name: p.title,
          description: null,
          category: p.categoryLabel,
          deliveryType: 'internal',
          deliveryUrl: null,
          deliveryDetails: null,
          certifications: [],
          duration: p.duration,
          status: 'active',
          displayOrder: i,
          featured: false,
          static: p,
        }));
  const programCount = activePrograms.length > 0 ? activePrograms.length : WORKFORCEAP_PROGRAM_CATALOG_SIZE;

  return (
    <div className="homepage" style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}>

      {/* ===== HERO: Full-bleed background image with gradient overlay (all viewports) ===== */}
      <section className="home-hero" style={{
        position: 'relative',
        minHeight: 'min(85vh, 820px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Background image */}
        <Image
          src={HERO_IMAGE_SRC}
          alt="Collaborative workspace"
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={HERO_IMAGE_BLUR}
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          /* Brighter overlay — more uplifting while keeping text readable */
          background: 'linear-gradient(180deg, rgba(28,31,36,0.42) 0%, rgba(28,31,36,0.58) 55%, var(--color-background-dark) 100%)',
          zIndex: 1,
        }} />

        <div style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1400px',
          width: '100%',
          padding: 'clamp(5.5rem, 12vw, 8rem) clamp(1rem, 4vw, 2rem) clamp(3rem, 8vw, 6rem)',
        }}
        >


          <h1
            className="text-display-lg"
            style={{
              color: 'var(--home-hero-fg, #f2f2f5)',
              marginBottom: '1.5rem',
              lineHeight: 1.05,
              fontSize: 'clamp(2.25rem, 6vw + 1rem, 4.5rem)',
            }}
          >
            Empowering People.{' '}
            <span style={{ color: 'var(--color-accent)' }}>Advancing Futures.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 0.5vw + 0.95rem, 1.25rem)',
            color: 'var(--home-hero-fg-muted, rgba(242, 242, 245, 0.88))',
            maxWidth: '560px',
            marginBottom: '2.5rem',
            lineHeight: 1.6,
          }}>
            No-cost career training for members who want a stronger path to work. Start with a quick career pathfinder, explore {WORKFORCEAP_PROGRAM_CATALOG_SIZE} programs, and get counselor guidance, resume help, and job-search support.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <Link href="/find-your-path" className="btn btn-primary btn-large" style={{ fontSize: 'clamp(1.05rem, 1vw + 0.9rem, 1.25rem)' }}>
              Find Your Career Path
            </Link>
            <Link href="/programs" className="btn btn-outline btn-large home-hero-outline-cta" style={{ fontSize: 'clamp(1.05rem, 1vw + 0.9rem, 1.15rem)' }}>
              Browse Programs
            </Link>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--home-hero-fg-muted, rgba(242,242,245,0.7))', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: 0 }}>
              <span>✓ Grant-funded & partner-supported</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>✓ No credit card required</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>✓ No cost for members</span>
            </p>
            {/* Mobile-only apply link — shown when the outline CTA button is hidden */}
            <p className="home-hero-mobile-apply" style={{ margin: 0 }}>
              <Link href="/apply" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--home-hero-fg-muted, rgba(242,242,245,0.82))', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                Ready to apply? Start your application →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ===== Social Proof / Credibility Bar ===== */}
      <section className="home-credibility-bar" style={{ padding: '2rem 0', background: 'var(--surface-container-lowest)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <p className="text-label-upper" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', opacity: 0.7, marginBottom: '1.5rem', fontSize: '0.625rem', letterSpacing: '0.2em' }}>
            Certifications recognized by employers — powered by
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '3rem', opacity: 0.65 }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Google</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>AT&T</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Coursera</span>
            <Image className="home-cred-logo" src="/images/microsoft-logo.svg" alt="Microsoft" width={100} height={24} />
            <Image className="home-cred-logo" src="/images/ibm-logo.svg" alt="IBM" width={60} height={24} />
          </div>
        </div>
      </section>

      {/* ===== A Network Built for Success — Stakeholder Cards (Partnerships) ===== */}
      <section style={{ background: 'var(--surface-container-low)', padding: 'clamp(3rem, 6vw, 6rem) 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
              Partnerships
            </span>
            <h2 className="text-display-sm">A Network Built for Success</h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '2rem',
            alignItems: 'start',
          }}>
            {/* For Members — first + elevated (primary audience) */}
            <div className="portal-card portal-card--flat home-employer-elevated" style={{
              background: 'var(--surface-container-lowest)', padding: '2rem',
              border: '2px solid var(--color-accent)',
              transform: 'translateY(-1rem)',
              boxShadow: '0 8px 32px rgba(173,44,77,0.15)',
            }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(173,44,77,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined" aria-hidden="true">person</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Members</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">check_circle</span>
                  No cost for members
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">check_circle</span>
                  {WORKFORCEAP_PROGRAM_CATALOG_SIZE} high-demand career tracks
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">check_circle</span>
                  Resume, interview, and job search support
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">check_circle</span>
                  Direct employer connections and job placement support
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <Link href="/apply" className="btn btn-primary btn-small">Apply Now</Link>
                <Link href="/wioa-qualification" className="btn btn-secondary btn-small">Check WIOA Funding</Link>
              </div>
            </div>

            {/* For Partners */}
            <div className="portal-card portal-card--flat" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(200,198,197,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8c6c5', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined" aria-hidden="true">handshake</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Partners</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#c8c6c5' }} aria-hidden="true">check_circle</span>
                  Educational resource sharing
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#c8c6c5' }} aria-hidden="true">check_circle</span>
                  Refer members and track their progress
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#c8c6c5' }} aria-hidden="true">check_circle</span>
                  See the difference your referrals make
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <Link href="/partners" className="btn btn-primary btn-small">Partner With Us</Link>
              </div>
            </div>

            {/* For Employers */}
            <div className="portal-card portal-card--flat" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(255,187,0,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined" aria-hidden="true">business</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Employers</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-gold)' }} aria-hidden="true">check_circle</span>
                  Trained candidates ready to hire
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-gold)' }} aria-hidden="true">check_circle</span>
                  Training aligned to your open roles
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-gold)' }} aria-hidden="true">check_circle</span>
                  We introduce qualified graduates to your team
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <Link href="/employers" className="btn btn-primary btn-small">Employer Overview</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Built on Workforce Experience — Bento: 2/3 text + 1/3 stats grid ===== */}
      <section style={{ padding: 'clamp(3rem, 6vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
        <div id="impact" className="home-impact-bento">
          {/* Text block (2/3) */}
          <div>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
              Our Impact
            </span>
            <h2 className="text-display-sm" style={{ marginBottom: '1.5rem' }}>
              Built on 25+ Years of Workforce Experience
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem', maxWidth: '640px' }}>
              WorkforceAP is a 501(c)(3) nonprofit built in Austin on 25+ years of workforce development experience. Our leadership brings experience from organizations including Consulting Solutions.Net, Goodwill Career &amp; Technical Academy, Austin Area Urban League, and African American Youth Harvest Foundation. Through grants and partner-backed pathways, we help members access laptops, resume support, and job search guidance.
            </p>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, maxWidth: '640px' }}>
              We believe education should be an investment in the future, not a debt for the present. Programs are offered at no cost to members through WorkforceAP and partner-backed pathways.
            </p>
          </div>

          {/* Stats grid (1/3) */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
          }}>
            <div className="portal-card portal-card--flat" style={{
              background: 'var(--surface-container-high)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-gold)', lineHeight: 1 }}>2,000+</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trained</span>
            </div>
            <div className="portal-card portal-card--flat" style={{
              background: 'var(--surface-container-high)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1 }}>{programCount}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Programs</span>
            </div>
            {/* Accent card spanning full width */}
            <div className="portal-card portal-card--flat" style={{
              gridColumn: '1 / -1',
              background: 'var(--color-accent)', color: 'white', padding: '1.5rem',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>$0</span>
              <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Member Cost</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Milestone Journey — Horizontal Scrolling Cards ===== */}
      <section style={{ background: 'var(--surface-container-low)', padding: 'clamp(3rem, 6vw, 6rem) 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <h2 className="text-display-sm" style={{ marginBottom: '1rem', textAlign: 'center' }}>Your Journey to Success</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', marginBottom: '3rem', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            From application to career growth — 10 steps that define your WorkforceAP experience.
          </p>
        </div>
        <div style={{
          display: 'flex',
          gap: '1.25rem',
          overflowX: 'auto',
          padding: `0 clamp(1rem, 4vw, 2rem) 1.5rem`,
          paddingRight: 'max(clamp(1rem, 4vw, 2rem), env(safe-area-inset-right, 0px))',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}>
          {MARKETING_JOURNEY_STEPS.map((step) => (
            <div key={step.num} className="home-milestone-card" style={{
              flex: '0 0 260px', scrollSnapAlign: 'start',
              background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
              padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden',
            }}>
              {/* Large background number */}
              <span style={{
                position: 'absolute', top: '-0.5rem', right: '0.5rem',
                fontSize: '6rem', fontWeight: 900, lineHeight: 1,
                color: 'var(--surface-container-highest)', opacity: 0.5,
                pointerEvents: 'none', userSelect: 'none',
              }}>{String(step.num).padStart(2, '0')}</span>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Step {String(step.num).padStart(2, '0')}</span>
                <h4 style={{ fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '1.125rem' }}>{step.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{step.shortDesc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/how-it-works" className="btn btn-secondary">See Full Process</Link>
        </div>
      </section>

      {/* ===== Available Programs — 3 Cards with images, category labels, duration + cert badges ===== */}
      <section style={{ padding: 'clamp(3rem, 6vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
            Available Programs
          </span>
          <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>Explore Our {programCount} Programs</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '600px' }}>
            Career training that prepares you for jobs employers are hiring for right now.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
          {homeProgramShowcase.map((p) => (
            <Link
              key={p.slug}
              href={`/programs/${p.slug}`}
              className="portal-card portal-card--flat"
              style={{
                background: 'var(--surface-container-high)',
                color: 'var(--color-on-surface)',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              {/* Card image area */}
              <div style={{
                position: 'relative', height: '180px',
                background: 'var(--surface-container-highest)',
                overflow: 'hidden',
              }}>
                <Image
                  src={HERO_IMAGE_THUMB}
                  alt={p.static?.title ?? p.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  style={{ objectFit: 'cover', opacity: 0.7 }}
                />
                {/* Category label */}
                <span style={{
                  position: 'absolute', top: '0.75rem', left: '0.75rem',
                  padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full, 50px)',
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  color: 'white', fontSize: '0.7rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{p.category}</span>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.static?.title ?? p.name}</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto' }}>
                  {/* Duration badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full, 50px)',
                    background: 'var(--surface-container-lowest)', fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">schedule</span>
                    {p.static?.duration ?? '3-5 months'}
                  </span>
                  {/* Cert badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full, 50px)',
                    background: 'rgba(173,44,77,0.15)', color: 'var(--color-accent)',
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">verified</span>
                    Certificate track
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/programs" className="btn btn-secondary">
            View All {programCount} Programs
          </Link>
        </div>
      </section>

      {/* ===== AI-Powered Career Support ===== */}
      <section style={{ padding: 'clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 2rem)', maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
          Career Tools
        </span>
        <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>
          Resume Feedback in Minutes, Not Days
        </h2>
        <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          Members get AI tools that sharpen your resume, practice interviews with questions specific to your target role, score your job match before you apply, and track applications — all inside your member portal.
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', opacity: 0.7, marginBottom: '2rem' }}>
          Voice coaching powered by <strong>ElevenLabs</strong>
        </p>
        <Link href="/apply" className="btn btn-primary">
          Apply to Unlock Member Tools
        </Link>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="footer-cta" style={{ background: 'var(--color-accent)', padding: 'clamp(3rem, 6vw, 4rem) clamp(1rem, 4vw, 2rem)', textAlign: 'center' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'white', marginBottom: '1rem' }}>Your Next Step</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontSize: '1.125rem' }}>
            About 10 minutes to apply. We respond within 3–5 business days. Industry-recognized certificates and placement support. No cost for members.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
            <Link href="/find-your-path" className="btn btn-large" style={{ background: 'white', color: 'var(--color-accent)', fontWeight: 700 }}>
              Find Your Career
            </Link>
            <Link href="/apply" className="btn btn-large" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.5)', fontWeight: 700 }}>
              Start Your Application
            </Link>
            <Link href="/programs" className="btn btn-large" style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.35)', fontWeight: 600 }}>
              View Program Details
            </Link>
          </div>
        </div>
      </section>

      <MobileBottomNav />
      <Footer variant="home" />
    </div>
  );
}
