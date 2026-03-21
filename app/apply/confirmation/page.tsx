import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';

export const metadata = buildPageMetadata({
  title: 'Application Received',
  description: 'Your application has been submitted successfully.',
  path: '/apply/confirmation',
});

export default function ApplyConfirmationPage() {
  return (
    <div className="inner-page">
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ background: '#4a9b4f', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>1</span>
                <div>
                  <strong>Our team reviews your application</strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--color-gray-600)', fontSize: '0.95rem' }}>
                    We review every application within 5 business days. A counselor will look at your goals and match you with the right program.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ background: '#4a9b4f', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>2</span>
                <div>
                  <strong>You will receive an email with next steps</strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--color-gray-600)', fontSize: '0.95rem' }}>
                    Check your inbox (and spam folder) for a message from our team with your enrollment details.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ background: '#4a9b4f', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>3</span>
                <div>
                  <strong>If accepted, you will get access to your student portal</strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--color-gray-600)', fontSize: '0.95rem' }}>
                    Your portal gives you access to training, AI career tools, and your counselor &mdash; all in one place.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                <strong>Questions?</strong> Call{' '}
                <a href="tel:+15127771808" style={{ color: '#2563eb', fontWeight: 600 }}>(512) 777-1808</a>{' '}
                or email{' '}
                <a href="mailto:info@workforceap.org" style={{ color: '#2563eb', fontWeight: 600 }}>info@workforceap.org</a>
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                <strong>While you wait:</strong> Bookmark your portal login at{' '}
                <Link href="/login" style={{ color: '#2563eb', fontWeight: 600 }}>workforceap.org/login</Link>
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
  );
}
