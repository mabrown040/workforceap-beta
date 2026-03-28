import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import MainNav from '@/components/MainNav';
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
    <div className="wa-min-h-screen wa-bg-[#141313] wa-text-[#e6e1e1]">
      <MainNav />

      {/* Hero */}
      <section className="wa-pt-32 wa-pb-16 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-5xl wa-mx-auto wa-text-center">
          <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-6">
            <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
            <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ffb2bc]">Common Questions</span>
          </div>
          <h1 className="wa-text-5xl md:wa-text-6xl wa-font-extrabold wa-tracking-tight wa-leading-none wa-mb-4">
            Frequently Asked{' '}
            <span style={{ backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Questions
            </span>
          </h1>
          <p className="wa-text-xl wa-text-[#debfc2] wa-max-w-2xl wa-mx-auto">
            Answers that address your concerns — whether you&rsquo;re applying, supporting someone who is, or deciding if WorkforceAP is right for you.
          </p>
        </div>
      </section>

      <FAQContent />
      <Footer />
    </div>
  );
}
