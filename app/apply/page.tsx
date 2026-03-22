import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyEligibilityClient from './ApplyEligibilityClient';
import ApplyPageSkeleton from './ApplyPageSkeleton';

export const metadata: Metadata = buildPageMetadata({
  title: 'Apply for Free Career Training',
  description:
    'Apply for no-cost career certification training. CompTIA, Google, IBM, AWS, and more. Currently serving the Austin area with plans to expand. We respond within 24–48 hours.',
  path: '/apply',
});

export default function ApplyPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Start Your Career Today</h1>
          <p>Apply for no-cost training — we&rsquo;ll help you find the right path. No experience required. We respond within 24–48 hours.</p>
          <div className="hero-badges">
            {['No experience required', 'Flexible learning options', 'We respond within 24–48 hours', 'Full job placement assistance'].map((t) => (
              <span key={t} className="hero-badge-item">&#10003; {t}</span>
            ))}
          </div>
          <p className="apply-eligibility-note">
            <strong>Where we operate today:</strong> We&rsquo;re currently serving the Austin area. This is our launch community — we&rsquo;re building toward expansion. If you&rsquo;re elsewhere, apply anyway; we&rsquo;ll keep you in the loop.
          </p>
          <p className="hero-cta-note">
            Questions? Call us: <a href="tel:5127771808">(512) 777-1808</a>
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="apply-info-banner" role="note">
            <strong>Enrollment:</strong> We review applications on a rolling basis and place members into the next
            appropriate cohort — not a one-time &quot;first class&quot; rush. Apply when you are ready; we respond within
            24–48 hours.
          </div>

          <Suspense fallback={<ApplyPageSkeleton />}>
            <ApplyEligibilityClient />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  );
}
