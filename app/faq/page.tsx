import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';
import FAQContent from './FAQContent';

export const metadata: Metadata = buildPageMetadata({
  title: 'FAQ: Free Career Training in Austin, TX',
  description:
    'Answers about admissions, eligibility, certifications, and job placement. For applicants, parents, partners, and anyone with questions.',
  path: '/faq',
});

export default function FAQPage() {
  return (
    <StitchPage>
      <StitchHero
        badge="Common Questions"
        title={
          <>
            Frequently asked
            <br />
            <span className="stitch-title-highlight">without the old shell baggage</span>
          </>
        }
        description="FAQ now sits inside the same Stitch marketing system as the rest of the public site, so category tabs, accordions, quick links, and CTA treatments feel intentional."
      />

      <section className="stitch-section">
        <div className="stitch-surface">
          <FAQContent />
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
