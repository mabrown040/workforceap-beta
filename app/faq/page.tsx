import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import FAQContent from './FAQContent';

export const metadata: Metadata = buildPageMetadata({
  title: 'FAQ: Free Career Training in Austin, TX',
  description:
    'Answers about admissions, eligibility, certifications, and job placement. For applicants, parents, partners, and anyone with questions.',
  path: '/faq',
});

export default function FAQPage() {
  return (
    <div
      className="inner-page"
      style={{ backgroundColor: '#141313', minHeight: '100vh', color: '#e6e1e1' }}
    >
      {/* Dark page hero */}
      <section
        style={{
          backgroundColor: '#141313',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '80px 24px 48px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ color: '#e6e1e1', fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>
          Frequently Asked Questions
        </h1>
        <p style={{ color: '#debfc2', maxWidth: '600px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.7 }}>
          Answers that address your concerns — whether you&rsquo;re applying, supporting someone who is, or deciding if WorkforceAP is right for you.
        </p>
      </section>

      <FAQContent />
      <Footer />
    </div>
  );
}
