import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyPageSkeleton from '../ApplyPageSkeleton';
import ApplyResultsClient from './ApplyResultsClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Choose Your Programs',
  description: 'Review your likely fit, rank up to three programs, and continue to account creation.',
  path: '/apply/results',
});
}

export default function ApplyResultsPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Step 2 of 3 — choose your programs</h1>
          <p>Rank up to three programs in order of preference. You&rsquo;ll create your account on the next step so we can save your choices and follow up.</p>
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
