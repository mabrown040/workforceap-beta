import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyEligibilityClient from './ApplyEligibilityClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Apply for Free Career Training in Austin, TX',
  description:
    'Apply now for free career certification training in Austin, TX. No-cost CompTIA, Google, IBM, and AWS programs for qualifying Austin-area residents. We respond within 24-48 hours.',
  path: '/apply',
});

export default function ApplyPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Start Your Career Today</h1>
          <p>Find out if you qualify for no-cost career training. We&rsquo;ll follow up within 24–48 hours.</p>
          <div className="hero-badges">
            {['No experience required', 'Flexible learning options', 'We respond within 24–48 hours', 'Full job placement assistance'].map((t) => (
              <span key={t} className="hero-badge-item">&#10003; {t}</span>
            ))}
          </div>
          <p className="hero-cta-note">
            Questions? Call us: <a href="tel:5127771808">(512) 777-1808</a>
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="apply-alert">
            🔥 First Program Now Forming &mdash; Seats are limited. Apply today to hold your spot.
          </div>

          <Suspense fallback={<div className="apply-flow"><p>Loading...</p></div>}>
            <ApplyEligibilityClient />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  );
}
