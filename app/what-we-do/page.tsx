import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';

export const metadata: Metadata = {
  title: 'What We Do | WorkforceAP',
  description:
    "Learn how WorkforceAP bridges Austin's opportunity gap with WIOA-funded, no-cost workforce training and job placement support.",
};

const partners = ['Google', 'IBM', 'AWS', 'CompTIA', 'Coursera'];

const impactStats = [
  { label: 'Total salary lift', value: '$14.2M' },
  { label: 'Placement rate', value: '84%' },
  { label: 'People served', value: '3,400+' },
  { label: 'Tuition paid by members', value: '$0' },
];

const processSteps = [
  {
    title: 'Application',
    description:
      'A short intake lets us understand goals, barriers, and where a member should ramp in without treating beginners like a mismatch.',
  },
  {
    title: 'Training',
    description:
      'Structured training combines technical content, career readiness, and coaching so members stay on track through completion.',
  },
  {
    title: 'Certification',
    description:
      'Industry credentials are part of the point, not an add-on. Programs prepare learners to leave with signals employers already trust.',
  },
  {
    title: 'Placement',
    description:
      'Resume support, interview prep, and employer connection keep the model focused on measurable outcomes, not enrollment vanity.',
  },
];

export default function WhatWeDoPage() {
  return (
    <StitchPage>
      <StitchHero
        badge="Mission and Model"
        title={
          <>
            Bridging Austin&apos;s opportunity gap
            <br />
            with a <span className="stitch-title-highlight">training-to-workforce engine</span>
          </>
        }
        description="WorkforceAP uses publicly aligned workforce funding and employer partnerships to remove tuition barriers, deliver rigorous training, and stay accountable to actual placement outcomes."
        actions={
          <>
            <Link href="/apply" className="btn btn-primary">Apply Now</Link>
            <Link href="/how-it-works" className="btn btn-outline">See the process</Link>
          </>
        }
        meta={
          <div className="stitch-stat-grid">
            {impactStats.map((stat) => (
              <div key={stat.label} className="stitch-card stitch-stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        }
      />

      <section className="stitch-section">
        <div className="stitch-grid-2">
          <article className="stitch-card">
            <div className="stitch-kicker">Mission</div>
            <h2 className="wa-text-3xl wa-font-bold wa-mt-3">Economic mobility through credible career pathways</h2>
            <p className="wa-mt-4">
              The public site now reflects the same thesis throughout: access without debt, employer relevance, credentialed outcomes, and a clearer experience from the first page visit through application.
            </p>
          </article>
          <article className="stitch-card">
            <div className="stitch-kicker">Values</div>
            <div className="stitch-panel-list wa-mt-4">
              <div><strong>Access first</strong><p className="wa-mt-2">Training should not require tuition risk or hidden financing gimmicks.</p></div>
              <div><strong>Employer aligned</strong><p className="wa-mt-2">Programs stay legible to hiring teams, not just to internal stakeholders.</p></div>
              <div><strong>Outcome accountable</strong><p className="wa-mt-2">The goal is wage lift and placement, not content volume or badge collecting.</p></div>
            </div>
          </article>
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-section-heading">
          <div className="stitch-kicker">Program Flow</div>
          <h2>How the model works in practice</h2>
        </div>
        <div className="stitch-grid-2">
          {processSteps.map((step, index) => (
            <article key={step.title} className="stitch-card">
              <div className="stitch-step-number">{String(index + 1).padStart(2, '0')}</div>
              <h3 className="wa-text-2xl wa-font-bold wa-mt-4">{step.title}</h3>
              <p className="wa-mt-3">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-surface stitch-surface--strong">
          <div className="stitch-kicker">Partner Network</div>
          <h2 className="wa-text-4xl wa-font-bold wa-mt-3">The ecosystem behind the pathways</h2>
          <p className="wa-mt-4 stitch-muted">Our marketing shell now treats partner credibility as a first-class surface instead of a leftover section.</p>
          <div className="stitch-pill-row wa-mt-6">
            {partners.map((partner) => (
              <span key={partner} className="stitch-pill">
                {partner}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-cta-band">
          <div className="stitch-kicker">Funding Story</div>
          <h2>No tuition for members. No ambiguity in the pitch.</h2>
          <p>
            WorkforceAP programs are supported by public workforce development structures, community backing, and employer-aligned partnerships so participants can focus on outcomes instead of financing.
          </p>
          <div className="stitch-actions">
            <Link href="/apply" className="btn btn-primary">Start an application</Link>
            <Link href="/for-employers" className="btn btn-outline">Explore employer partnerships</Link>
          </div>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
