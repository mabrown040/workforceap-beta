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
          <p>Thank you for applying. We&apos;ve received your information.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="apply-confirmation" style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
            <div className="apply-confirmation-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>What happens next</h2>
            <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
              We&apos;ll contact you within 2 business days to discuss your options and next steps.
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-gray-600)', marginBottom: '2rem' }}>
              In the meantime, feel free to explore our <Link href="/programs">programs</Link> or <Link href="/faq">FAQ</Link>.
            </p>
            <Link href="/" className="btn btn-primary">
              Return to home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
