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
          <h1>Start your application</h1>
          <p>Answer 3 quick questions, choose a program, then create your account so we can follow up with your next steps. No experience required.</p>
          <div className="hero-badges">
            {['Step 1: quick eligibility check', 'Step 2: choose a program', 'Step 3: create your account', 'We respond within 24–48 hours'].map((t) => (
              <span key={t} className="hero-badge-item">&#10003; {t}</span>
            ))}
          </div>
          <p className="apply-eligibility-note">
            <strong>Where we operate today:</strong> We&apos;re currently serving the Austin area. This is our launch community — we&apos;re building toward expansion. If you&apos;re elsewhere, apply anyway; we&apos;ll keep you in the loop.
          </p>
          <p className="hero-cta-note">
            Questions before you start? Call us: <a href="tel:5127771808">(512) 777-1808</a>
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="apply-info-banner" role="note">
            <strong>What to expect:</strong> this intake starts with a short eligibility check before account creation, so you can see your likely options first. After you create an account, a counselor reviews your selection and follows up within 24–48 hours.
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
