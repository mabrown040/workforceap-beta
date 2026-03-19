import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import FindYourPathClient from './FindYourPathClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find Your Path — Career Quiz',
  description:
    'Take our 2-minute quiz to discover which of our 19 no-cost career programs best fits your interests, experience, and goals.',
  path: '/find-your-path',
});

export default function FindYourPathPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Find Your Path"
        subtitle="Answer 5 quick questions and we'll recommend the programs that fit you best."
      />

      <section className="content-section">
        <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <FindYourPathClient />
        </div>
      </section>

      <Footer />
    </div>
  );
}
