import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';
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
    <StitchPage>
      <StitchHero
        badge="Career Quiz"
        title={
          <>
            Find your path with
            <br />
            <span className="stitch-title-highlight">the same Stitch shell</span>
          </>
        }
        description="The quiz route now matches the rest of the marketing site instead of feeling like a separate dark-mode experiment."
        actions={
          <ExperimentedCtaLink
            experiment="find_path_apply_cta"
            variants={[
              { id: 'control', label: 'Ready now? Start your application', className: 'btn btn-primary', href: '/apply' },
              { id: 'urgency', label: 'Apply now (10 minutes)', className: 'btn btn-primary', href: '/apply' },
            ]}
          />
        }
      />

      <section className="stitch-section">
        <div className="stitch-surface">
          <style>{`
            .find-your-path-dark .quiz-progress-bar {
              background: rgba(255,255,255,0.06);
              border-radius: 999px;
              overflow: hidden;
              margin-bottom: 1.5rem;
            }
            .find-your-path-dark .quiz-progress-fill {
              background: linear-gradient(135deg, #ad2c4d, #ffb2bc);
              height: 8px;
              border-radius: 999px;
              transition: width 0.3s ease;
            }
            .find-your-path-dark .quiz-progress-label,
            .find-your-path-dark .quiz-results-note {
              color: rgba(248,225,229,0.62);
              font-size: 0.8rem;
            }
            .find-your-path-dark .quiz-step-content,
            .find-your-path-dark .quiz-result-card,
            .find-your-path-dark .quiz-results-cta,
            .find-your-path-dark .quiz-answer-card {
              background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.03));
              border: 1px solid rgba(255,178,188,0.12);
              border-radius: 24px;
              color: #fff7f8;
              backdrop-filter: blur(18px);
              -webkit-backdrop-filter: blur(18px);
            }
            .find-your-path-dark .quiz-step-content { padding: 32px; }
            .find-your-path-dark .quiz-question,
            .find-your-path-dark .quiz-results-title {
              color: #fff7f8;
            }
            .find-your-path-dark .quiz-results-subtitle,
            .find-your-path-dark .quiz-result-reasoning,
            .find-your-path-dark .quiz-result-ramp-note,
            .find-your-path-dark .quiz-result-roles,
            .find-your-path-dark .quiz-results-cta-sub,
            .find-your-path-dark .quiz-results-next-steps {
              color: rgba(248,225,229,0.76);
            }
            .find-your-path-dark .quiz-answer-card:hover,
            .find-your-path-dark .quiz-answer-card.selected {
              border-color: rgba(255,178,188,0.24);
              background: rgba(173,44,77,0.12);
            }
            .find-your-path-dark .quiz-answer-card input[type="radio"] {
              display: none;
            }
            .find-your-path-dark .radio-dot {
              width: 16px;
              height: 16px;
              border-radius: 999px;
              border: 2px solid rgba(255,255,255,0.2);
              flex-shrink: 0;
            }
            .find-your-path-dark .quiz-answer-card.selected .radio-dot {
              border-color: #ffb2bc;
              background: linear-gradient(135deg, #ad2c4d, #ffb2bc);
            }
            .find-your-path-dark .quiz-back-link,
            .find-your-path-dark .quiz-result-detail-link,
            .find-your-path-dark .quiz-results-cta-phone a,
            .find-your-path-dark .quiz-results-next-links a {
              color: #ffb2bc;
              text-decoration: none;
            }
            .find-your-path-dark .quiz-results-next-links {
              display: flex;
              flex-wrap: wrap;
              gap: 1rem;
              margin-top: 0.75rem;
            }
          `}</style>
          <div className="find-your-path-dark">
            <FindYourPathClient />
          </div>
          <div className="stitch-actions wa-mt-6">
            <Link href="/program-comparison" className="btn btn-outline">Compare programs</Link>
            <Link href="/salary-guide" className="btn btn-outline">See salary ranges</Link>
          </div>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
