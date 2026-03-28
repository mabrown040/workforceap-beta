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
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Application Received</h1>
          <p>Your application has been received. Here is what happens next:</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="apply-confirmation">
            <div className="apply-confirmation-icon">&#10003;</div>

            <Suspense fallback={<p style={{ textAlign: 'center', color: 'var(--color-gray-600)' }}>Loading next steps...</p>}>
              <ApplyConfirmationCta />
            </Suspense>

            <div className="apply-confirmation-steps">
              <div className="apply-confirmation-step">
                <span className="apply-confirmation-step-num">1</span>
                <div>
                  <strong>Our team reviews your application</strong>
                  <p className="apply-confirmation-step-desc">
                    We review every application within 5 business days. A counselor will look at your goals and match you with the right program.
                  </p>
                </div>
              </div>

              <div className="apply-confirmation-step">
                <span className="apply-confirmation-step-num">2</span>
                <div>
                  <strong>You will receive an email with next steps</strong>
                  <p className="apply-confirmation-step-desc">
                    Check your inbox (and spam folder) for a message from our team with your enrollment details.
                  </p>
                </div>
              </div>

              <div className="apply-confirmation-step">
                <span className="apply-confirmation-step-num">3</span>
                <div>
                  <strong>If accepted, you will get access to your member portal</strong>
                  <p className="apply-confirmation-step-desc">
                    Your portal gives you access to no-cost training for members, AI career tools, and your counselor &mdash; all in one place.
                  </p>
                </div>
              </div>
            </div>

            <div className="apply-confirmation-info">
              <p style={{ margin: 0 }}>
                <strong>Questions?</strong> Call{' '}
                <a href="tel:+15127771808">(512) 777-1808</a>{' '}
                or email{' '}
                <a href="mailto:info@workforceap.org">info@workforceap.org</a>
              </p>
            </div>

            <div className="apply-confirmation-note">
              <p style={{ margin: 0 }}>
                <strong>While you wait:</strong> Bookmark your portal login at{' '}
                <Link href="/login">workforceap.org/login</Link>
                . You can also{' '}
                <Link href="/apply/status">check your application status</Link>
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
  );
}
