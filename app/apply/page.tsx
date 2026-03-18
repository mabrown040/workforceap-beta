import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyEligibilityClient from './ApplyEligibilityClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Apply Now',
  description:
    'Start your Workforce Advancement Project application and begin your path to industry-recognized certifications and career placement support.',
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

          <ApplyEligibilityClient />
        </div>
      </section>

      <Footer />
    </div>
  );
}
