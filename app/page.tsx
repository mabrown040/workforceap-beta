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
  title: 'Free Career Training & Industry Certifications | Workforce Advancement Project',
  description:
    'No-cost career certification training in Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Employer-aligned programs with placement support. Apply today.',
  path: '/',
});

const MILESTONES = [
  { num: '01', title: 'Application', desc: 'Submit your application online in about 10 minutes.' },
  { num: '02', title: 'Assessment', desc: 'Quick skills and interest review to find your best fit.' },
  { num: '03', title: 'Enrollment', desc: 'Get matched with a program track and cohort.' },
  { num: '04', title: 'Orientation', desc: 'Meet your mentors and get set up with tools.' },
  { num: '05', title: 'Core Training', desc: 'Intensive skill-building with industry experts.' },
  { num: '06', title: 'Lab Projects', desc: 'Hands-on work simulating real employer needs.' },
  { num: '07', title: 'Certification', desc: 'Earn recognized industry credentials.' },
  { num: '08', title: 'Resume + Portfolio', desc: 'Build job-ready materials with AI support.' },
  { num: '09', title: 'Interview Prep', desc: 'Mock interviews and feedback from hiring managers.' },
  { num: '10', title: 'Placement', desc: 'Direct introductions to our employer partner network.' },
  { num: '11', title: 'Career Growth', desc: 'Ongoing alumni support and advancement resources.' },
];

export default async function HomePage() {
  const activePrograms = await getActivePrograms();
  const featured = activePrograms.filter((p) => p.featured);
  const homeProgramShowcase = (featured.length ? featured : activePrograms).slice(0, 3);
  const programCount = activePrograms.length;

  return (
    <div className="homepage" style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}>

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT ≤640px — Stitch-aligned
          ══════════════════════════════════════════════ */}
      <div className="wa-md:hidden" style={{ background: '#fcf9f8', minHeight: '100vh', paddingBottom: '5rem' }}>
        {/* Mobile Hero */}
        <section style={{ padding: '5rem 1.25rem 1.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.375rem 0.75rem', borderRadius: '9999px', marginBottom: '1.25rem', background: '#ffbb00', color: '#1c1b1b' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', fontVariationSettings: "'FILL' 1" }}>radio_button_checked</span>
            Enrollment Open 2024
          </span>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, marginBottom: '1rem', background: 'linear-gradient(135deg, #8c0f37 0%, #ad2c4d 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Free Career<br />Training
          </h1>
          <p style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.75rem', maxWidth: '280px', color: '#584144' }}>
            Bridge the gap with professional certification and real employer connections.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/apply" style={{ display: 'block', width: '100%', textAlign: 'center', fontWeight: 700, padding: '1rem', borderRadius: '0.75rem', fontSize: '0.875rem', background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 14px rgba(140,15,55,0.35)' }}>
              Apply Free
            </Link>
            <Link href="/find-your-path" style={{ display: 'block', width: '100%', textAlign: 'center', fontWeight: 700, padding: '1rem', borderRadius: '0.75rem', fontSize: '0.875rem', background: '#f6f3f2', color: '#8c0f37', textDecoration: 'none', border: '1px solid rgba(140,15,55,0.15)' }}>
              Find Your Path
            </Link>
          </div>
        </section>

        {/* Mobile Partner Logos Scroll */}
        <section style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '0 1.25rem', marginBottom: '0.75rem', color: 'rgba(88,65,68,0.6)' }}>Global Hiring Partners</p>
          <div style={{ display: 'flex', overflowX: 'auto', gap: '2rem', padding: '0.5rem 1.25rem', alignItems: 'center', scrollbarWidth: 'none' }}>
            {['Google', 'IBM', 'AWS', 'CompTIA', 'AT&T'].map((p) => (
              <span key={p} style={{ flexShrink: 0, fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b7073', opacity: 0.7 }}>{p}</span>
            ))}
          </div>
        </section>

        {/* Mobile 3-Stat Row */}
        <section style={{ padding: '0 1.25rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <div style={{ borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: '#f6f3f2', minHeight: 96 }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, display: 'block', color: '#8c0f37' }}>{programCount}</span>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#584144' }}>Programs</span>
            </div>
            <div style={{ borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #8c0f37 0%, #ad2c4d 100%)', minHeight: 96 }}>
              <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.4)', alignSelf: 'flex-end' }}>verified</span>
              <div>
                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', display: 'block' }}>$0 Cost</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,203,209,0.9)' }}>Tuition Free</span>
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1', borderRadius: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ebe7e7' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1c1b1b' }}>12–24 Weeks</span>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7b5800' }}>Accelerated</span>
            </div>
          </div>
        </section>

        {/* Mobile 4-Step Journey Card Scroll */}
        <section style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '0 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.025em', color: '#1c1b1b' }}>Your Journey</h2>
            <Link href="/how-it-works" style={{ fontSize: '0.75rem', fontWeight: 700, textDecoration: 'underline', color: '#8c0f37' }}>Learn More</Link>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', gap: '1rem', padding: '0 1.25rem 1rem', scrollbarWidth: 'none' }}>
            {[
              { icon: 'quiz', step: '01', title: 'Quiz', desc: 'Discover your path in 5 minutes.' },
              { icon: 'assignment_ind', step: '02', title: 'Apply', desc: 'Submit in about 10 minutes.' },
              { icon: 'school', step: '03', title: 'Train', desc: 'Intensive skill-building with experts.' },
              { icon: 'work', step: '04', title: 'Hired', desc: 'Access our exclusive hiring network.' },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} style={{ flexShrink: 0, width: '14rem', padding: '1.25rem', borderRadius: '1.5rem', border: '1px solid rgba(28,27,27,0.06)', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', background: 'rgba(140,15,55,0.1)' }}>
                  <span className="material-symbols-outlined" style={{ color: '#8c0f37' }}>{icon}</span>
                </div>
                <span style={{ display: 'block', fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', color: '#7b5800' }}>Phase {step}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1c1b1b' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#584144' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP LAYOUT ≥641px
          ══════════════════════════════════════════════ */}
      <div className="wa-hidden wa-md:block">

      {/* ===== HERO: Full-bleed background image with gradient overlay ===== */}
      <section style={{
        position: 'relative',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Background image */}
        <Image
          src="https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=1920&q=80"
          alt="Collaborative workspace"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(18,20,22,0.82) 0%, rgba(18,20,22,0.92) 60%, var(--color-background-dark) 100%)',
          zIndex: 1,
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '1400px', width: '100%', padding: '8rem 2rem 6rem' }}>
          {/* Badge pill */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', borderRadius: 'var(--radius-full, 50px)',
            background: 'rgba(173,44,77,0.2)', border: '1px solid rgba(173,44,77,0.4)',
            color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1.5rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>location_on</span>
            Austin Launch Community
          </span>

          <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem', lineHeight: 1.05 }}>
            Empowering People.{' '}
            <span style={{ color: 'var(--color-accent)' }}>Advancing Futures.</span>
          </h1>

          <p style={{
            fontSize: '1.25rem', color: 'var(--color-on-surface-variant)',
            maxWidth: '640px', marginBottom: '2.5rem', lineHeight: 1.7,
          }}>
            Intentional education designed for modern industry. We connect talented members with employers through {WORKFORCEAP_PROGRAM_CATALOG_SIZE} specialized programs and AI-powered support — nationwide.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <ExperimentedCtaLink
              experiment="home_apply_primary_cta"
              variants={[
                { id: 'control', label: 'Start Your Journey', className: 'btn btn-primary btn-large', href: '/apply' },
                { id: 'urgency', label: 'Apply Now — Free', className: 'btn btn-primary btn-large', href: '/apply' },
              ]}
            />
            <Link href="/partners" className="btn btn-secondary btn-large">
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Social Proof / Credibility Bar ===== */}
      <section style={{ padding: '2rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'var(--surface-container-lowest)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <p className="text-label-upper" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', opacity: 0.4, marginBottom: '1.5rem', fontSize: '0.625rem', letterSpacing: '0.2em' }}>
            Curriculum from Industry Leaders
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '3rem', opacity: 0.4 }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Google</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>AT&T</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Coursera</span>
            <Image src="/images/microsoft-logo.svg" alt="Microsoft" width={100} height={24} style={{ filter: 'brightness(2)' }} />
            <Image src="/images/ibm-logo.svg" alt="IBM" width={60} height={24} style={{ filter: 'brightness(2)' }} />
          </div>
        </div>
      </section>

      {/* ===== Experience Behind WAP — Prelaunch Honest Messaging ===== */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
            Experience Behind WorkforceAP
          </span>
          <h2 className="text-display-sm" style={{ marginBottom: '1.5rem' }}>
            Built on Proven Results
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            WorkforceAP is prelaunch — we don&apos;t have graduate stories on this site yet. What we do have is a long run of workforce outcomes through{' '}
            <strong>Consulting Solutions.Net (CSN)</strong>: training aligned to real job requirements, strong completion and placement support, and thousands of people coached into industry credentials and work. That same leadership team is building WorkforceAP for scale.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <Link href="/blog" className="btn btn-primary btn-small">Blog &amp; Updates</Link>
            <Link href="/leadership" className="btn btn-secondary btn-small">Leadership &amp; Board</Link>
            <Link href="/what-we-do" className="btn btn-secondary btn-small">What We Do</Link>
          </div>
        </div>
      </section>

      {/* ===== 25+ Years Breaking Barriers — Bento: 2/3 text + 1/3 stats grid ===== */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1400px', margin: '0 auto' }} className="wa-hidden wa-md:block">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '3rem',
          alignItems: 'start',
        }}>
          {/* Text block (2/3) */}
          <div>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
              Our Impact
            </span>
            <h2 className="text-display-sm" style={{ marginBottom: '1.5rem' }}>
              25+ Years Breaking Barriers
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem', maxWidth: '640px' }}>
              Founded by Michael Brown, PMP — a workforce leader who has trained thousands nationwide. Through partnerships with the State of Texas, Texas Workforce Commission, Consulting Solutions.Net, Goodwill Career &amp; Technical Academy, Austin Area Urban League, Universal Tech Movement, and African American Youth Harvest Foundation, we deliver the wrap-around services that launch careers.
            </p>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, maxWidth: '640px' }}>
              We believe education should be an investment in the future, not a debt for the present. Our program is funded through partnerships and successful placements — building toward national scale.
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
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-gold)', lineHeight: 1 }}>2000+</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trained</span>
            </div>
            <div className="stitch-card" style={{
              background: 'var(--surface-container-high)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-gold)', lineHeight: 1 }}>2,000+</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trained</span>
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

      {/* ===== Mobile: Our Impact (≤640px) ===== */}
      <section className="hidden px-4 py-10" style={{ background: 'var(--color-background-dark)' }}>
        <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block', fontSize: '0.6rem' }}>Our Impact</span>
        <h2 className="text-2xl font-extrabold mb-3" style={{ color: 'var(--color-on-surface)', letterSpacing: '-0.025em' }}>25+ Years Breaking Barriers</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-on-surface-variant)' }}>
          Founded by Michael Brown, PMP — a workforce leader who has trained thousands nationwide through partnerships with the State of Texas, TWC, Goodwill, Austin Urban League, and more.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[['2,000+', 'Trained'], ['$0', 'Cost']].map(([val, label]) => (
            <div key={label} className="rounded-xl py-4 px-2 text-center" style={{ background: 'var(--surface-container-high)' }}>
              <div className="text-xl font-black" style={{ color: 'var(--color-gold)', lineHeight: 1 }}>{val}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Milestone Journey — Horizontal Scrolling Cards ===== */}
      <section className="wa-hidden wa-md:block" style={{ background: 'var(--surface-container-low)', padding: '6rem 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <h2 className="text-display-sm" style={{ marginBottom: '1rem', textAlign: 'center' }}>Your Journey to Success</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', marginBottom: '3rem', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            From application to career growth — 11 milestones that define the WAP experience.
          </p>
        </div>
        <div style={{
          display: 'flex', gap: '1.25rem', overflowX: 'auto',
          padding: '0 2rem 1.5rem',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}>
          {MILESTONES.map((step) => (
            <div key={step.num} style={{
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
      <section style={{ padding: '6rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
            Available Programs
          </span>
          <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>Explore Our {programCount} Programs</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '600px' }}>
            Specialized career paths designed to bridge the skills gap in high-growth industries.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
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
                  src="https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=640&q=70"
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
                    Certification
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

      {/* ===== A Network Built for Success — Stakeholder Cards ===== */}
      <section style={{ background: 'var(--surface-container-low)', padding: '6rem 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
              Community
            </span>
            <h2 className="text-display-sm">A Network Built for Success</h2>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem',
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
                  No upfront costs for training
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

            {/* For Employers — center card elevated */}
            <div className="stitch-card" style={{
              background: 'var(--surface-container-lowest)', padding: '2rem',
              border: '2px solid var(--color-accent)',
              transform: 'translateY(-1rem)',
              boxShadow: '0 8px 32px rgba(173,44,77,0.15)',
            }}>
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
                  Direct pipeline management
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <Link href="/employers" className="btn btn-primary btn-small">Employer Overview</Link>
              </div>
            </div>

            {/* For Partners */}
            <div className="stitch-card" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
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
          </div>
        </div>
      </section>

      {/* ===== AI-Powered Career Support ===== */}
      <section style={{ padding: '5rem 2rem', maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
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
      <section className="footer-cta" style={{ background: 'var(--color-accent)', padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'white', marginBottom: '1rem' }}>Your Next Step</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontSize: '1.125rem' }}>
            Apply now — about 10 minutes. We respond within 3–5 business days. Real certifications. Employer connections. No cost to members.
          </p>
          <Link href="/apply" className="btn btn-large" style={{ background: 'white', color: 'var(--color-accent)', fontWeight: 700 }}>
            Start Your Application
          </Link>
          <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            <Link href="/find-your-path" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'underline' }}>
              Not sure yet? Take the pathfinder quiz first.
            </Link>
          </p>
        </div>
      </section>

      </div>{/* end desktop wrapper */}

      {/* ── LEGACY mobile sections — now superseded by top Stitch mobile block above ── */}
      {/* ── Mobile Hero Section (≤640px) ── */}
      <section className="hidden px-4 pt-20 pb-6" style={{ background: '#fcf9f8' }}>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4" style={{ background: '#ffbb00', color: '#1c1b1b' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', fontVariationSettings: "'FILL' 1" }}>circle</span>
          Enrollment Open
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight leading-[0.95] mb-3" style={{ color: '#1c1b1b' }}>
          Free Career<br />
          <span style={{ color: '#ad2c4d' }}>Training</span>
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: '#584144' }}>
          Real certifications. Employer connections. No cost to members.
        </p>
        <div className="space-y-3">
          <Link href="/apply" className="block w-full text-center font-bold py-4 rounded-lg text-sm" style={{ background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)', color: '#fff' }}>
            Apply Free — Takes 10 Minutes
          </Link>
          <Link href="/find-your-path" className="block w-full text-center font-bold py-4 rounded-lg text-sm" style={{ background: '#ebe7e7', color: '#1c1b1b' }}>
            Find Your Path
          </Link>
        </div>
      </section>

      {/* ── Mobile Trust Strip (≤640px) ── */}
      <section className="hidden overflow-x-auto pb-4 px-4" style={{ background: '#f6f3f2' }}>
        <div className="flex gap-6 items-center pt-4" style={{ minWidth: 'max-content' }}>
          {['Google', 'IBM', 'AWS', 'CompTIA', 'AT&T'].map((p) => (
            <span key={p} className="text-sm font-black uppercase tracking-wider" style={{ color: '#8b7073', opacity: 0.7 }}>{p}</span>
          ))}
        </div>
      </section>

      {/* ── Mobile Stats Row (≤640px) ── */}
      <section className="hidden px-4 py-5 grid grid-cols-3 gap-2 text-center" style={{ background: '#fcf9f8' }}>
        {[['19', 'Programs'], ['$0', 'Cost'], ['12-24\nWks', 'Duration']].map(([val, label]) => (
          <div key={label} className="rounded-xl py-3 px-2" style={{ background: '#f0edec' }}>
            <div className="text-xl font-extrabold tracking-tight leading-none" style={{ color: '#ad2c4d' }}>{val}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: '#584144' }}>{label}</div>
          </div>
        ))}
      </section>

      {/* ── Mobile Journey Cards (≤640px) ── */}
      <section className="hidden px-4 py-5" style={{ background: '#f6f3f2' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#8b7073' }}>Your Journey</p>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {[
            { icon: 'quiz', step: '01', label: 'Quiz' },
            { icon: 'assignment_ind', step: '02', label: 'Apply' },
            { icon: 'school', step: '03', label: 'Train' },
            { icon: 'work', step: '04', label: 'Hired' },
          ].map(({ icon, step, label }) => (
            <div key={step} className="flex-shrink-0 w-24 rounded-xl p-3 text-center" style={{ background: '#fff', boxShadow: '0 1px 4px rgba(28,27,27,0.06)' }}>
              <span className="material-symbols-outlined text-2xl block mb-1" style={{ color: '#ad2c4d' }}>{icon}</span>
              <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#8b7073' }}>Phase {step}</div>
              <div className="text-xs font-bold mt-0.5" style={{ color: '#1c1b1b' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <MobileBottomNav />
      <Footer variant="home" />
    </div>
  );
}
