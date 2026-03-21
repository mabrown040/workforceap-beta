import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import FAQContent from './FAQContent';

export const metadata: Metadata = buildPageMetadata({
  title: 'FAQ',
  description:
    'Answers about admissions, eligibility, certifications, and job placement. For applicants, parents, partners, and anyone with questions.',
  path: '/faq',
});

export default function FAQPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Frequently Asked Questions"
        subtitle="Answers that address your concerns — whether you&rsquo;re applying, supporting someone who is, or deciding if WorkforceAP is right for you."
      />
      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&q=80"
        label="Quick Answers"
        title="Everything You Need to Know"
        description="Honest answers about how we work, what we expect, and what you can expect from us."
      />
      <FAQContent />
      <Footer />
    </div>
  );
}
