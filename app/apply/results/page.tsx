import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyPageSkeleton from '../ApplyPageSkeleton';
import ApplyResultsClient from './ApplyResultsClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Choose Your Program',
  description: 'Review your likely fit, choose the program you want to discuss, and continue to account creation.',
  path: '/apply/results',
});

export default function ApplyResultsPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Step 2 of 3 — choose your program</h1>
          <p>Pick the program you want to discuss first. You&rsquo;ll create your account on the next step so we can save it and follow up.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <Suspense fallback={<ApplyPageSkeleton />}>
            <ApplyResultsClient />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  );
}
