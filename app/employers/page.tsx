import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import EmployerContactForm from './EmployerContactForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hire Certified Tech Graduates | WorkforceAP',
  description:
    'Access pre-screened, certified tech talent. WorkforceAP graduates hold industry credentials from Google, IBM, AWS, CompTIA. Post jobs or become a hiring partner. Serving employers nationwide.',
  path: '/employers',
});

const VALUE_CARDS = [
  {
    icon: 'verified',
    title: 'Verified Skills',
    desc: 'Members complete training and are vetted through the Workforce Advancement Project process — with industry credentials from Google, IBM, Microsoft, AWS, CompTIA.',
  },
  {
    icon: 'diversity_3',
    title: 'Diverse Pipeline',
    desc: 'Access talent from underserved communities, adult learners, and veterans — bringing fresh perspectives and resilience to your teams.',
  },
  {
    icon: 'support_agent',
    title: 'Integration Support',
    desc: '150-day onboarding support for every hire. We help your new team members succeed long-term, not just on day one.',
  },
  {
    icon: 'auto_fix_high',
    title: 'Curriculum Agility',
    desc: 'Customized training pathways designed in partnership with employers to ensure curriculum aligns with specific organizational needs.',
  },
];

const COHORTS = [
  {
    icon: 'computer',
    title: 'IT Support',
    cert: 'IBM Professional Certificate',
    level: 'Entry-level',
    salary: '$55K-$72K',
    colSpan: 8,
    accent: true,
  },
  {
    icon: 'security',
    title: 'Cyber Defense',
    cert: 'Google / CompTIA pathway',
    level: 'Entry to mid',
    salary: '$75K-$112K',
    colSpan: 8,
    accent: false,
  },
  {
    icon: 'cloud_queue',
    title: 'Cloud AWS',
    cert: 'AWS Cloud Technology',
    level: 'Entry to mid',
    salary: '$95K-$145K',
    colSpan: 4,
    accent: false,
  },
  {
    icon: 'analytics',
    title: 'Data Intelligence',
    cert: 'Google Data Analytics',
    level: 'Entry-level',
    salary: '$72K-$102K',
    colSpan: 4,
    accent: false,
  },
];

const PROCESS_STEPS = [
  { num: 1, title: 'Post Your Opening', desc: 'Add your job to our employer portal. We match it to our pipeline.', icon: 'description' },
  { num: 2, title: 'Review Matched Candidates', desc: 'Receive pre-screened applicants who hold relevant certifications.', icon: 'person_search' },
  { num: 3, title: 'Interview & Hire', desc: 'You conduct interviews and make the hire. No placement fees.', icon: 'how_to_reg' },
  { num: 4, title: '150-Day Support', desc: 'We support your new hire\u2019s onboarding for long-term success.', icon: 'handshake' },
];

const PARTNERSHIP_TIERS = [
  {
    title: 'Standard',
    features: ['Post unlimited jobs', 'Access to active members and alumni', 'Direct candidate introductions'],
    cta: 'Start Standard Intake',
    href: '#employer-contact-form',
    featured: false,
  },
  {
    title: 'Strategic Partner',
    features: ['First access to graduating cohorts', 'Input on curriculum design', 'Co-branded success stories', 'Quarterly hiring events'],
    cta: 'Start Partner Intake',
    href: '#employer-contact-form',
    featured: true,
  },
  {
    title: 'Enterprise Upskill',
    features: ['Upskill your existing workforce', 'Custom training programs', 'Group enrollment discounts', 'Dedicated account manager'],
    cta: 'Start Upskill Intake',
    href: '#employer-contact-form',
    featured: false,
  },
];

const PARTNER_LOGOS = ['Google', 'IBM', 'AWS', 'CompTIA', 'Microsoft'];

export default function EmployersPage() {
  return (
    <div className="inner-page">
      {/* ── Hero ── */}
      <section
        style={{
          position: 'relative',
          minHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=82)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 35%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(18,20,22,0.94) 0%, rgba(18,20,22,0.78) 50%, rgba(173,44,77,0.2) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 'var(--max-width)', padding: '6rem 1.5rem 3rem' }}>
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
              rocket_launch
            </span>
            Building Tomorrow&apos;s Workforce
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
            Hire Certified,{' '}
            <span style={{ color: 'var(--color-accent)' }}>Job-Ready Talent</span>
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
            Start the employer intake with your hiring use case, role needs, volume, and timeline.
            We will route you to the right partnership path and follow up with matched talent options.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <Link
              href="#employer-contact-form"
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
              }}
            >
              Start Employer Intake
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_forward</span>
            </Link>
            <Link
              href="#employer-contact-form"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--color-gold)',
                color: 'var(--color-on-surface)',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Request a Hiring Match
            </Link>
          </div>
        </div>

        {/* Partner logos bar */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '1.5rem 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            marginTop: 'auto',
          }}
        >
          <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
            <div
              className="trust-logos"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Certification Partners:
              </span>
              {PARTNER_LOGOS.map((logo) => (
                <span key={logo} style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Employer Stats ===== */}
      <section style={{ padding: 'clamp(2rem, 4vw, 4rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '2rem', textAlign: 'center' }}>
          {[
            { stat: '200+', label: 'Graduates Placed' },
            { stat: '90%', label: 'Retention Rate' },
            { stat: '$0', label: 'Upfront Cost to You' },
          ].map((item) => (
            <div key={item.label} className="portal-card portal-card--flat" style={{ padding: '2rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1 }}>{item.stat}</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How It Works for Employers ===== */}
      <section style={{ padding: 'clamp(2rem, 4vw, 4rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 className="text-display-sm" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {[
            { step: '1', icon: 'work', title: 'Post a Role or Browse', desc: 'Tell us what you need — or browse our pipeline of trained, job-ready candidates.' },
            { step: '2', icon: 'groups', title: 'We Match You', desc: 'Our team connects you with vetted graduates whose skills align with your requirements.' },
            { step: '3', icon: 'handshake', title: 'Hire When Ready', desc: 'Interview on your timeline. No pressure, no placement fees, no strings attached.' },
          ].map((item) => (
            <div key={item.step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem', flexShrink: 0 }}>{item.step}</div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── The WorkforceAP Difference — Sticky sidebar + value cards ── */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            className="emp-diff-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '3rem',
            }}
          >
            {/* Sticky sidebar */}
            <div style={{ gridColumn: 'span 4' }} className="emp-diff-sidebar">
              <div style={{ position: 'sticky', top: 'calc(var(--main-nav-layout-height) + 1rem)' }}>
                <h2
                  style={{
                    fontSize: 'clamp(2rem, 3vw, 2.75rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'var(--color-on-surface)',
                    lineHeight: 1.1,
                    marginBottom: '1.25rem',
                  }}
                >
                  The WorkforceAP{' '}
                  <span style={{ color: 'var(--color-accent)' }}>Difference</span>
                </h2>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  Every candidate in our network completes structured training aligned with our
                  academic and professional partners.
                </p>
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', '--ms-fill': 1 }}>
                    psychology
                  </span>
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                    <strong>Guided career tools and counselor support:</strong> Members work through resumes,
                    interview prep, and applications with structured tools and one-on-one counselor guidance.
                  </p>
                </div>
              </div>
            </div>

            {/* Value cards */}
            <div style={{ gridColumn: 'span 8', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="emp-diff-cards">
              {VALUE_CARDS.map((card) => (
                <div
                  key={card.title}
                  style={{
                    padding: '2rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-xl)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    transition: 'var(--transition-base)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '2rem',
                      color: 'var(--color-accent)',
                      '--ms-fill': 1,
                    }}
                  >
                    {card.icon}
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-on-surface)', letterSpacing: '-0.01em' }}>
                    {card.title}
                  </h3>
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Talent Cohort Bento Grid ── */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
                marginBottom: '0.75rem',
              }}
            >
              Available <span style={{ color: 'var(--color-accent)' }}>Talent</span>
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '40rem', margin: '0 auto' }}>
              Graduate profiles by program and certification. Ranges match our published program outcomes.
              See <Link href="/programs" style={{ color: 'var(--color-accent)' }}>program pages</Link> and the{' '}
              <Link href="/salary-guide" style={{ color: 'var(--color-accent)' }}>salary guide</Link> for detail.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '1.5rem',
            }}
          >
            {COHORTS.map((c) => (
              <div
                key={c.title}
                style={{
                  gridColumn: `span ${c.colSpan}`,
                  padding: '2.5rem',
                  background: c.accent
                    ? 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))'
                    : 'var(--surface-container)',
                  borderRadius: 'var(--radius-xl)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'var(--transition-base)',
                }}
                className="emp-cohort-card"
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '2.25rem',
                    color: c.accent ? 'rgba(255,255,255,0.9)' : 'var(--color-accent)',
                    '--ms-fill': 1,
                  }}
                >
                  {c.icon}
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: c.accent ? '#fff' : 'var(--color-on-surface)' }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: c.accent ? 'rgba(255,255,255,0.7)' : 'var(--color-on-surface-variant)' }}>
                  {c.cert}
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.75rem',
                    borderTop: c.accent ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--outline-variant)',
                    marginTop: 'auto',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: c.accent ? 'rgba(255,255,255,0.85)' : 'var(--color-on-surface-variant)' }}>
                    {c.level}
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: c.accent ? '#fff' : 'var(--color-accent)' }}>
                    {c.salary}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Hiring Works — 4-step process ── */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
                marginBottom: '0.75rem',
              }}
            >
              How Hiring{' '}
              <span style={{ color: 'var(--color-accent)' }}>Experience</span>
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>Submit the employer intake and we will review it within 24–48 hours.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', position: 'relative' }} className="emp-process-grid">
            {/* Timeline connector */}
            <div
              style={{
                position: 'absolute',
                top: '2.25rem',
                left: '12.5%',
                right: '12.5%',
                height: '2px',
                background: 'linear-gradient(90deg, var(--color-accent), var(--color-gold))',
                zIndex: 0,
              }}
              className="emp-timeline-bar"
            />

            {PROCESS_STEPS.map((step) => (
              <div
                key={step.num}
                style={{
                  textAlign: 'center',
                  padding: '0 1rem',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.25rem',
                    margin: '0 auto 1.5rem',
                    boxShadow: 'var(--shadow-glow-accent)',
                    border: '3px solid var(--surface-container-low)',
                  }}
                >
                  {step.num}
                </div>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '2rem',
                    color: 'var(--color-accent)',
                    marginBottom: '0.75rem',
                    display: 'block',
                    '--ms-fill': 1,
                  }}
                >
                  {step.icon}
                </span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partnership Tiers ── */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
                marginBottom: '0.75rem',
              }}
            >
              Solutions Scaled for{' '}
              <span style={{ color: 'var(--color-accent)' }}>Impact</span>
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>Choose the level that fits your hiring needs</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} className="emp-tiers-grid">
            {PARTNERSHIP_TIERS.map((tier) => (
              <div
                key={tier.title}
                style={{
                  padding: '2.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  position: 'relative',
                  background: tier.featured
                    ? 'linear-gradient(135deg, var(--surface-container-high), var(--surface-container))'
                    : 'var(--surface-container)',
                  borderRadius: 'var(--radius-xl)',
                  border: tier.featured ? '2px solid var(--color-accent)' : '1px solid var(--outline-variant)',
                  transition: 'var(--transition-base)',
                }}
              >
                {tier.featured && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-0.75rem',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      padding: '0.25rem 1rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Most Popular
                  </span>
                )}
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                  {tier.title}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: 'var(--color-on-surface-variant)',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '1rem', color: 'var(--color-accent)', '--ms-fill': 1 }}
                      >
                        check_circle
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: tier.featured ? 'var(--color-accent)' : 'var(--surface-container-high)',
                    color: tier.featured ? '#fff' : 'var(--color-on-surface)',
                    padding: '0.875rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    transition: 'var(--transition-base)',
                  }}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Form Section ── */}
      <section id="employer-contact" style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            style={{
              background: 'var(--color-accent)',
              borderRadius: 'var(--radius-xl)',
              padding: '4rem 3rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '3rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 0% 50%, rgba(255,187,0,0.12) 0%, transparent 50%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ flex: '1 1 400px', position: 'relative', zIndex: 1 }}>
              <h2
                style={{
                  fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: '1.5rem',
                  letterSpacing: '-0.02em',
                }}
              >
                Ready to Hire Certified Talent?
              </h2>
              <p style={{ color: 'rgba(255,203,209,0.9)', fontSize: '1.125rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Tell us what roles you need, how many you are hiring, and when you need them filled.
                We will route you into the right employer intake path and follow up with matched talent options.
              </p>
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.15rem' }}>schedule</span>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    Response time: 24–48 hours after submission.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.15rem' }}>groups</span>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    For employers hiring now, building a pipeline, or planning an upskill program.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.15rem' }}>fact_check</span>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    We review your use case, hiring volume, timeline, and role requirements before the first follow-up.
                  </p>
                </div>
              </div>
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>Direct contact</p>
                <p style={{ marginBottom: '0.25rem', color: 'rgba(255,255,255,0.9)' }}>
                  <strong>Michael Brown</strong>
                </p>
                <p style={{ marginBottom: '0.25rem' }}>
                  <a href="mailto:michael.brown@workforceap.org" style={{ color: '#fff' }}>
                    michael.brown@workforceap.org
                  </a>
                </p>
                <p>
                  <a href="tel:5127771808" style={{ color: '#fff' }}>
                    (512) 777-1808
                  </a>
                </p>
              </div>
            </div>
            <div style={{ flex: '1 1 400px', position: 'relative', zIndex: 1 }}>
              <EmployerContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Employer CTA ===== */}
      <section style={{ padding: 'clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 2rem)', textAlign: 'center' }}>
        <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>Ready to Hire?</h2>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Tell us what you&apos;re hiring for, how many roles you have open, and your timeline so we can route you to the right employer intake path.
        </p>
        <a href="#employer-contact-form" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
          Start Employer Intake
        </a>
      </section>

      <style>{`
        @media (max-width: 1023px) {
          .emp-diff-grid { gap: 2rem !important; }
          .emp-diff-sidebar { grid-column: span 12 !important; }
          .emp-diff-cards { grid-column: span 12 !important; }
          .emp-tiers-grid { grid-template-columns: 1fr !important; max-width: 480px; margin: 0 auto; }
          .emp-cohort-card { grid-column: span 12 !important; }
        }
        @media (max-width: 767px) {
          .emp-process-grid { grid-template-columns: 1fr 1fr !important; gap: 2rem !important; }
          .emp-timeline-bar { display: none !important; }
          .emp-diff-cards { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .emp-stats-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 0.75rem !important; }
          .emp-stats-grid > div { padding: 1rem !important; }
          .emp-stats-grid h3 { font-size: 1.5rem !important; }
        }
      `}</style>

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
