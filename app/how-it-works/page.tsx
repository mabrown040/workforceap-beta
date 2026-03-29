import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { toVideoEmbedUrl } from '@/lib/platform/videoEmbed';

export const metadata: Metadata = buildPageMetadata({
  title: 'How It Works',
  description:
    'Your path from application through certification and job placement. Eleven clear steps — each designed to set you up for success.',
  path: '/how-it-works',
});

const PHASES = [
  {
    id: 1,
    label: 'Phase 1 — Get Started',
    title: 'Get Started',
    steps: [
      { num: 1, title: 'Apply', desc: 'Fill out a short online form — no test, no gatekeeping. We use it to understand your goals so we can help you. We reach out within 48 hours.', why: 'So we can personalize your path instead of sending you into a generic funnel.' },
      { num: 2, title: 'Overview', desc: 'Meet with a counselor to review programs, timelines, and what to expect. This is a conversation, not an exam — we want you to feel confident before you commit.', why: 'You deserve to know exactly what you\'re signing up for.' },
      { num: 3, title: 'Membership', desc: 'Join at no cost. All members get free access to resources, support, and training. No hidden fees, ever.', why: 'We remove money as a barrier so you can focus on learning.' },
    ],
  },
  {
    id: 2,
    label: 'Phase 2 — Build Your Future',
    title: 'Build Your Future',
    steps: [
      { num: 4, title: 'Assessment', desc: 'Skills and goals evaluation so we can match you with the right career path. Not a pass/fail test — a way to personalize your journey.', why: 'The right program for you is the one that fits your situation and goals.' },
      { num: 5, title: 'Interview', desc: 'A 30-minute one-on-one to answer your questions and confirm fit. We\'re making sure this is right for you — and that you\'re ready for it.', why: 'Mutual fit matters. We succeed when you succeed.' },
      { num: 6, title: 'Workforce Readiness', desc: 'Soft skills, job search basics, and workplace expectations — the foundation employers actually require. Often the part that gets people hired.', why: 'Credentials open doors; readiness gets you through them.' },
      { num: 7, title: 'Resources', desc: 'Loaner laptop program, resume support, community network, and on-demand tools. We back you up so you can focus on training.', why: 'You shouldn\'t have to figure it all out alone.' },
    ],
  },
  {
    id: 3,
    label: 'Phase 3 — Launch Your Career',
    title: 'Launch Your Career',
    steps: [
      { num: 8, title: 'Training', desc: 'Industry certification courses — taught by certified instructors or approved online platforms. The same credentials employers hire against.', why: 'Real credentials, not certificates of attendance.' },
      { num: 9, title: 'Certify', desc: 'Earn credentials recognized by employers — CompTIA, AWS, Google, Microsoft, and more. You walk away with proof employers trust.', why: 'Your resume needs more than "I took a class."' },
      { num: 10, title: 'Job Placement Assistance', desc: 'Resume review, interview prep, employer connections, and job search support until you land. We don\'t disappear after you graduate.', why: 'We\'re invested in your first hire, not just your last exam.' },
      { num: 11, title: 'Better Life', desc: 'A career that pays. Graduates average $42K+ starting in their new field — many see significant growth within 2–3 years.', why: 'This is the outcome we\'re both working toward.' },
    ],
  },
];

export default async function HowItWorksPage() {
  let overviewVideoEmbed: string | null = null;
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
                  color: '#1c1b1b',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '1.5rem',
                }}
              >
                Member Experience
              </span>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '2rem', lineHeight: 0.95 }}>
                Your career{' '}
                <span style={{ color: 'var(--color-accent)' }}>starts here.</span>
              </h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', maxWidth: '36rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
                We provide the tools, training, and long-term support needed to bridge the gap between where you are and where you want to be.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <Link
                  href="/apply"
                  style={{
                    display: 'inline-block',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Start Your Application
                </Link>
                <Link
                  href="/programs"
                  style={{
                    display: 'inline-block',
                    background: 'var(--surface-container-high)',
                    color: 'var(--color-on-surface)',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  View Program Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Journey: 11-Milestone Process */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0', overflow: 'hidden' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ marginBottom: '4rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
              Your Journey With Us
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '42rem' }}>
              A structured, 11-milestone roadmap designed to take you from applicant to successful professional.
            </p>
          </div>

          {PHASES.map((phase, phaseIdx) => (
            <div key={phase.id} style={{ marginBottom: phaseIdx < PHASES.length - 1 ? '4rem' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid rgba(88,65,68,0.1)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{phase.title}</h3>
                <span className="text-label-upper" style={{ color: 'var(--color-accent)' }}>{phase.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
                {phase.steps.map((step) => {
                  const isHighlight = step.num === 1 || step.num === 8 || step.num === 10 || step.num === 11;
                  return (
                    <div
                      key={step.num}
                      className="stitch-card"
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
              <div className="stitch-card-elevated" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ maxWidth: '60%' }}>
                  <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>Loaner Laptop Program</h2>
                  <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem', lineHeight: 1.7 }}>
                    Access to technology shouldn&rsquo;t be a barrier to education. We provide high-performance laptops to members who need them for the duration of their training program.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {['Pre-configured with all necessary software', 'Technical support included', 'Zero upfront cost for qualifying members'].map((item) => (
                      <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
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
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
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
              <div className="stitch-card" style={{ padding: '3rem' }}>
                <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '2rem' }}>Career Training Benefits</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                  {[
                    { icon: 'school', title: 'Tuition Coverage', desc: 'Comprehensive financial support for approved certification tracks and technical bootcamps.' },
                    { icon: 'groups', title: 'Peer Networks', desc: 'Access to an exclusive community of members and alumni for mentorship and networking.' },
                    { icon: 'work', title: 'Direct Pipeline', desc: 'Immediate consideration for openings within our 50+ employer partner network.' },
                    { icon: 'psychology', title: 'Soft Skill Coaching', desc: 'Dedicated sessions on leadership, communication, and emotional intelligence.' },
                  ].map((b) => (
                    <div key={b.title} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'var(--color-gold)', borderRadius: 'var(--radius-lg)' }}>
                          <span className="material-symbols-outlined" style={{ color: '#1c1b1b', fontSize: '1.25rem', fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
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
            Ready to bridge the gap?
          </h2>
          <p style={{ color: 'rgba(255,203,209,0.9)', fontSize: '1.125rem', maxWidth: '36rem', margin: '0 auto 2.5rem', position: 'relative', zIndex: 1 }}>
            Join hundreds of successful members who have launched their careers through Workforce Advancement Project.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <Link
              href="/apply"
              style={{
                background: 'var(--color-gold)',
                color: '#1c1b1b',
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

      {/* ── Mobile Journey View (≤640px) ── */}
      <section className="md:hidden px-4 pb-32 pt-8" style={{ background: '#fcf9f8' }}>
        <div className="mb-6">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ background: '#ffbb00', color: '#1c1b1b' }}>
            Member Experience
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight leading-none mb-3" style={{ color: '#1c1b1b' }}>
            Your Journey to{' '}
            <span style={{ color: '#ad2c4d' }}>Success</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#584144' }}>
            11 milestones from application to career growth.
          </p>
        </div>

        <div className="space-y-3">
          {PHASES.flatMap((phase) =>
            phase.steps.map((step) => {
              const isIntensive = step.num >= 5 && step.num <= 9;
              return (
                <div
                  key={step.num}
                  className="rounded-xl p-4 relative overflow-hidden"
                  style={{
                    background: isIntensive ? 'rgba(173, 44, 77, 0.06)' : '#fff',
                    border: isIntensive ? '1px solid rgba(173,44,77,0.15)' : 'none',
                    boxShadow: isIntensive ? 'none' : '0 1px 4px rgba(28,27,27,0.06)',
                  }}
                >
                  {/* Faded watermark number — Stitch style */}
                  <span
                    className="absolute -left-1 -top-3 text-7xl font-black select-none pointer-events-none"
                    style={{ color: isIntensive ? 'rgba(173,44,77,0.12)' : 'rgba(173,44,77,0.07)', lineHeight: 1 }}
                  >
                    {String(step.num).padStart(2, '0')}
                  </span>
                  <div className="relative pl-8">
                    {isIntensive && step.num === 5 && (
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 inline-block" style={{ background: '#ad2c4d', color: '#fff' }}>
                        Intensive Learning Phase
                      </span>
                    )}
                    <p className="font-bold text-sm" style={{ color: '#1c1b1b' }}>{step.title}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#584144' }}>{step.desc}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/apply"
            className="block w-full text-center font-bold py-4 rounded-lg text-sm"
            style={{ background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)', color: '#fff' }}
          >
            Start Your Application
          </Link>
          <Link
            href="/programs"
            className="block w-full text-center font-bold py-4 rounded-lg text-sm"
            style={{ background: '#ebe7e7', color: '#1c1b1b' }}
          >
            View Programs
          </Link>
        </div>
      </section>

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
