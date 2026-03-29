import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import Footer from '@/components/Footer';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Tech Career Training in Austin, TX | Workforce Advancement Project',
  description:
    'Get no-cost career certification training in Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Employer-aligned programs. Apply today — WorkforceAP serves Austin and beyond.',
  path: '/',
});

export default async function HomePage() {
  const activePrograms = await getActivePrograms();
  const featured = activePrograms.filter((p) => p.featured);
  const homeProgramShowcase = (featured.length ? featured : activePrograms).slice(0, 8);
  const programCount = activePrograms.length;

  return (
    <div className="homepage" style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}>
      {/* Hero Section — Editorial Asymmetric Layout */}
      <section style={{ position: 'relative', padding: '6rem 2rem 5rem', maxWidth: '1400px', margin: '0 auto', overflow: 'hidden' }}>
        <div className="editorial-grid" style={{ alignItems: 'center' }}>
          <div style={{ gridColumn: 'span 12' }} className="lg-col-span-7">
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
              Empowering the Workforce
            </span>
            <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '2rem' }}>
              The Bridge to Your{' '}
              <span style={{ color: 'var(--color-accent)' }}>Next Career.</span>
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--color-on-surface-variant)', maxWidth: '600px', marginBottom: '2.5rem', lineHeight: 1.7 }}>
              Intentional education designed for modern industry. We connect talented members with employers through {WORKFORCEAP_PROGRAM_CATALOG_SIZE} specialized programs and AI-powered support.
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
        </div>
      </section>

      {/* Stakeholder Roles — Tonal Layering Cards */}
      <section style={{ background: 'var(--surface-container-low)', padding: '6rem 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* For Members */}
            <div className="stitch-card" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(173,44,77,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined">person</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>For Members</h3>
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

            {/* For Employers */}
            <div className="stitch-card" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(255,187,0,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined">business</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>For Employers</h3>
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
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>For Partners</h3>
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

      {/* Programs Bento Grid */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '4rem' }}>
          <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>Explore Our {programCount} Programs</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '600px' }}>
            Specialized career paths designed to bridge the skills gap in high-growth industries.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {homeProgramShowcase.map((p, i) => (
            <Link
              key={p.slug}
              href={`/programs/${p.slug}`}
              className="stitch-card"
              style={{
                background: i === 0 ? 'var(--color-accent)' : 'var(--surface-container-high)',
                color: i === 0 ? 'white' : 'var(--color-on-surface)',
                padding: '1.5rem',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                ...(i === 0 ? { gridRow: 'span 2', minHeight: '200px', justifyContent: 'space-between' } : {}),
              }}
            >
              <h4 style={{ fontWeight: 700 }}>{p.static?.title ?? p.name}</h4>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{p.category}</span>
              {i === 0 && (
                <span style={{ marginTop: 'auto', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Learn More <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
                </span>
              )}
            </Link>
          ))}
          <Link
            href="/programs"
            style={{
              background: 'var(--surface-container-high)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: 'var(--color-on-surface)',
              textDecoration: 'none',
              transition: 'background var(--transition-base)',
            }}
          >
            View All {programCount} Programs
          </Link>
        </div>
      </section>

      {/* Zero Cost Section */}
      <section style={{ background: 'var(--surface-container-lowest)', padding: '6rem 0', borderTop: '1px solid var(--surface-container)', borderBottom: '1px solid var(--surface-container)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4rem' }}>
          <div style={{ flex: '1 1 400px' }}>
            <h2 className="text-display-sm" style={{ marginBottom: '1.5rem' }}>
              Zero Upfront Cost.<br />Infinite Potential.
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem', lineHeight: 1.7 }}>
              We believe education should be an investment in the future, not a debt for the present. Our program is funded through partnerships and successful placements.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', marginTop: '0.125rem' }}>savings</span>
                <div>
                  <h5 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No Tuition Fees</h5>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>Members never pay out-of-pocket for their core curriculum.</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', marginTop: '0.125rem' }}>laptop_mac</span>
                <div>
                  <h5 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Resources Included</h5>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>Access to all software, tools, and loaner laptops is provided.</p>
                </div>
              </div>
            </div>
          </div>
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ background: 'var(--surface-container)', padding: '2.5rem', borderRadius: 'var(--radius-xl)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-1rem', left: '-1rem', background: 'var(--color-accent)', color: 'white', padding: '0.25rem 1rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: 'var(--radius-sm)' }}>
                The Promise
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className="text-label-upper" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', display: 'block' }}>Member Cost</span>
                <span style={{ fontSize: '6rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--color-accent)', lineHeight: 1 }}>$0</span>
                <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--surface-container-highest)', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                  &ldquo;Our mission is to remove financial barriers to professional success through intentional partnership.&rdquo;
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Journey Milestones */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <h2 className="text-display-sm" style={{ marginBottom: '4rem', textAlign: 'center' }}>Your Journey to Success</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '3rem', position: 'relative' }}>
          {[
            { num: '01', title: 'Apply', desc: 'Submit your application and choose your specialized track.' },
            { num: '02', title: 'Train', desc: 'Intensive skill-building with industry-expert mentorship.' },
            { num: '03', title: 'Certify', desc: 'Gain recognized credentials that employers value.' },
            { num: '04', title: 'Placed', desc: 'Direct introductions to our network of employer partners.' },
          ].map((step) => (
            <div key={step.num} style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '6rem', height: '6rem', borderRadius: '50%', background: 'var(--surface-container-low)', border: '4px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-gold)' }}>{step.num}</span>
              </div>
              <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{step.title}</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link href="/how-it-works" className="btn btn-secondary">See Full Process</Link>
        </div>
      </section>

      {/* AI-Powered Career Intelligence */}
      <section style={{ background: 'var(--surface-container)', padding: '6rem 0', margin: '0 2rem 6rem', borderRadius: 'var(--radius-xl)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', background: 'rgba(173,44,77,0.05)', transform: 'skewX(-12deg) translateX(25%)' }} />
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 3rem', position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4rem' }}>
          <div style={{ flex: '1 1 450px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', background: 'rgba(173,44,77,0.2)', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.5rem', border: '1px solid rgba(173,44,77,0.3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>bolt</span> Next-Gen Support
            </div>
            <h2 className="text-display-sm" style={{ marginBottom: '2rem', lineHeight: 1.1 }}>AI-Powered Career Intelligence.</h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', marginBottom: '2.5rem' }}>
              Every member is paired with our AI assistant that provides 24/7 resume auditing, interview simulation, and skill-gap analysis tailored to your chosen industry.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)' }}>
                <h5 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Interview Prep</h5>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>Real-time feedback on your mock interview performance.</p>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)' }}>
                <h5 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Skill Mapping</h5>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>Dynamic course recommendations based on market trends.</p>
              </div>
            </div>
          </div>
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ background: 'var(--surface-container-low)', padding: '2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>smart_toy</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>WAP AI Assistant</div>
                    <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 500 }}>Online &amp; Ready</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--surface-container-high)', padding: '1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', maxWidth: '80%' }}>
                  Based on your progress, I&apos;ve identified 3 open roles at our partner firms that match your skills.
                </div>
                <div style={{ background: 'rgba(173,44,77,0.2)', border: '1px solid rgba(173,44,77,0.3)', padding: '1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', maxWidth: '80%', marginLeft: 'auto', fontWeight: 500 }}>
                  That&apos;s great! Can you help me prep for those interviews?
                </div>
                <div style={{ background: 'var(--surface-container-high)', padding: '1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', maxWidth: '80%' }}>
                  Absolutely. Let&apos;s start with a technical walkthrough of your latest project. Ready?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="footer-cta" style={{ background: 'var(--color-accent)', padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'white', marginBottom: '1rem' }}>Your Next Step</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontSize: '1.125rem' }}>
            Apply now — about 10 minutes. We respond within 24–48 hours. Real certifications. Employer connections. No cost to members.
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
