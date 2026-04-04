import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career Training & Industry Certificates | Workforce Advancement Project',
  description:
    'Occupational and career training at no cost to members — Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Grants and partnerships fund access. Apply today.',
  path: '/',
});

const HERO_IMAGE_SRC =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80';
const HERO_IMAGE_THUMB =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=640&q=70';

const MILESTONES = [
  { num: '01', title: 'Apply', desc: 'Submit your application online in about 10 minutes. Why: We need to understand your background to match you with the right opportunity.' },
  { num: '02', title: 'Eligibility Review', desc: 'Our team reviews your application within 3-5 business days. Why: We ensure our programs fit your situation and goals.' },
  { num: '03', title: 'Getting Started', desc: 'Get access to your member portal and resources. Why: Setting you up for success from day one.' },
  { num: '04', title: 'Skills Assessment', desc: 'Discover your strengths and identify growth areas. Why: Data helps us personalize your pathway.' },
  { num: '05', title: 'Program Enrollment', desc: 'Begin your chosen certificate program. Why: Industry-recognized credentials open doors.' },
  { num: '06', title: '1:1 Counselor Support', desc: 'Regular check-ins with your dedicated career counselor. Why: Accountability and guidance increase completion rates.' },
  { num: '07', title: 'AI Tools & Resources', desc: 'Resume builder, interview practice, and job matching. Why: Technology amplifies your preparation.' },
  { num: '08', title: 'Certificate Completion', desc: 'Earn your industry-recognized credential. Why: Proof of skills that employers trust.' },
  { num: '09', title: 'Job Readiness Prep', desc: 'Mock interviews, portfolio review, and application support. Why: Presentation matters as much as skills.' },
  { num: '10', title: 'Employer Matching', desc: 'Connect with vetted employers in your field. Why: Our network accelerates your job search.' },
  { num: '11', title: 'Career Placement & Retention', desc: 'Land your role with 150-day post-placement support. Why: We measure success by what happens after the offer, not just before it.' },
];

export default async function HomePage() {
  const activePrograms = await getActivePrograms();
  const featured = activePrograms.filter((p) => p.featured);
  const homeProgramShowcase = (featured.length ? featured : activePrograms).slice(0, 3);
  const programCount = activePrograms.length;

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
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(28,31,36,0.68) 0%, rgba(28,31,36,0.80) 60%, var(--color-background-dark) 100%)',
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
            maxWidth: '640px',
            marginBottom: '2.5rem',
            lineHeight: 1.7,
          }}>
            Occupational and career training at no cost to members — {WORKFORCEAP_PROGRAM_CATALOG_SIZE} specialized programs, counselor guidance, and AI-powered tools designed to help people move forward.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <Link href="/find-your-path" className="btn btn-primary btn-large">
              Find Your Career
            </Link>
            <ExperimentedCtaLink
              experiment="home_apply_primary_cta"
              variants={[
                {
                  id: 'control',
                  label: 'Apply Now',
                  className: 'btn btn-secondary btn-large',
                  href: '/apply',
                  style: { fontSize: '1.15rem' },
                },
                {
                  id: 'urgency',
                  label: 'Start Your Journey',
                  className: 'btn btn-secondary btn-large',
                  href: '/apply',
                  style: { fontSize: '1.15rem' },
                },
              ]}
            />
            <Link href="/partners" className="btn btn-outline btn-large home-hero-outline-cta">
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Social Proof / Credibility Bar ===== */}
      <section className="home-credibility-bar" style={{ padding: '2rem 0', background: 'var(--surface-container-lowest)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <p className="text-label-upper" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', opacity: 0.4, marginBottom: '1.5rem', fontSize: '0.625rem', letterSpacing: '0.2em' }}>
            Curriculum from Industry Leaders
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '3rem', opacity: 0.4 }}>
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
            {/* For Members */}
            <div className="stitch-card" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(173,44,77,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined">person</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Members</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }}>check_circle</span>
                  No tuition costs for training
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }}>check_circle</span>
                  {WORKFORCEAP_PROGRAM_CATALOG_SIZE} high-demand career tracks
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }}>check_circle</span>
                  Dedicated placement support
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <Link href="/apply" className="btn btn-primary btn-small">Apply Now</Link>
              </div>
            </div>

            {/* For Partners — center card elevated */}
            <div className="stitch-card home-employer-elevated" style={{
              background: 'var(--surface-container-lowest)', padding: '2rem',
              border: '2px solid var(--color-accent)',
              transform: 'translateY(-1rem)',
              boxShadow: '0 8px 32px rgba(173,44,77,0.15)',
            }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(200,198,197,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8c6c5', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined">handshake</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Partners</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#c8c6c5' }}>check_circle</span>
                  Educational resource sharing
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#c8c6c5' }}>check_circle</span>
                  Scalable workforce solutions
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#c8c6c5' }}>check_circle</span>
                  Community impact analytics
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <Link href="/partners" className="btn btn-primary btn-small">Partner With Us</Link>
              </div>
            </div>

            {/* For Employers */}
            <div className="stitch-card" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(255,187,0,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined">business</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Employers</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-gold)' }}>check_circle</span>
                  Vetted talent ready for work
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-gold)' }}>check_circle</span>
                  Customized curriculum options
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-gold)' }}>check_circle</span>
                  Structured hiring introductions when it fits your process
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <Link href="/employers" className="btn btn-primary btn-small">Employer Overview</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 25+ Years Breaking Barriers — Bento: 2/3 text + 1/3 stats grid ===== */}
      <section style={{ padding: 'clamp(3rem, 6vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
        <div className="home-impact-bento">
          {/* Text block (2/3) */}
          <div>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
              Our Impact
            </span>
            <h2 className="text-display-sm" style={{ marginBottom: '1.5rem' }}>
              25+ Years Breaking Barriers
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem', maxWidth: '640px' }}>
              Founded by Michael Brown, PMP — a workforce leader who has trained thousands nationwide. Through partnerships with the State of Texas, Texas Workforce Commission, Consulting Solutions.Net, Goodwill Career &amp; Technical Academy, Austin Area Urban League, Universal Tech Movement, and African American Youth Harvest Foundation, we deliver the loaner laptops, resume help, and job search support that launch careers.
            </p>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, maxWidth: '640px' }}>
              We believe education should be an investment in the future, not a debt for the present. Our program is funded through employer partnerships and grants — building toward national scale.
            </p>
          </div>

          {/* Stats grid (1/3) */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
          }}>
            <div className="stitch-card" style={{
              background: 'var(--surface-container-high)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-gold)', lineHeight: 1 }}>2,000+</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trained</span>
            </div>
            <div className="stitch-card" style={{
              background: 'var(--surface-container-high)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1 }}>{programCount}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Programs</span>
            </div>
            {/* Accent card spanning full width */}
            <div className="stitch-card" style={{
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
            From application to career growth — 11 milestones that define your WorkforceAP experience.
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
          {MILESTONES.map((step) => (
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
              }}>{step.num}</span>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Step {step.num}</span>
                <h4 style={{ fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '1.125rem' }}>{step.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{step.desc}</p>
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
            Specialized career paths designed to bridge the skills gap in high-growth industries.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
          {homeProgramShowcase.map((p) => (
            <Link
              key={p.slug}
              href={`/programs/${p.slug}`}
              className="stitch-card"
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
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>schedule</span>
                    {p.static?.duration ?? '3-5 months'}
                  </span>
                  {/* Cert badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full, 50px)',
                    background: 'rgba(173,44,77,0.15)', color: 'var(--color-accent)',
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>verified</span>
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
          AI-Powered Career Support
        </span>
        <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>
          Tools That Work For You
        </h2>
        <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Members get in-portal AI assistants for resume refinement, interview practice, job matching, application tracking, and more — designed to complement counselor support, not replace it.
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
            About 10 minutes to apply. We respond within 3–5 business days. Industry-recognized certificates and placement support. No tuition cost to members.
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
