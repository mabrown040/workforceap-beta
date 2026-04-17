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
    title: 'We review your application',
    desc: 'Our team reviews every application within 3–5 business days and matches your goals to the right program.',
  },
  {
    num: '2',
    title: 'You receive your next-step email',
    desc: 'Watch your inbox and spam folder for outreach from our team with enrollment details and scheduling info.',
  },
  {
    num: '3',
    title: 'You get connected to training and support',
    desc: 'If accepted, you will get access to your member portal, no-cost training resources, and counselor support.',
  },
];

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
                  background: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  boxShadow: '0 20px 40px -12px color-mix(in srgb, var(--color-accent) 35%, transparent)',
                }}
              >
                <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '2.75rem', '--ms-wght': 600 } as CSSProperties}>
                  check
                </span>
              </div>
              <h1 className="text-display-sm" style={{ marginBottom: '0.75rem', color: 'var(--color-on-surface)' }}>
                Application Received
              </h1>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '34rem', margin: '0 auto' }}>
                Thanks for applying. We&apos;ll reach out within 3–5 business days to confirm your next steps.
              </p>
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

            <div className="apply-confirmation-info-grid" style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.875rem', padding: '1.25rem' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.7 }}>
                  <strong>Questions?</strong> Call{' '}
                  <a href="tel:+15127771808" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>(512) 777-1808</a>
                  {' '}or email{' '}
                  <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>info@workforceap.org</a>
                </p>
              </div>

              <div style={{ background: 'var(--surface-container)', borderRadius: '0.875rem', padding: '1.25rem' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.7 }}>
                  <strong>While you wait:</strong> Bookmark{' '}
                  <Link href="/login" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>workforceap.org/login</Link>
                  {' '}and{' '}
                  <Link href="/apply/status" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>check your application status</Link>
                  {' '}with the email you used.
                </p>
              </div>
            </div>

            <section style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: '0 0 1rem' }}>
                Spread the word
              </p>
              <ShareButtons />
            </section>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/programs" className="btn btn-outline">
                Explore Programs
              </Link>
              <Link href="/" className="btn btn-primary">
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />

      <style>{`
        .apply-confirmation-info-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (max-width: 767px) {
          .apply-confirmation-info-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
