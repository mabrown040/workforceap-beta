import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import FAQContent from './FAQContent';
import FAQMobileSection from './FAQMobileSection';

export const metadata: Metadata = buildPageMetadata({
  title: 'FAQ: Free WIOA-Aligned Career Training & Certifications',
  description:
    'Answers about admissions, eligibility, certifications, and job placement. For applicants, parents, partners, and anyone with questions.',
  path: '/faq',
});

export default function FAQPage() {
  return (
    <div className="inner-page">
      <FAQMobileSection />

      <div className="wa-hidden md:wa-block marketing-desktop">
        {/* Hero Section */}
        <section className="content-section" style={{ paddingBottom: 0 }}>
          <div className="container" style={{ maxWidth: 1200 }}>
            <div style={{ marginBottom: '4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span
                  className="text-label-upper"
                  style={{
                    color: 'var(--color-accent)',
                    background: 'rgba(173,44,77,0.1)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid rgba(173,44,77,0.2)',
                    fontSize: '0.65rem',
                  }}
                >
                  Knowledge Base
                </span>
              </div>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', maxWidth: '48rem', marginBottom: '1.5rem' }}>
                How can we help you <span style={{ background: 'linear-gradient(to bottom right, var(--color-accent-light), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>bridge the gap?</span>
              </h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', maxWidth: '42rem', lineHeight: 1.7, fontWeight: 300 }}>
                Answers that address your concerns &mdash; whether you&rsquo;re applying, supporting someone who is, or deciding if WorkforceAP is right for you.
              </p>
            </div>
          </div>
        </section>

        <FAQContent />
        <Footer />
      </div>
    </div>
  );
}
