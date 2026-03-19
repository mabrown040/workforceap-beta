import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import FindYourPathClient from './FindYourPathClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find Your Path',
  description:
    'Take our 2-minute quiz to discover which career program is right for you. Get personalized recommendations based on your interests, experience, and goals.',
  path: '/find-your-path',
});

export default function FindYourPathPage() {
  return (
    <div className="inner-page">
      <FindYourPathClient />
      <Footer />
    </div>
  );
}
