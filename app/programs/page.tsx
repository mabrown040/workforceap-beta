import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import ProgramsContent from './ProgramsContent';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs in Austin, TX',
  description:
    'Explore 19 free career training programs in Austin, TX. CompTIA, Google Cybersecurity, AWS Cloud, IBM Data Science, medical coding, manufacturing — no-cost certifications for qualifying Austin-area residents.',
  path: '/programs',
});

export default function ProgramsPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Our Programs"
        subtitle="19 no-cost career programs for Austin-area residents. Industry certifications from Google, IBM, AWS, Microsoft, and CompTIA."
        cta={{ text: 'Not sure which program is right for you? Take our 2-minute quiz →', href: '/find-your-path' }}
      />
      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1400&q=80"
        label="19 Career Programs"
        title="Industry-Recognized Certifications"
        description="From IT Support, AI, Project Manager, Cybersecurity, Healthcare and Skilled Trades, our programs are designed with employers to ensure you graduate job-ready."
      />
      <ProgramsContent />
      <Footer />
    </div>
  );
}
