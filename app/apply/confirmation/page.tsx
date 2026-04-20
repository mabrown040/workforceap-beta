import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ApplyConfirmationCta from '@/components/apply/ApplyConfirmationCta';
import ShareButtons from '@/components/apply/ShareButtons';

export const metadata = buildPageMetadata({
  title: 'Application Received',
  description: 'Your application has been submitted successfully.',
  path: '/apply/confirmation',
});

const NEXT_STEPS = [
  {
    num: '1',
    title: 'Staff review starts first',
    desc: 'A WorkforceAP team member reviews your application, what you told us about your goals, and whether your selected program looks like the best fit.',
  },
  {
    num: '2',
    title: 'We send your next step within 3 to 5 business days',
    desc: 'Look for an email from WorkforceAP. We will tell you what comes next instead of leaving you to guess.',
  },
  {
    num: '3',
    title: 'We move you into the right next stage',
    desc: 'That may be a counselor conversation, program-fit guidance, account help, or training access depending on your path and readiness.',
  },
];

const WHILE_YOU_WAIT = [
  'Create your member account so you can check status and continue faster later.',
  'Watch your inbox and spam folder for an email from WorkforceAP.',
  'Keep the same email and phone number available so our team can reach you.',
];

const TRUST_SIGNALS = [
  {
    icon: 'badge',
    title: 'Reviewed by a real team',
    desc: 'Your application is reviewed by WorkforceAP staff, not dropped into an invisible queue.',
  },
  {
    icon: 'volunteer_activism',
    title: 'Nonprofit, member-first access',
    desc: 'WorkforceAP is a 501(c)(3) nonprofit in Austin. Programs are funded by grants and partnerships so members are not charged for access.',
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
                  background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)',
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
              <h1 className="text-display-sm" style={{ marginBottom: '0.75rem', color: 'var(--color-on-surface)' }}>
                Application Received
              </h1>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '34rem', margin: '0 auto 1rem' }}>
                Your application is in our review queue now. A WorkforceAP team member will review it and email you within 3 to 5 business days with the next step for your path.
              </p>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '9999px', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)', fontSize: '0.9rem', fontWeight: 600 }}>
                <span>Reviewed by staff</span>
                <span aria-hidden="true" style={{ opacity: 0.45 }}>•</span>
                <span>Email follow-up in 3 to 5 business days</span>
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
