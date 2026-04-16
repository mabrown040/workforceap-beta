import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import MobileBottomNav from '@/components/MobileBottomNav';
import StatusBadge from '@/components/portal/StatusBadge';

export const metadata: Metadata = buildPageMetadata({
  title: 'Member guide',
  description: 'Your step-by-step guide to getting from enrolled to employed with WorkforceAP.',
  path: '/dashboard/guide',
});

const JOURNEY_STEPS = [
  {
    num: 1,
    title: 'Complete your profile',
    desc: 'Add your resume, skills, and career goals so we can match you to the right opportunities.',
    href: '/dashboard/profile',
    cta: 'Build your profile',
    icon: 'person',
  },
  {
    num: 2,
    title: 'Get assessment ready',
    desc: 'Take the career readiness assessment — it helps us understand where you are and where you want to go.',
    href: '/dashboard/skills-assessment',
    cta: 'Start assessment',
    icon: 'assignment',
  },
  {
    num: 3,
    title: 'Build your materials',
    desc: 'Use our AI tools to rewrite your resume, write a cover letter, and practice your interview skills.',
    href: '/dashboard/ai-tools',
    cta: 'Open AI tools',
    icon: 'auto_awesome',
  },
  {
    num: 4,
    title: 'Practice interviews',
    desc: "Practice with our AI Interview Coach — it's like a real interview, but you get feedback every time.",
    href: '/dashboard/ai-tools/interview-coach',
    cta: 'Practice now',
    icon: 'mic',
  },
  {
    num: 5,
    title: 'Connect with a counselor',
    desc: "Your counselor is here to help — book a 1-on-1 to talk through your job search and next moves.",
    href: '/dashboard/messages',
    cta: 'Message your counselor',
    icon: 'support_agent',
  },
];

const BENEFITS = [
  { icon: 'school', title: 'Coursera Access', desc: 'Access professional certificates from top institutions as part of your membership.' },
  { icon: 'auto_awesome', title: 'AI Career Tools', desc: '7 tools: resume, cover letter, interview coach, job matching, and more.' },
  { icon: 'person_pin', title: 'Your Counselor', desc: 'A human counselor is assigned to you — they want to hear from you.' },
  { icon: 'work', title: 'Job Board', desc: 'Browse openings from employers actively hiring WorkforceAP graduates.' },
];

const FAQS = [
  {
    q: 'How long does the program take?',
    a: 'Most members complete the core program in 4–8 weeks, but you can move at your own pace. There\'s no deadline.',
  },
  {
    q: 'Is everything free for me?',
    a: 'Yes. WorkforceAP is available at no cost to members. All tools, resources, and counselor access are included without member fees or program charges.',
  },
  {
    q: 'When will I get matched with a job?',
    a: 'Once you complete your profile and assessment, our system starts matching you to open roles from our employer network. You can also browse the job board anytime.',
  },
  {
    q: 'Who is my counselor and how do I reach them?',
    a: 'Your counselor is assigned when you enroll. You can message them directly from your dashboard under Messages.',
  },
  {
    q: 'What if I need help with something specific?',
    a: "Send a message to your counselor — they can help with anything from resume review to interview prep to job search strategy. That's what they're here for.",
  },
];

export default async function MemberGuidePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/guide');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      fullName: true,
      enrolledProgram: true,
      assessmentCompleted: true,
      profile: { select: { city: true } },
    },
  });
  if (!dbUser) redirect('/login');

  // Determine which step the member is on (0-indexed)
  const activeStep = !dbUser.profile?.city
    ? 0
    : !dbUser.assessmentCompleted
    ? 1
    : 2;

  const firstName = dbUser.fullName?.split(' ')[0] ?? 'there';

  return (
    <>
    <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '0 1rem 4rem' }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
        <Link href="/dashboard" style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', fontWeight: 500 }}>
          ← Back to dashboard
        </Link>
      </nav>

      {/* Header */}
      <header style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
          Member Guide
        </p>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-on-surface)', marginBottom: '0.75rem', lineHeight: 1.15 }}>
          Your WorkforceAP Journey
        </h1>
        <p style={{ fontSize: '1.0625rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.65, maxWidth: '38rem' }}>
          Hey {firstName} — here&apos;s exactly how to get from enrolled to employed. Five steps. You can do this.
        </p>
      </header>

      {/* Journey Steps */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ position: 'relative' }}>
          {/* Vertical connector line */}
          <div style={{
            position: 'absolute',
            left: '1.375rem',
            top: '2.5rem',
            bottom: '2.5rem',
            width: '2px',
            background: 'linear-gradient(to bottom, var(--color-accent), color-mix(in srgb, var(--color-accent) 20%, transparent))',
            opacity: 0.2,
          }} />

          {JOURNEY_STEPS.map((step, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            return (
              <div key={step.num} style={{
                display: 'flex',
                gap: '1.25rem',
                paddingBottom: '1.75rem',
                opacity: i > activeStep + 1 ? 0.5 : 1,
              }}>
                {/* Step indicator */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isDone
                      ? 'var(--color-accent)'
                      : isActive
                      ? 'var(--color-accent)'
                      : 'var(--surface-container-high)',
                    border: isActive ? '3px solid var(--color-accent)' : 'none',
                    boxShadow: isActive ? '0 0 0 4px color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'none',
                    position: 'relative',
                    zIndex: 1,
                    transition: 'all 0.2s',
                  }}>
                    {isDone ? (
                      <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.125rem' }} aria-hidden="true">check</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ color: isActive ? '#fff' : 'var(--color-on-surface-variant)', fontSize: '1.125rem' }} aria-hidden="true">{step.icon}</span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div style={{
                  flex: 1,
                  background: isActive ? 'var(--surface-container-lowest)' : 'transparent',
                  border: isActive ? '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)' : '1px solid transparent',
                  borderRadius: '0.875rem',
                  padding: isActive ? '1.25rem' : '0.25rem 0',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                    <span style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                    }}>
                      Step {step.num}
                    </span>
                    {isDone && <StatusBadge label="Done" variant="success" />}
                    {isActive && <StatusBadge label="Up next" variant="accent" />}
                  </div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: isActive ? 'var(--color-on-surface)' : 'var(--color-on-surface)',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.01em',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: isActive ? '1rem' : 0 }}>
                    {step.desc}
                  </p>
                  {isActive && (
                    <Link href={step.href} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.625rem 1.25rem',
                      background: 'var(--color-accent)',
                      color: 'var(--color-white)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      letterSpacing: '-0.01em',
                    }}>
                      {step.cta}
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">arrow_forward</span>
                    </Link>
                  )}
                  {!isActive && !isDone && (
                    <Link href={step.href} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--color-on-surface-variant)',
                      textDecoration: 'none',
                      marginTop: '0.375rem',
                    }}>
                      {step.cta}
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">arrow_forward</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefits */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Everything included with your membership
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {BENEFITS.map((b) => (
            <div key={b.title} className="portal-card portal-card--flat" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.625rem',
                background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }} aria-hidden="true">{b.icon}</span>
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>{b.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          Common questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {FAQS.map((faq) => (
            <div key={faq.q} className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                {faq.q}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.65 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)', borderRadius: '0.875rem', border: '1px solid color-mix(in srgb, var(--color-accent) 15%, transparent)' }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
            Still have questions?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
            Message your counselor — they&apos;re here to help with anything.{' '}
            <Link href="/dashboard/messages" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
              Send a message →
            </Link>
          </p>
        </div>
      </section>
    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
