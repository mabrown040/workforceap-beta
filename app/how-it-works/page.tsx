import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'How It Works',
  description:
    'See the 11-step WorkforceAP process from application through certification, job placement assistance, and career outcomes.',
  path: '/how-it-works',
});

const PHASES = [
  {
    id: 1,
    label: 'Phase 1 — Get Started',
    title: 'Get Started',
    steps: [
      { num: 1, title: 'Apply', desc: 'Fill out a 5-minute online form. We will reach out within 48 hours.' },
      { num: 2, title: 'Overview', desc: 'Meet with a counselor to review programs, timelines, and what to expect.' },
      { num: 3, title: 'Interview', desc: 'A 30-minute one-on-one to confirm you are a fit and answer your questions.' },
    ],
  },
  {
    id: 2,
    label: 'Phase 2 — Build Your Future',
    title: 'Build Your Future',
    steps: [
      { num: 4, title: 'Membership', desc: 'Join at no cost. All accepted members receive free access to resources, support, and training.' },
      { num: 5, title: 'Assessment', desc: 'Skills and goals evaluation to match you with the right career path.' },
      { num: 6, title: 'Workforce Readiness', desc: 'Soft skills, job search basics, and workplace expectations - the foundation employers require.' },
      { num: 7, title: 'Resources', desc: 'Loaner laptop program, resume support, community network, and on-demand tools.' },
    ],
  },
  {
    id: 3,
    label: 'Phase 3 — Launch Your Career',
    title: 'Launch Your Career',
    steps: [
      { num: 8, title: 'Training', desc: 'Industry certification courses taught by certified instructors or approved online platforms.' },
      { num: 9, title: 'Certify', desc: 'Earn credentials recognized by employers - CompTIA, AWS, Google, Microsoft, and more.' },
      { num: 10, title: 'Job Placement Assistance', desc: 'Resume review, interview prep, employer connections, and job search support until you land.' },
      { num: 11, title: 'Better Life', desc: 'A career that pays. Graduates average $42K+ starting salary in their new field.' },
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="How It Works"
        subtitle="Your path from application through training and job placement assistance — eleven clear steps in three phases."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1400&q=80"
        label="3 Phases · 11 Steps"
        title="From Application to Career"
        description="Each phase builds on the last: orientation and fit, readiness and resources, then certification training and placement support."
      />

      <section className="how-it-works-phases">
        {PHASES.map((phase, idx) => (
          <div
            key={phase.id}
            className={`how-it-works-phase ${idx % 2 === 1 ? 'phase-alt' : ''}`}
          >
            <div className="phase-bg-number">{String(phase.id).padStart(2, '0')}</div>
            <div className="container">
              <p className="how-it-works-phase-label">{phase.label}</p>
              <h2 className="phase-title">{phase.title}</h2>
              <div className="phase-steps">
                {phase.steps.map((step) => (
                  <div key={step.num} className="phase-step-item">
                    <span className="phase-step-num">{step.num}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {idx < PHASES.length - 1 && <div className="phase-connector" aria-hidden="true" />}
          </div>
        ))}

        <section className="how-it-works-cta">
          <div className="container">
            <h2 className="how-it-works-cta-title">Ready to Start?</h2>
            <Link href="/apply" className="btn btn-primary btn-large">
              Apply Now
            </Link>
          </div>
        </section>
      </section>

      <Footer />
    </div>
  );
}
