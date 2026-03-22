import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
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
        title="FAQ for members, employers, and partners"
        subtitle="This page answers the most common public questions about who WorkforceAP is for, what WorkforceAP offers, and what to do next if you are ready to move forward."
      >
        <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
          <Link href="/apply" className="btn btn-primary">Apply</Link>
          <Link href="/programs" className="btn btn-outline">Explore programs</Link>
          <Link href="/contact" className="btn btn-outline">Contact WorkforceAP</Link>
        </div>
      </PageHero>
      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&q=80"
        label="Quick Answers"
        title="Answers that support a decision"
        description="The goal of this page is to remove friction, not create more browsing. When the FAQ answers your question, the next step should be obvious."
      />
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="mission-vision-grid">
            <div className="mv-card animate-on-scroll">
              <h2>Who this is for</h2>
              <p>Applicants, families, employers, and referral partners who want quick answers before they take the next step.</p>
            </div>
            <div className="mv-card animate-on-scroll">
              <h2>What to do next</h2>
              <p>Use the FAQ to clarify details, then move into one of the primary paths: apply, explore programs, or contact WorkforceAP.</p>
            </div>
          </div>
        </div>
      </section>
      <FAQContent />
      <section className="content-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-section animate-on-scroll">
            <h2>Still need help?</h2>
            <p>If the FAQ does not answer your question, contact WorkforceAP and we will point you to the right path.</p>
            <div className="cta-buttons">
              <Link href="/apply" className="btn btn-primary">Apply</Link>
              <Link href="/programs" className="btn btn-outline">Explore programs</Link>
              <Link href="/contact" className="btn btn-dark">Contact WorkforceAP</Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
