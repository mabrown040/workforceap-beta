import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import ProgramsContent from './ProgramsContent';

export const metadata: Metadata = {
  title: 'Our Programs',
};

export default function ProgramsPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Our Programs"
        subtitle="Explore 19 career programs across tech, healthcare, business, and skilled trades."
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
