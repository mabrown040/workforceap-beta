import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import FAQContent from './FAQContent';

export const metadata: Metadata = buildPageMetadata({
  title: 'FAQ',
  description:
    'Find answers about admissions, eligibility, certifications, schedule, and job placement support.',
  path: '/faq',
});

export default function FAQPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Frequently Asked Questions"
        subtitle="Answers about our programs, admissions, job placement assistance, and more."
      />
      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&q=80"
        label="Quick Answers"
        title="Everything You Need to Know"
        description="Quick answers about applying, programs, and what happens after."
      />
      <FAQContent />
      <Footer />
    </div>
  );
}
