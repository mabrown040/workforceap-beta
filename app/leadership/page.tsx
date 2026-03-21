import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import LeadershipContent from './LeadershipContent';

export const metadata: Metadata = buildPageMetadata({
  title: 'Board & Leadership',
  description:
    "Why WorkforceAP's leadership team makes us unusually credible: 25+ years Austin workforce experience, employer-side tech leaders, military discipline, and community roots.",
  path: '/leadership',
});

export default function LeadershipPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Board & Leadership"
        subtitle="Why this team makes WorkforceAP unusually credible and capable."
      />
      <LeadershipContent />
      <Footer />
    </div>
  );
}
