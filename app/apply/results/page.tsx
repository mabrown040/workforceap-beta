import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import ApplyResultsClient from './ApplyResultsClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Choose Your Program',
  description: 'Select the program you\'re most interested in.',
  path: '/apply/results',
});

export default function ApplyResultsPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Program Selection</h1>
          <p>Choose the program you&apos;re most interested in.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <Suspense fallback={<p>Loading...</p>}>
            <ApplyResultsClient />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  );
}
