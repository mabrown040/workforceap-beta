import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import FAQContent from './FAQContent';

export const metadata: Metadata = {
  title: 'FAQ',
};

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
        description="Find answers to the most common questions about eligibility, programs, support, and job placement."
      />
      <FAQContent />
      <Footer />
    </div>
  );
}
