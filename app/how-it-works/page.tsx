import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'How It Works',
  description:
    'See the 10-step WorkforceAP process from application through certification and job placement assistance.',
  path: '/how-it-works',
});

const PHASES = [
  {
    id: 1,
    title: 'Get Started',
    steps: [
      { num: 1, title: 'Apply', desc: 'Quick online application' },
      { num: 2, title: 'Overview', desc: 'Learn about our programs and mission' },
      { num: 3, title: 'Interview', desc: 'One-on-one with a counselor' },
    ],
  },
  {
    id: 2,
    title: 'Build Your Future',
    steps: [
      { num: 4, title: 'Membership', desc: 'Join the WorkforceAP community — free for all accepted members' },
      { num: 5, title: 'Assessment', desc: 'Skills and goals evaluation' },
      { num: 6, title: 'Workforce Readiness', desc: 'Build foundational skills' },
      { num: 7, title: 'Resources', desc: 'Tools, network, loaner laptop & support' },
    ],
  },
  {
    id: 3,
    title: 'Launch Your Career',
    steps: [
      { num: 8, title: 'Training', desc: 'Industry certification courses' },
      { num: 9, title: 'Certify', desc: 'Earn credentials' },
      { num: 10, title: 'Job Placement Assistance', desc: 'Career launch support' },
      { num: 11, title: 'Better Life & Future', desc: 'A rewarding career and endless possibilities' },
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="How It Works"
        subtitle="Your Journey to a New Career — From inquiry to job placement assistance, we're with you every step of the way."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1400&q=80"
        label="3 Phases"
        title="From Application to Career"
        description="Our comprehensive process ensures you receive the support, training, and placement assistance needed to transform your career."
      />

      <section className="how-it-works-phases">
        {PHASES.map((phase, idx) => (
          <div
            key={phase.id}
            className={`how-it-works-phase ${idx % 2 === 1 ? 'phase-alt' : ''}`}
          >
            <div className="phase-bg-number">{String(phase.id).padStart(2, '0')}</div>
            <div className="container">
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
        <div className="container" style={{ textAlign: 'center', paddingTop: '2rem', paddingBottom: '3rem' }}>
          <Link href="/apply" className="btn btn-primary btn-large">Start Your Journey Today</Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
