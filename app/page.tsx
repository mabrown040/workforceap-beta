import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import Footer from '@/components/Footer';
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

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px', padding: '6rem 2rem 5rem', textAlign: 'center' }}>
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
            maxWidth: '640px', margin: '0 auto 2.5rem', lineHeight: 1.7,
          }}>
            Intentional education designed for modern industry. We connect talented members with employers through {WORKFORCEAP_PROGRAM_CATALOG_SIZE} specialized programs and AI-powered support — nationwide.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
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

      {/* ===== 25+ Years Breaking Barriers — Bento: 2/3 text + 1/3 stats grid ===== */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
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
              The Workforce Advancement Project has spent over two decades removing financial and systemic barriers to professional success. Through employer-aligned curriculum, no-cost training, and dedicated placement support, we have helped thousands of members launch meaningful careers in technology, healthcare, skilled trades, and beyond.
            </p>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, maxWidth: '640px' }}>
              We believe education should be an investment in the future, not a debt for the present. Our program is funded through partnerships and successful placements.
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
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-gold)', lineHeight: 1 }}>94%</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placement</span>
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
      <section style={{ background: 'var(--surface-container-low)', padding: '6rem 0' }}>
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

      {/* ===== Final CTA ===== */}
      <section className="footer-cta" style={{ background: 'var(--color-accent)', padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'white', marginBottom: '1rem' }}>Your Next Step</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontSize: '1.125rem' }}>
            Apply now — about 10 minutes. We respond within 24-48 hours. Real certifications. Employer connections. No cost to members.
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

      <Footer variant="home" />
    </div>
  );
}
