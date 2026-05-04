import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ApplyConfirmationCta from '@/components/apply/ApplyConfirmationCta';
import ShareButtons from '@/components/apply/ShareButtons';
import ProgramCommitmentPanel from '@/components/portal/ProgramCommitmentPanel';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'You’re in the WorkforceAP system',
  description:
    'Your application is on file. See your timeline, what happens next in 1–2 business days, and what you can do now.',
  path: '/apply/confirmation',
});
}

const NEXT_STEPS = [
  {
    num: '1',
    title: 'You applied',
    desc: 'Your application is saved in the WorkforceAP system. Your goals, contact information, and program interest are on file for our team.',
  },
  {
    num: '2',
    title: 'Counselor review (about 1–2 business days)',
    desc: 'A WorkforceAP counselor reviews your application, checks fit with your chosen path, and lines up the right next conversation or paperwork.',
  },
  {
    num: '3',
    title: 'Program assignment',
    desc: 'We confirm or adjust your program so training, funding steps, and support match your situation. You will get clear instructions by email.',
  },
  {
    num: '4',
    title: 'Training start',
    desc: 'Once enrolled, you begin coursework and milestones with counselor support—so you always know where you are in the process.',
  },
];

const WHAT_YOU_CAN_DO_NOW = [
  {
    label: 'Create your member account',
    href: '/apply/create-account',
    desc: 'Check application status anytime and pick up faster when our team reaches out.',
  },
  {
    label: 'Open your dashboard for tools',
    href: '/login',
    desc: 'After you sign in, your dashboard is where AI career tools, messages, and learning live.',
  },
  {
    label: 'Browse programs and prep materials',
    href: '/programs',
    desc: 'Review program tracks and get oriented before your counselor follow-up.',
  },
] as const;

const TRUST_SIGNALS = [
  {
    icon: 'badge',
    title: 'Reviewed by a real team',
    desc: 'Your application is reviewed by WorkforceAP staff, not dropped into an invisible queue.',
  },
  {
    icon: 'volunteer_activism',
    title: 'Nonprofit, member-first access',
    desc: 'WorkforceAP is a 501(c)(3) nonprofit in Austin. A counselor will follow up with eligibility and next-step guidance.',
  },
  {
    icon: 'support_agent',
    title: 'Clear follow-up if you need help',
    desc: 'If you do not hear from us after 5 business days, call or email and our team will check your application with you.',
  },
] as const;

export default function ApplyConfirmationPage() {
  return (
    <div className="inner-page">
      <section className="content-section" style={{ paddingBottom: '2rem' }}>
        <div className="container" style={{ maxWidth: 980 }}>
          <div className="apply-confirmation-shell" style={{ maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div
                style={{
                  width: '5.5rem',
                  height: '5.5rem',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #8B0000, #C41E3A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  boxShadow: '0 20px 40px -12px rgba(140,15,55,0.35)',
                }}
              >
                <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '2.75rem', '--ms-wght': 600 } as CSSProperties}>
                  check
                </span>
              </div>
              <h1 className="text-display-sm" style={{ marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>
                You’re in the WorkforceAP system.
              </h1>
              <p style={{ color: 'var(--color-on-surface)', fontSize: '1.05rem', lineHeight: 1.65, maxWidth: '36rem', margin: '0 auto 0.75rem', fontWeight: 600 }}>
                Here’s exactly what happens next:
              </p>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '34rem', margin: '0 auto 1rem' }}>
                Your application is received and on file. A counselor will review it and email you within about 1–2 business days with the next concrete step for your path.
              </p>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '9999px', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)', fontSize: '0.9rem', fontWeight: 600 }}>
                <span>On file with WorkforceAP</span>
                <span aria-hidden="true" style={{ opacity: 0.45 }}>•</span>
                <span>Counselor review in ~1–2 business days</span>
              </div>
            </div>

            <Suspense fallback={<div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Loading next steps...</div>}>
              <ApplyConfirmationCta />
            </Suspense>

            <section style={{ background: 'var(--surface-container-low)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-accent)', margin: '0 0 1.25rem' }}>
                What happens next
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {NEXT_STEPS.map((step) => (
                  <div key={step.num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, width: '2rem', height: '2rem', borderRadius: '9999px', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                      {step.num}
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-on-surface)', fontWeight: 700, margin: 0 }}>{step.title}</p>
                      <p style={{ color: 'var(--color-on-surface-variant)', margin: '0.35rem 0 0', lineHeight: 1.6 }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-accent)', margin: '0 0 1rem' }}>
                What you can count on
              </h2>
              <div className="apply-confirmation-trust-grid" style={{ display: 'grid', gap: '1rem' }}>
                {TRUST_SIGNALS.map((item) => (
                  <div key={item.title} style={{ background: 'var(--surface-container-low)', borderRadius: '0.875rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem' }}>
                        {item.icon}
                      </span>
                      <p style={{ margin: 0, color: 'var(--color-on-surface)', fontWeight: 700 }}>{item.title}</p>
                    </div>
                    <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6, fontSize: '0.9375rem' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <div style={{ marginBottom: '1.5rem' }}>
              <ProgramCommitmentPanel variant="compact" />
            </div>

            <div className="apply-confirmation-info-grid" style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--surface-container)', borderRadius: '0.875rem', padding: '1.25rem' }}>
                <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-on-surface)' }}>What to do while you wait</h2>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>
                  {WHILE_YOU_WAIT.map((item) => (
                    <li key={item} style={{ marginBottom: '0.5rem' }}>{item}</li>
                  ))}
                </ul>
              </div>

              <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.875rem', padding: '1.25rem' }}>
                <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-on-surface)' }}>Need help or no email after 5 business days?</h2>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.7 }}>
                  Call{' '}
                  <a href="tel:+15127771808" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>(512) 777-1808</a>
                  {' '}or email{' '}
                  <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>info@workforceap.org</a>
                  . We can check your application with you.
                </p>
              </div>
            </div>

            <section style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#584144', margin: '0 0 1rem' }}>
                Spread the word
              </p>
              <ShareButtons />
            </section>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/apply/status" className="btn btn-primary">
                Check Application Status
              </Link>
              <Link href="/programs" className="btn btn-outline">
                Explore Programs
              </Link>
              <Link href="/" className="btn btn-secondary">
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />

      <style>{`
        .apply-confirmation-trust-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .apply-confirmation-info-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (max-width: 767px) {
          .apply-confirmation-trust-grid,
          .apply-confirmation-info-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
