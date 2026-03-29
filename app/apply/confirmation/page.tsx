import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyConfirmationCta from '@/components/apply/ApplyConfirmationCta';
import MobileBottomNav from '@/components/MobileBottomNav';
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
    desc: 'Our team verifies your eligibility and background.',
  },
  {
    num: '2',
    title: 'A counselor will contact you',
    desc: 'A personalized 15-minute introductory call within 3–5 business days.',
  },
  {
    num: '3',
    title: 'You get matched to a program',
    desc: 'Start your journey with a curated curriculum built for your goals.',
  },
];

export default function ApplyConfirmationPage() {
  return (
    <div className="inner-page">

      {/* ===== MOBILE VIEW (≤640px) ===== */}
      <div className="md:hidden bg-[#fcf9f8] text-[#1c1b1b] min-h-screen pb-32">
        {/* Top App Bar */}
        <header className="fixed top-0 w-full z-50 bg-[#fcf9f8]/80 backdrop-blur-xl flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            <Link href="/apply" className="text-[#ad2c4d] hover:bg-[#ad2c4d]/5 transition-colors p-2 rounded-full active:opacity-80 active:scale-95">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="text-xl font-black text-[#ad2c4d] tracking-tighter">Workforce Academy</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#584144] font-bold tracking-tight text-lg">Success</span>
          </div>
        </header>

        <main className="pt-24 pb-32 px-6 max-w-[390px] mx-auto min-h-screen">
          {/* Success Icon */}
          <section className="flex flex-col items-center text-center mb-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#8c0f37] to-[#ad2c4d] flex items-center justify-center mb-6 shadow-xl shadow-[#8c0f37]/20">
              <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'wght' 600" }}>check</span>
            </div>
            <h2 className="text-3xl font-black text-[#1c1b1b] tracking-tight mb-3">Application Received!</h2>
            <p className="text-[#584144] text-base leading-relaxed max-w-[280px]">
              We will reach out within 3–5 business days to confirm next steps.
            </p>
          </section>

          {/* What Happens Next */}
          <section className="bg-[#f6f3f2] rounded-xl p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8c0f37]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <h3 className="text-sm font-bold tracking-[0.05em] uppercase text-[#8c0f37] mb-6">What happens next</h3>
            <div className="space-y-6">
              {NEXT_STEPS.map((step) => (
                <div key={step.num} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#e5e2e1] flex items-center justify-center text-[#8c0f37] font-bold">
                    {step.num}
                  </div>
                  <div className="pt-1">
                    <p className="text-[#1c1b1b] font-semibold text-sm">{step.title}</p>
                    <p className="text-[#584144] text-xs mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Social Proof + Main CTA */}
          <section className="space-y-6">
            <div className="text-center">
              <p className="text-xs font-medium text-[#584144] flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#7b5800]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                Join 2,000+ people who trained with us.
              </p>
            </div>
            <Link
              href="/programs"
              className="w-full py-4 bg-gradient-to-r from-[#8c0f37] to-[#ad2c4d] text-white rounded-xl font-bold text-base shadow-lg shadow-[#8c0f37]/10 active:scale-95 transition-all flex items-center justify-center"
            >
              Explore Programs while you wait
            </Link>
          </section>

          {/* Share Buttons */}
          <section className="mt-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#584144] text-center mb-4">Spread the word</p>
            <ShareButtons />
          </section>

          {/* Contact info */}
          <div className="mt-8 bg-[#f0edec] rounded-xl p-4">
            <p className="text-sm text-center text-[#584144]">
              <strong className="text-[#1c1b1b]">Questions?</strong>{' '}
              <a href="tel:+15127771808" className="text-[#8c0f37] font-semibold">(512) 777-1808</a>
              {' '}or{' '}
              <a href="mailto:info@workforceap.org" className="text-[#8c0f37] font-semibold">email us</a>
            </p>
          </div>
        </main>

        <MobileBottomNav />
      </div>

      {/* ===== DESKTOP VIEW (>640px) ===== */}
      <div className="hidden md:block">
        <section className="page-hero">
          <div className="page-hero-content">
            <h1>Application Received</h1>
            <p>Your application has been received. Here is what happens next:</p>
          </div>
        </section>

        <section className="content-section">
          <div className="container">
            <div className="apply-confirmation" style={{ maxWidth: '620px', margin: '0 auto' }}>
              <div className="apply-confirmation-icon" style={{ fontSize: '3rem', marginBottom: '1.5rem', textAlign: 'center' }}>&#10003;</div>

              <Suspense fallback={<div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Loading next steps...</div>}>
                <ApplyConfirmationCta />
              </Suspense>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span style={{ background: 'var(--color-accent)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>1</span>
                  <div>
                    <strong>Our team reviews your application</strong>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.95rem' }}>
                      We review every application within 3–5 business days. A counselor will look at your goals and match you with the right program.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span style={{ background: 'var(--color-accent)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>2</span>
                  <div>
                    <strong>You will receive an email with next steps</strong>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.95rem' }}>
                      Check your inbox (and spam folder) for a message from our team with your enrollment details.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span style={{ background: 'var(--color-accent)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>3</span>
                  <div>
                    <strong>If accepted, you will get access to your member portal</strong>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.95rem' }}>
                      Your portal gives you access to no-cost training for members, AI career tools, and your counselor &mdash; all in one place.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--surface-container-low)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  <strong>Questions?</strong> Call{' '}
                  <a href="tel:+15127771808" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>(512) 777-1808</a>{' '}
                  or email{' '}
                  <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>info@workforceap.org</a>
                </p>
              </div>

              <div style={{ background: 'var(--surface-container)', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem' }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  <strong>While you wait:</strong> Bookmark your portal login at{' '}
                  <Link href="/login" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>workforceap.org/login</Link>
                  . You can also{' '}
                  <Link href="/apply/status" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>check your application status</Link>
                  {' '}with the email you used — no password required.
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <Link href="/" className="btn btn-primary">
                  Return to home
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
