import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyConfirmationCta from '@/components/apply/ApplyConfirmationCta';

export const metadata = buildPageMetadata({
  title: 'Application Received',
  description: 'Your application has been submitted successfully.',
  path: '/apply/confirmation',
});

export default function ApplyConfirmationPage() {
  return (
    <div className="inner-page">
      <section className="page-hero" style={{ textAlign: 'center', paddingBottom: '2.5rem' }}>
        <div className="page-hero-content">
          {/* Animated checkmark ring */}
          <div
            style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #4a9b4f, #5cb863)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '2.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 0 0 8px rgba(74,155,79,0.12)',
            }}
            aria-hidden="true"
          >
            ✓
          </div>

          <h1 style={{ marginBottom: '0.5rem' }}>Application Received</h1>
          <p style={{ maxWidth: '48ch', margin: '0 auto' }}>
            Your application has been received. Here is what happens next:
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            <Suspense fallback={<div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-gray-600)' }}>Loading next steps...</div>}>
              <ApplyConfirmationCta />
            </Suspense>

            {/* Next steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                {
                  num: 1,
                  title: 'Our team reviews your application',
                  body: 'We review every application within 5 business days. A counselor will look at your goals and match you with the right program.',
                },
                {
                  num: 2,
                  title: 'You will receive an email with next steps',
                  body: 'Check your inbox (and spam folder) for a message from our team with your enrollment details.',
                },
                {
                  num: 3,
                  title: 'If accepted, you will get access to your member portal',
                  body: 'Your portal gives you access to no-cost training, AI career tools, and your counselor — all in one place.',
                },
              ].map(({ num, title, body }) => (
                <div key={num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      background: '#ad2c4d',
                      color: 'white',
                      borderRadius: '9999px',
                      width: '2rem',
                      height: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {num}
                  </span>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{title}</strong>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-gray-600)' }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Green callout — questions */}
            <div className="confirmation-callout-green" style={{ padding: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                <strong>Questions?</strong> Call{' '}
                <a href="tel:+15127771808" style={{ fontWeight: 600 }}>(512) 777-1808</a>{' '}
                or email{' '}
                <a href="mailto:info@workforceap.org" style={{ fontWeight: 600 }}>info@workforceap.org</a>
              </p>
            </div>

            {/* Gray callout — while you wait */}
            <div className="confirmation-callout-gray" style={{ padding: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                <strong>While you wait:</strong> Bookmark your portal login at{' '}
                <Link href="/login" style={{ fontWeight: 600 }}>workforceap.org/login</Link>.{' '}
                You can also{' '}
                <Link href="/apply/status" style={{ fontWeight: 600 }}>check your application status</Link>{' '}
                with the email you used — no password required.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link href="/" className="btn btn-primary">Return to home</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
