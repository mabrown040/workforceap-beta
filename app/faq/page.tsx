import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import FAQContent from './FAQContent';
import { makeServerT } from '@/lib/i18n/serverLabels';
import { getLocale } from '@/lib/i18n/serverLocale';

export const metadata: Metadata = buildPageMetadata({
  title: 'FAQ: WIOA-Aligned Career Training & Certifications',
  description:
    'Answers about applying, eligibility, certifications, and job placement. For applicants, parents, partners, and anyone with questions.',
  path: '/faq',
});

const faqHighlights = [
  {
    question: 'How much do WorkforceAP programs cost?',
    answer:
      'Programs are offered at no cost to qualifying members. WorkforceAP helps you understand the funding path, eligibility, and next step before you commit.',
    href: '/programs',
    cta: 'Browse programs',
  },
  {
    question: 'Do I need prior tech experience?',
    answer:
      'No. Many members start from zero. If computers still feel new, there are beginner-safe options designed to help you build confidence first.',
    href: '/find-your-path',
    cta: 'Find your path',
  },
  {
    question: 'What happens after I apply?',
    answer:
      'WorkforceAP reviews your goals, confirms fit, and follows up with next steps. That can include intake guidance, documentation review, or program-specific support.',
    href: '/apply',
    cta: 'Start application',
  },
  {
    question: 'How long do programs take?',
    answer:
      'Most programs take about 3–5 months at roughly 10 hours per week. Digital Literacy is shorter and works well as an on-ramp if you need a gentler start.',
    href: '/programs',
    cta: 'See program timelines',
  },
];

export default async function FAQPage() {
  const locale = await getLocale();
  const t = makeServerT(locale);
  return (
    <div className="inner-page">
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
                {t('Knowledge Base')}
              </span>
            </div>
            <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', maxWidth: '48rem', marginBottom: '1rem' }}>
              How can we help you <span style={{ background: 'linear-gradient(to bottom right, var(--color-accent-light), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>bridge the gap?</span>
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--color-on-surface-variant)', maxWidth: '42rem', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
              Answers that address your concerns, whether you&rsquo;re applying, supporting someone who is, or deciding if WorkforceAP is right for you.
            </p>
          </div>
        </div>
      </section>

      <section className="content-section" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '1rem',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.5rem' }}>
                {t('Quick answers')}
              </p>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-on-surface)' }}>
                Start with the questions people ask most.
              </h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
              }}
            >
              {faqHighlights.map((item) => (
                <div
                  key={item.question}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.875rem',
                    background: 'var(--surface-container-high)',
                    border: '1px solid var(--outline-variant)',
                  }}
                >
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--color-on-surface)' }}>{item.question}</h3>
                  <p style={{ margin: '0 0 0.75rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', fontSize: '0.92rem' }}>
                    {item.answer}
                  </p>
                  <Link href={item.href} style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' }}>
                    {item.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FAQContent />
      <Footer />
      <MobileBottomNav />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
