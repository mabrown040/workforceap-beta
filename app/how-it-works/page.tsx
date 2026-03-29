import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';

export const metadata: Metadata = {
  title: 'How It Works | WorkforceAP',
  description:
    'See the full WorkforceAP journey from application through certification, placement, and outcomes.',
};

const steps = [
  'Apply with your goals and current starting point.',
  'Review fit during overview, interview, and readiness steps.',
  'Train through structured workforce and technical content.',
  'Certify with employer-recognized credentials.',
  'Move into placement support and employer introductions.',
  'Track outcomes beyond enrollment.',
];

const faqs = [
  {
    q: 'Is WorkforceAP really free for participants?',
    a: 'Yes. WorkforceAP programs are supported through public workforce funding and aligned partnerships, which allows eligible participants to train at no tuition cost.',
  },
  {
    q: 'How long does the full journey usually take?',
    a: 'Most members complete their pathway in roughly 6–12 months, depending on schedule, certification track, and readiness needs.',
  },
  {
    q: 'Do I need prior tech experience to apply?',
    a: 'No. Many pathways are designed for beginners and career changers, with readiness support built into the process.',
  },
  {
    q: 'Does WorkforceAP help with job placement?',
    a: 'Yes. Placement support includes employer connection, interview prep, and job search guidance focused on real hiring outcomes.',
  },
];

export default function HowItWorksPage() {
  return (
    <StitchPage>
      <StitchHero
        badge="Member Journey"
        title={
          <>
            The WorkforceAP path from
            <br />
            first click to <span className="stitch-title-highlight">career momentum</span>
          </>
        }
        description="This page now matches the rest of the Stitch shell: stronger hero hierarchy, premium spacing, and a cleaner narrative arc around fit, training, certification, and placement."
        actions={
          <>
            <Link href="/apply" className="btn btn-primary">Start your application</Link>
            <Link href="/faq" className="btn btn-outline">Read the FAQ</Link>
          </>
        }
      />

      <section className="stitch-section">
        <div className="stitch-grid-2">
          {steps.map((step, index) => (
            <article key={step} className="stitch-card">
              <div className="stitch-step-number">{String(index + 1).padStart(2, '0')}</div>
              <p className="wa-mt-4 wa-text-lg">{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-grid-2">
          {faqs.map((item) => (
            <article key={item.q} className="stitch-card">
              <div className="stitch-kicker">FAQ</div>
              <h3 className="wa-text-2xl wa-font-bold wa-mt-3">{item.q}</h3>
              <p className="wa-mt-3">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-cta-band">
          <div className="stitch-kicker">Ready to Begin</div>
          <h2>Take the next step with the right level of support</h2>
          <p>Start the application, take the quiz, or compare programs. The marketing shell is now consistent; the decision surface is clearer.</p>
          <div className="stitch-actions">
            <Link href="/apply" className="btn btn-primary">Apply now</Link>
            <Link href="/find-your-path" className="btn btn-outline">Take the career quiz</Link>
          </div>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
