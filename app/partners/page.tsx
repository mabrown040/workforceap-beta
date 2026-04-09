import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Community & Employer Partners | WorkforceAP',
  description:
    'Partner with WorkforceAP: employers hire talent, referral orgs send candidates, workforce boards align, funders support scale. Clear next steps for each.',
  path: '/partners',
});

const PARTNER_TYPES = [
  {
    icon: 'group',
    type: 'Referral Partners',
    who: 'Nonprofits, social services, churches, reentry programs, community centers, workforce centers, federal one-stop centers.',
    why: 'Refer clients who need career training. We follow up within 24-48 hours. No cost to refer. You get updates when referred individuals complete programs.',
    nextStep: { text: 'Contact to Refer', href: '/contact?topic=partnership' },
    colSpan: 8,
  },
  {
    icon: 'school',
    type: 'Training Centers',
    who: 'Educational institutions, community colleges, vocational schools, digital literacy centers.',
    why: 'Co-deliver employer-recognized certification programs. We bring the employer pipeline; you bring the learning environment.',
    nextStep: { text: 'Explore Co-Delivery', href: '/contact?topic=partnership' },
    colSpan: 4,
  },
  {
    icon: 'account_balance',
    type: 'Public Agencies',
    who: 'Workforce Solutions, TWC, WIOA providers, government workforce programs.',
    why: 'Align your participants with employer-recognized in-demand certifications. We handle training and placement; you strengthen outcomes for your population.',
    nextStep: { text: 'Discuss Alignment', href: '/contact?topic=partnership' },
    colSpan: 5,
  },
  {
    icon: 'favorite',
    type: 'Philanthropic Funders',
    who: 'Foundations, corporate giving, impact investors, individual donors.',
    why: 'Fund a model that works. Employer-aligned training, no participant debt, measurable job outcomes. We\'re growing nationwide and building toward national scale.',
    nextStep: { text: 'Learn How to Support', href: '/contact?topic=partnership' },
    colSpan: 7,
  },
];

const PLATFORM_FEATURES = [
  {
    icon: 'smart_toy',
    title: 'Smart Intake',
    desc: 'AI-assisted enrollment and eligibility screening reduces onboarding time by 60%, letting counselors focus on high-touch support.',
  },
  {
    icon: 'dashboard',
    title: 'Real-Time Dashboards',
    desc: 'Partners access live data on referral status, enrollment progress, certification completions, and placement outcomes.',
  },
  {
    icon: 'verified_user',
    title: 'Verification & Reporting',
    desc: 'Automated credential verification and WIOA-compliant reporting ensures accountability across every partnership.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Who can become a partner?',
    a: 'Employers, workforce development boards, non-profit services, churches, community organizations, social service agencies, and educational institutions can partner with WorkforceAP to refer candidates or hire graduates.',
  },
  {
    q: 'Is there a cost to refer candidates?',
    a: 'No. Referrals are free. We welcome partners who want to connect individuals in their network with our free career training programs.',
  },
  {
    q: 'How do I refer someone?',
    a: 'Contact us at info@workforceap.org or (512) 777-1808 with the candidate\'s name and contact information. You can also use our contact form and select "Partnership" as the topic.',
  },
  {
    q: 'Can I hire WorkforceAP graduates?',
    a: 'Yes. We actively connect employers with job-ready graduates. Reach out to discuss your hiring needs and we can share candidate profiles and schedule introductions.',
  },
  {
    q: 'What reporting do partners receive?',
    a: 'Partners receive regular updates on referral status, program completion rates, and placement outcomes. Our digital platform provides real-time dashboards for tracking progress.',
  },
];

export default function PartnersPage() {
  return (
    <div className="inner-page">
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url(https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(18,20,22,0.92) 0%, rgba(18,20,22,0.75) 50%, rgba(173,44,77,0.25) 100%)',
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
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', verticalAlign: '-2px', marginRight: '0.35rem' }} aria-hidden="true">
              handshake
            </span>
            A Legacy of Opportunity
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
            Build Your Community&rsquo;s{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-gold))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Future
            </span>
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
            Different partners, different roles. Find yours and take the next step
            in building a skilled workforce together.
          </p>

          <Link
            href="#partner-types"
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
            Find Your Role
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_downward</span>
          </Link>
        </div>
      </section>

      {/* Partner entry — scrolls to pathways (not member career finder) */}
      <section style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--color-light)' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>Not sure where to start?</p>
        <a href="#partner-types" className="btn btn-accent btn-lg" style={{ fontSize: '1.1rem', padding: '0.875rem 2rem' }}>
          Explore partnership types
        </a>
      </section>

      {/* ── Narrative Section ── */}
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
            <div style={{ gridColumn: 'span 5' }} className="partners-narrative-portrait">
              <div
                style={{
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  aspectRatio: '3 / 4',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80"
                  alt="Community leader"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            <div style={{ gridColumn: 'span 7' }} className="partners-narrative-text">
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
                Empowering Those Who{' '}
                <span style={{ color: 'var(--color-accent)' }}>Empower Others</span>
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
                &ldquo;We partner with employers who hire, orgs who refer, workforce boards who align,
                and funders who scale. Each partnership type has a clear path &mdash; because building a
                skilled workforce takes all of us working together.&rdquo;
              </blockquote>

              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                Referral partners send us candidates who may benefit from complimentary career training.
                We reach out within 24&ndash;48 hours and walk them through the process.
                We welcome referrals of individuals motivated to improve the quality of their life and interested in training in technology, healthcare, manufacturing, or skilled trades.
              </p>

              <ul style={{ paddingLeft: '1.25rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.8 }}>
                <li>Submit a referral via our contact form or partner portal</li>
                <li>We contact the candidate within 24&ndash;48 hours</li>
                <li>Accepted members receive training, certificates, and job placement support</li>
                <li>You receive updates when referred individuals complete programs</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Partnership Types Bento Grid ── */}
      <section id="partner-types" style={{ padding: '6rem 0' }}>
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
              Partnership{' '}
              <span style={{ color: 'var(--color-accent)' }}>Pathways</span>
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '1.5rem',
            }}
          >
            {PARTNER_TYPES.map((pt) => (
              <div
                key={pt.type}
                className="portal-card portal-card--flat"
                style={{
                  gridColumn: `span ${pt.colSpan}`,
                  padding: '2.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: 'var(--radius-xl)',
                  transition: 'var(--transition-base)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '2rem',
                    color: 'var(--color-accent)',
                    fontVariationSettings: "'FILL' 1",
                  }}
                 aria-hidden="true">
                  {pt.icon}
                </span>
                <h3
                  style={{
                    fontSize: '1.375rem',
                    fontWeight: 700,
                    color: 'var(--color-on-surface)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {pt.type}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                  <strong>You are:</strong> {pt.who}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.7, flex: 1 }}>
                  {pt.why}
                </p>
                <Link
                  href={pt.nextStep.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    marginTop: '0.5rem',
                  }}
                >
                  {pt.nextStep.text}
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">arrow_forward</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Digital Integration, Human Impact ── */}
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
            <div style={{ gridColumn: 'span 6' }} className="partners-platform-text">
              <h2
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 2.5rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-on-surface)',
                  lineHeight: 1.1,
                  marginBottom: '2rem',
                }}
              >
                Digital Integration,{' '}
                <span style={{ color: 'var(--color-accent)' }}>Human Impact</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {PLATFORM_FEATURES.map((f) => (
                  <div
                    key={f.title}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      padding: '1.5rem',
                      background: 'var(--surface-container)',
                      borderRadius: 'var(--radius-lg)',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '1.75rem',
                        color: 'var(--color-accent)',
                        fontVariationSettings: "'FILL' 1",
                        flexShrink: 0,
                      }}
                     aria-hidden="true">
                      {f.icon}
                    </span>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.35rem' }}>
                        {f.title}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: 'span 6' }} className="partners-platform-img">
              <figure
                style={{
                  margin: 0,
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  aspectRatio: '4 / 3',
                  background: 'var(--surface-container)',
                  position: 'relative',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=82"
                  alt="Diverse professionals collaborating at a laptop in a modern office"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
                />
                <figcaption
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '0.75rem 1rem',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.92)',
                    background: 'linear-gradient(180deg, transparent, rgba(18,20,22,0.82))',
                    lineHeight: 1.45,
                  }}
                >
                  Inclusive representation: we use imagery that reflects the communities we serve (66%+ diverse
                  subjects across WorkforceAP marketing visuals).
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ── Partner FAQ Accordion ── */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: '720px' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'block' }} aria-hidden="true">
              help
            </span>
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
              }}
            >
              Partner FAQ
            </h2>
          </div>

          <div className="faq-list">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="faq-item" style={{ marginBottom: '0.75rem' }}>
                <summary style={{ fontWeight: 600 }}>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '0 0 6rem' }}>
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
                background: 'radial-gradient(circle at 70% 50%, rgba(255,187,0,0.12) 0%, transparent 60%)',
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
              Lead the Change
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
              Join a growing network of partners building equitable pathways to career success
              across the nation.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', position: 'relative' }}>
              <Link
                href="/contact?topic=partnership"
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
                Become a Partner
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_forward</span>
              </Link>
              <Link
                href="/employers"
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
                Employer Solutions
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 1023px) {
          .partners-narrative-portrait { grid-column: span 12 !important; max-width: 400px; margin: 0 auto; }
          .partners-narrative-text { grid-column: span 12 !important; }
          .partners-platform-text { grid-column: span 12 !important; }
          .partners-platform-img { grid-column: span 12 !important; }
          #partner-types .portal-card.portal-card--flat { grid-column: span 12 !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}
