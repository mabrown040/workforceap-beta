import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { toVideoEmbedUrl } from '@/lib/platform/videoEmbed';
import { MARKETING_JOURNEY_STEPS } from '@/lib/content/marketingJourneySteps';

export const metadata: Metadata = buildPageMetadata({
  title: 'How It Works',
  description:
    'Your path from application through certification and job placement. Ten clear steps — each designed to set you up for success.',
  path: '/how-it-works',
});

const PHASES = [
  {
    id: 1,
    label: 'Phase 1 — Get Started',
    title: 'Get Started',
    steps: MARKETING_JOURNEY_STEPS.filter((s) => s.num <= 3).map((s) => ({
      num: s.num,
      title: s.title,
      desc: s.longDesc,
      why: s.why,
    })),
  },
  {
    id: 2,
    label: 'Phase 2 — Build Your Future',
    title: 'Build Your Future',
    steps: MARKETING_JOURNEY_STEPS.filter((s) => s.num >= 4 && s.num <= 6).map((s) => ({
      num: s.num,
      title: s.title,
      desc: s.longDesc,
      why: s.why,
    })),
  },
  {
    id: 3,
    label: 'Phase 3 — Launch Your Career',
    title: 'Launch Your Career',
    steps: MARKETING_JOURNEY_STEPS.filter((s) => s.num >= 7).map((s) => ({
      num: s.num,
      title: s.title,
      desc: s.longDesc,
      why: s.why,
    })),
  },
];

export default async function HowItWorksPage() {
  let overviewVideoEmbed: string | null = null;
  if (!shouldSkipOptionalDbQueriesAtBuild()) {
    try {
      const orgId = await getDefaultOrganizationId();
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { overviewVideoUrl: true },
      });
      if (org?.overviewVideoUrl) overviewVideoEmbed = toVideoEmbedUrl(org.overviewVideoUrl);
    } catch {
      overviewVideoEmbed = null;
    }
  }

  return (
    <div className="inner-page">
      {/* Hero Section */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="editorial-grid">
            <div style={{ gridColumn: 'span 12' }} className="hiw-hero-left">
              <span
                className="text-label-upper"
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  background: 'var(--color-gold)',
                  color: 'var(--color-on-surface)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '1.5rem',
                }}
              >
                Member Experience
              </span>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '2rem', lineHeight: 0.95 }}>
                Your path{' '}
                <span style={{ color: 'var(--color-accent)' }}>starts here.</span>
              </h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', maxWidth: '36rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
                No gatekeeping. No cost. Just a clear, guided process — from your first conversation with us to your first day on the job (and beyond).
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <Link
                  href="/find-your-path"
                  style={{
                    display: 'inline-block',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    textDecoration: 'none',
                  }}
                >
                  Find your career
                </Link>
                <Link
                  href="/apply"
                  style={{
                    display: 'inline-block',
                    background: 'var(--surface-container-high)',
                    color: 'var(--color-on-surface)',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    textDecoration: 'none',
                  }}
                >
                  Apply now
                </Link>
                <Link
                  href="/programs"
                  style={{
                    display: 'inline-block',
                    background: 'transparent',
                    color: 'var(--color-accent)',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    textDecoration: 'none',
                    border: '2px solid var(--color-accent)',
                  }}
                >
                  View programs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Journey: 10-step process (same steps as homepage) */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0', overflow: 'hidden' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ marginBottom: '4rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
              What Happens After You Apply
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '42rem' }}>
              Ten steps, three phases. Every step has a purpose — and a person supporting you through it.
            </p>
          </div>

          {PHASES.map((phase, phaseIdx) => (
            <div key={phase.id} style={{ marginBottom: phaseIdx < PHASES.length - 1 ? '4rem' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid rgba(88,65,68,0.1)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{phase.title}</h3>
                <span className="text-label-upper" style={{ color: 'var(--color-accent)' }}>{phase.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: '1.5rem' }}>
                {phase.steps.map((step) => {
                  const isHighlight = step.num === 1 || step.num === 7 || step.num === 9 || step.num === 10;
                  return (
                    <div
                      key={step.num}
                      className="portal-card portal-card--flat"
                      style={{
                        padding: '1.5rem',
                        ...(isHighlight ? { borderLeft: `4px solid var(--color-accent)` } : {}),
                      }}
                    >
                      <span className="text-label-upper" style={{ color: isHighlight ? 'var(--color-accent)' : 'var(--color-on-surface-variant)', marginBottom: '0.5rem', display: 'block' }}>
                        Phase {String(step.num).padStart(2, '0')}
                      </span>
                      <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>{step.title}</h4>
                      {step.num === 2 && overviewVideoEmbed ? (
                        <div style={{ margin: '1rem 0' }}>
                          <div
                            style={{
                              position: 'relative',
                              paddingBottom: '56.25%',
                              height: 0,
                              overflow: 'hidden',
                              borderRadius: 'var(--radius-md)',
                              background: '#111',
                            }}
                          >
                            <iframe
                              title="Overview — counselor introduction"
                              src={overviewVideoEmbed}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem' }}>
                            Prefer to read? The summary below is always available.
                          </p>
                        </div>
                      ) : null}
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{step.desc}</p>
                      {step.why && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.75rem', fontStyle: 'italic', opacity: 0.8 }}>
                          Why: {step.why}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="content-section">
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="editorial-grid" style={{ gap: '1.5rem' }}>
            {/* Loaner Laptop */}
            <div style={{ gridColumn: 'span 12' }} className="hiw-benefit-wide">
              <div className="portal-card portal-card--elevated" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ maxWidth: 'min(42rem, 100%)' }}>
                  <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>Loaner Laptop Program</h2>
                  <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem', lineHeight: 1.7 }}>
                    Access to technology shouldn&rsquo;t be a barrier to education. We provide high-performance laptops to members who need them for the duration of their training program.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {['Pre-configured with all necessary software', 'Technical support included', 'Zero upfront cost for qualifying members'].map((item) => (
                      <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', '--ms-fill': 1 }}>check_circle</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 150-Day Support */}
            <div style={{ gridColumn: 'span 12' }} className="hiw-benefit-accent">
              <div style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius-xl)', padding: '3rem', color: '#fff', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <div style={{ width: '4rem', height: '4rem', background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', '--ms-fill': 1 }}>calendar_today</span>
                  </div>
                  <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>150-Day Post-Hire Support</h2>
                  <p style={{ color: 'rgba(255,203,209,0.9)', lineHeight: 1.7, maxWidth: '36rem' }}>
                    We don&rsquo;t just find you a job; we help you keep it. Our support continues for five months after your start date.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {[
                    { label: 'Benefit 01', text: 'Monthly Check-ins' },
                    { label: 'Benefit 02', text: 'Conflict Resolution' },
                    { label: 'Benefit 03', text: 'Advancement Coaching' },
                  ].map((b) => (
                    <div key={b.label} style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p className="text-label-upper" style={{ opacity: 0.7, marginBottom: '0.25rem', fontSize: '0.65rem' }}>{b.label}</p>
                      <p style={{ fontWeight: 500 }}>{b.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Career Training Benefits */}
            <div style={{ gridColumn: 'span 12' }}>
              <div className="portal-card portal-card--flat" style={{ padding: '3rem' }}>
                <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '2rem' }}>Career Training Benefits</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                  {[
                    { icon: 'school', title: 'Program Cost Coverage', desc: 'Approved certification tracks and technical bootcamps are funded through grants and partnerships.' },
                    { icon: 'groups', title: 'Peer Networks', desc: 'Access to an exclusive community of members and alumni for mentorship and networking.' },
                    { icon: 'work', title: 'Direct Pipeline', desc: 'Immediate consideration for openings within our 50+ employer partner network.' },
                    { icon: 'psychology', title: 'Soft Skill Coaching', desc: 'Dedicated sessions on leadership, communication, and emotional intelligence.' },
                  ].map((b) => (
                    <div key={b.title} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'var(--color-gold)', borderRadius: 'var(--radius-lg)' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface)', fontSize: '1.25rem', '--ms-fill': 1 }}>{b.icon}</span>
                        </div>
                        <h4 style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{b.title}</h4>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{b.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="content-section" style={{ padding: '5rem 1rem' }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          background: 'linear-gradient(to right, var(--color-accent), var(--color-accent-dark))',
          borderRadius: 'var(--radius-xl)',
          padding: '4rem 3rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <h2 className="text-display-sm" style={{ color: '#fff', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
            Ready to take the first step?
          </h2>
          <p style={{ color: 'rgba(255,203,209,0.9)', fontSize: '1.125rem', maxWidth: '36rem', margin: '0 auto 2.5rem', position: 'relative', zIndex: 1 }}>
            The application takes about ten minutes. It&rsquo;s a conversation, not an exam — and there&rsquo;s no application fee.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <Link
              href="/apply"
              style={{
                background: 'var(--color-gold)',
                color: 'var(--color-on-surface)',
                padding: '1.25rem 2.5rem',
                borderRadius: 'var(--radius-xl)',
                fontWeight: 900,
                fontSize: '1.125rem',
                textDecoration: 'none',
              }}
            >
              Apply For Next Cohort
            </Link>
            <Link
              href="/contact"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '1.25rem 2.5rem',
                borderRadius: 'var(--radius-xl)',
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.2)',
                textDecoration: 'none',
              }}
            >
              Speak with an Advisor
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (min-width: 1024px) {
          .hiw-hero-left { grid-column: 1 / 8 !important; }
          .hiw-benefit-wide { grid-column: 1 / 9 !important; }
          .hiw-benefit-accent { grid-column: 9 / 13 !important; }
        }
      `}</style>

      <MobileBottomNav />
      <Footer />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
