import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import MainNav from '@/components/MainNav';
import ApplyConfirmationCta from '@/components/apply/ApplyConfirmationCta';

export const metadata = buildPageMetadata({
  title: 'Application Received',
  description: 'Your application has been submitted successfully.',
  path: '/apply/confirmation',
});

export default function ApplyConfirmationPage() {
  return (
    <div style={{ backgroundColor: '#141313', minHeight: '100vh', color: '#e6e1e1' }}>
      <MainNav />

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 24px 100px', textAlign: 'center' }}>
        {/* Checkmark */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(173,44,77,0.15)', border: '2px solid rgba(173,44,77,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 32px', fontSize: '2.5rem'
        }}>
          ✅
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
          Application Received!
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#a8a3a3', lineHeight: 1.6, marginBottom: '48px', maxWidth: '520px', margin: '0 auto 48px' }}>
          We&apos;ll reach out within 2–3 business days to schedule your overview session.
        </p>

        <Suspense fallback={null}>
          <ApplyConfirmationCta />
        </Suspense>

        {/* What happens next */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '40px',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '28px', textAlign: 'center' }}>
            What Happens Next
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[
              {
                step: '1',
                title: 'Email Confirmation',
                desc: 'Check your inbox for a confirmation email with your application details and next steps.'
              },
              {
                step: '2',
                title: 'Overview Session',
                desc: 'A counselor will contact you within 2–3 business days to schedule a 30-minute overview call.'
              },
              {
                step: '3',
                title: 'Assessment & Enrollment',
                desc: 'Complete a brief skills assessment, then get matched to the right program — free for members.'
              }
            ].map((item) => (
              <div key={item.step} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: '#ad2c4d', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                }}>
                  {item.step}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '0.9rem', color: '#a8a3a3', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Questions box */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '32px',
          fontSize: '0.95rem',
          color: '#a8a3a3',
          textAlign: 'left'
        }}>
          <strong style={{ color: '#e6e1e1' }}>Questions?</strong>{' '}
          Call <a href="tel:+15127771808" style={{ color: '#ad2c4d', fontWeight: 600 }}>(512) 777-1808</a>{' '}
          or email <a href="mailto:info@workforceap.org" style={{ color: '#ad2c4d', fontWeight: 600 }}>info@workforceap.org</a>
        </div>

        {/* CTA */}
        <Link href="/programs" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#ad2c4d', color: '#fff', borderRadius: '8px',
          padding: '14px 32px', fontWeight: 700, fontSize: '1rem',
          textDecoration: 'none'
        }}>
          Explore Programs While You Wait →
        </Link>
      </main>

      <Footer />
    </div>
  );
}
