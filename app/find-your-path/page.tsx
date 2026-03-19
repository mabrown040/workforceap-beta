import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import FindYourPathClient from './FindYourPathClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find Your Path — Career Quiz',
  description:
    'Take our 2-minute quiz to discover which WorkforceAP program best fits your interests, experience, and goals. No-cost training for qualifying participants.',
  path: '/find-your-path',
});

export default function FindYourPathPage() {
  return (
    <div className="inner-page">
      <section className="page-hero find-your-path-hero">
        <div className="page-hero-content">
          <h1>Find Your Path</h1>
          <p>Answer 5 quick questions to discover which program fits you best.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <FindYourPathClient />
        </div>
      </section>

      <Footer />
    </div>
  );
}
