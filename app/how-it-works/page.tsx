import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'How It Works',
  description:
    'Your path from application through certification and job placement. Eleven clear steps — each designed to set you up for success.',
  path: '/how-it-works',
});

const PHASES = [
  {
    id: 1,
    label: 'Phase 1 — Get Started',
    title: 'Get Started',
    steps: [
      { num: 1, title: 'Apply', desc: 'Fill out a short online form — no test, no gatekeeping. We use it to understand your goals so we can help you. We reach out within 48 hours.', why: 'So we can personalize your path instead of sending you into a generic funnel.' },
      { num: 2, title: 'Overview', desc: 'Meet with a counselor to review programs, timelines, and what to expect. This is a conversation, not an exam — we want you to feel confident before you commit.', why: 'You deserve to know exactly what you are signing up for.' },
      { num: 3, title: 'Interview', desc: 'A 30-minute one-on-one to answer your questions and confirm fit. We are making sure this is right for you — and that you are ready for it.', why: 'Mutual fit matters. We succeed when you succeed.' },
    ],
  },
  {
    id: 2,
    label: 'Phase 2 — Build Your Future',
    title: 'Build Your Future',
    steps: [
      { num: 4, title: 'Membership', desc: 'Join at no cost. All accepted members get free access to resources, support, and training. No hidden fees, ever.', why: 'We remove money as a barrier so you can focus on learning.' },
      { num: 5, title: 'Assessment', desc: 'Skills and goals evaluation so we can match you with the right career path. Not a pass/fail test — a way to personalize your journey.', why: 'The right program for you is the one that fits your situation and goals.' },
      { num: 6, title: 'Workforce readiness', desc: 'Soft skills, job search basics, and workplace expectations — the foundation employers actually require. Often the part that gets people hired.', why: 'Credentials open doors; readiness gets you through them.' },
      { num: 7, title: 'Resources', desc: 'Loaner laptop program, resume support, community network, and on-demand tools. We back you up so you can focus on training.', why: 'You should not have to figure it all out alone.' },
    ],
  },
  {
    id: 3,
    label: 'Phase 3 — Launch Your Career',
    title: 'Launch Your Career',
    steps: [
      { num: 8, title: 'Training', desc: 'Industry certification courses — taught by certified instructors or approved online platforms. The same credentials employers hire against.', why: 'Real credentials, not certificates of attendance.' },
      { num: 9, title: 'Certify', desc: 'Earn credentials recognized by employers — CompTIA, AWS, Google, Microsoft, and more. You walk away with proof employers trust.', why: 'Your resume needs more than “I took a class.”' },
      { num: 10, title: 'Job placement assistance', desc: 'Resume review, interview prep, employer connections, and job search support until you land. We do not disappear after you graduate.', why: 'We are invested in your first hire, not just your last exam.' },
      { num: 11, title: 'Better life', desc: 'A career that pays. Graduates average $42K+ starting in their new field — many see significant growth within 2–3 years.', why: 'This is the outcome we are both working toward.' },
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="How members move from interest to employment"
        subtitle="This route is for prospective members and the people guiding them. It explains what WorkforceAP offers at each step and what to do next if you are ready to begin."
      >
        <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
          <Link href="/apply" className="btn btn-primary">Apply</Link>
          <Link href="/programs" className="btn btn-outline">Explore programs</Link>
          <Link href="/contact" className="btn btn-outline">Contact WorkforceAP</Link>
        </div>
      </PageHero>

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1400&q=80"
        label="3 Phases · 11 Steps"
        title="A clearer member journey"
        description="Every step has one job: help members understand fit, complete training, earn credentials, and move toward hiring outcomes without confusing detours."
      />

      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="mission-vision-grid">
            <div className="mv-card animate-on-scroll">
              <h2>Who this is for</h2>
              <p>Prospective members, families, and referral partners who want to understand the exact path from application to job placement.</p>
            </div>
            <div className="mv-card animate-on-scroll">
              <h2>What WorkforceAP offers</h2>
              <p>A guided, no-cost pathway for qualifying participants that combines advising, training, certifications, readiness, and placement support.</p>
            </div>
          </div>
        </div>
      </section>

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
                      {'why' in step && step.why && (
                        <p className="phase-step-why">Why we do this: {step.why}</p>
                      )}
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
            <h2 className="how-it-works-cta-title">What to do next</h2>
            <p style={{ marginBottom: '1.5rem' }}>If this journey fits your goals, apply. If you still need to compare options, explore programs first.</p>
            <div className="hero-actions" style={{ justifyContent: 'center' }}>
              <Link href="/apply" className="btn btn-primary btn-large">
                Apply
              </Link>
              <Link href="/programs" className="btn btn-outline btn-large">
                Explore programs
              </Link>
            </div>
          </div>
        </section>
      </section>

      <Footer />
    </div>
  );
}
