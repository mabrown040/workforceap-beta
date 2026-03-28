import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import MainNav from '@/components/MainNav';
import Footer from '@/components/Footer';
import FindYourPathClient from './FindYourPathClient';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find Your Path — Career Quiz',
  description:
    'Take our 2-minute quiz to discover which WorkforceAP program best fits your interests, experience, and goals. Free for members.',
  path: '/find-your-path',
});

export default function FindYourPathPage() {
  return (
    <div className="wa-min-h-screen wa-bg-[#141313] wa-text-[#e6e1e1]">
      <MainNav />

      {/* Hero */}
      <section className="wa-pt-32 wa-pb-16 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-5xl wa-mx-auto wa-text-center">
          <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-6">
            <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
            <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ffb2bc]">Career Quiz</span>
          </div>
          <h1 className="wa-text-5xl md:wa-text-6xl wa-font-extrabold wa-tracking-tight wa-leading-none wa-mb-4">
            Find Your{' '}
            <span style={{ backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Path
            </span>
          </h1>
          <p className="wa-text-xl wa-text-[#debfc2] wa-max-w-2xl wa-mx-auto">
            Five questions, three ranked matches, plain-English why — tied to the same salary bands and program pages you will see elsewhere. Austin is where we are proving this first.
          </p>
        </div>
      </section>

      <section className="wa-pb-24 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-3xl wa-mx-auto">
          <div className="wa-mb-6 wa-text-center">
            <ExperimentedCtaLink
              experiment="find_path_apply_cta"
              variants={[
                { id: 'control', label: 'Ready now? Start your application', className: 'btn btn-primary', href: '/apply' },
                { id: 'urgency', label: 'Apply now (10 minutes)', className: 'btn btn-primary', href: '/apply' },
              ]}
            />
          </div>

          {/* Dark-themed quiz wrapper */}
          <style>{`
            .find-your-path-dark .quiz-progress-bar {
              background: rgba(255,255,255,0.06);
              border-radius: 8px;
              overflow: hidden;
              margin-bottom: 1.5rem;
            }
            .find-your-path-dark .quiz-progress-fill {
              background: #ad2c4d;
              height: 6px;
              border-radius: 8px;
              transition: width 0.3s ease;
            }
            .find-your-path-dark .quiz-progress-label {
              color: #a68a8d;
              font-size: 0.8rem;
              margin-top: 6px;
              text-align: right;
            }
            .find-your-path-dark .quiz-step-content {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 12px;
              padding: 32px;
            }
            .find-your-path-dark .quiz-question {
              color: #e6e1e1;
              font-size: 1.4rem;
              font-weight: 700;
              margin-bottom: 1.25rem;
            }
            .find-your-path-dark .quiz-answer-card {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 10px;
              color: #e6e1e1;
              padding: 14px 18px;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 12px;
              cursor: pointer;
              transition: border-color 0.15s, background 0.15s;
            }
            .find-your-path-dark .quiz-answer-card:hover {
              border-color: rgba(173,44,77,0.5);
              background: rgba(173,44,77,0.06);
            }
            .find-your-path-dark .quiz-answer-card.selected {
              border: 2px solid #ad2c4d;
              background: rgba(173,44,77,0.08);
            }
            .find-your-path-dark .quiz-answer-card input[type="radio"] {
              display: none;
            }
            .find-your-path-dark .radio-dot {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              border: 2px solid rgba(255,255,255,0.2);
              flex-shrink: 0;
              transition: border-color 0.15s, background 0.15s;
            }
            .find-your-path-dark .quiz-answer-card.selected .radio-dot {
              background: #ad2c4d;
              border-color: #ad2c4d;
            }
            .find-your-path-dark .quiz-back-link {
              background: none;
              border: none;
              color: #a68a8d;
              cursor: pointer;
              padding: 0;
              margin-bottom: 1rem;
              font-size: 0.9rem;
            }
            .find-your-path-dark .quiz-back-link:hover { color: #e6e1e1; }
            .find-your-path-dark .quiz-results {
              color: #e6e1e1;
            }
            .find-your-path-dark .quiz-results-title {
              color: #e6e1e1;
              font-size: 1.75rem;
              font-weight: 700;
              margin-bottom: 0.5rem;
            }
            .find-your-path-dark .quiz-results-subtitle {
              color: #debfc2;
              margin-bottom: 2rem;
            }
            .find-your-path-dark .quiz-result-card {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 12px;
              padding: 24px;
              color: #e6e1e1;
            }
            .find-your-path-dark .quiz-result-rank {
              color: #a68a8d;
              font-size: 0.8rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              display: block;
              margin-bottom: 0.75rem;
            }
            .find-your-path-dark .quiz-result-reasoning {
              color: #debfc2;
              font-size: 0.9rem;
              margin-bottom: 0.75rem;
            }
            .find-your-path-dark .quiz-result-ramp-note {
              color: #a68a8d;
              font-size: 0.85rem;
              font-style: italic;
              margin-bottom: 0.75rem;
            }
            .find-your-path-dark .quiz-result-roles {
              color: #debfc2;
              font-size: 0.85rem;
              margin-bottom: 0.75rem;
            }
            .find-your-path-dark .quiz-result-detail-link {
              display: block;
              color: #ad2c4d;
              font-size: 0.875rem;
              margin-top: 0.75rem;
              text-decoration: none;
            }
            .find-your-path-dark .quiz-results-cta {
              background: rgba(173,44,77,0.08);
              border: 1px solid rgba(173,44,77,0.2);
              border-radius: 12px;
              padding: 28px;
              margin-top: 2rem;
              text-align: center;
            }
            .find-your-path-dark .quiz-results-cta-lead {
              color: #e6e1e1;
              font-size: 1rem;
              margin-bottom: 0.5rem;
            }
            .find-your-path-dark .quiz-results-cta-sub {
              color: #debfc2;
              font-size: 0.9rem;
              margin-bottom: 1.25rem;
            }
            .find-your-path-dark .quiz-results-cta-phone {
              margin-top: 0.75rem;
            }
            .find-your-path-dark .quiz-results-cta-phone a {
              color: #ad2c4d;
              text-decoration: none;
              font-size: 0.9rem;
            }
            .find-your-path-dark .quiz-results-next-steps {
              margin-top: 1.5rem;
              color: #debfc2;
              font-size: 0.9rem;
            }
            .find-your-path-dark .quiz-results-next-links {
              display: flex;
              gap: 1.5rem;
              margin-top: 0.75rem;
            }
            .find-your-path-dark .quiz-results-next-links a {
              color: #ad2c4d;
              text-decoration: none;
              font-weight: 500;
            }
            .find-your-path-dark .quiz-results-footer {
              margin-top: 2rem;
              text-align: center;
              color: #debfc2;
            }
            .find-your-path-dark .quiz-results-note {
              text-align: center;
              color: #a68a8d;
              font-size: 0.85rem;
              margin-top: 1rem;
            }
          `}</style>

          <div className="find-your-path-dark">
            <FindYourPathClient />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
