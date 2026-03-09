import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import LeadershipContent from './LeadershipContent';

export const metadata: Metadata = {
  title: 'Board & Leadership',
  description: "Meet the board and leadership team driving WorkforceAP's mission to break systemic barriers through workforce training in Austin, TX.",
};

export default function LeadershipPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Board & Leadership"
        subtitle="The dedicated people driving WorkforceAP's mission to break systemic barriers and advance futures."
      />
      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1400&q=80"
        label="Our Team"
        title="Experienced Leaders, Proven Results"
        description="Our board brings together decades of experience in technology, workforce development, military leadership, and business operations."
      />
      <LeadershipContent />
      <Footer />
    </div>
  );
}
