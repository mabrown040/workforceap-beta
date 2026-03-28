import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'What We Do | WorkforceAP',
  description:
    "Learn how WorkforceAP bridges Austin's opportunity gap with WIOA-funded, no-cost workforce training and job placement support.",
};

const cardStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '24px',
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
      'Prospective members complete a short intake so we can understand goals, current barriers, and career interests in Austin’s job market.',
  },
  {
    title: 'Training',
    description:
      'Participants enter structured workforce and technical training aligned to employer demand, with coaching and support through completion.',
  },
  {
    title: 'Certification',
    description:
      'Members prepare for and earn industry-recognized credentials from leading providers that validate real, job-relevant skills.',
  },
  {
    title: 'Placement',
    description:
      'Our team supports resume positioning, interview readiness, and direct employer connection to accelerate entry into quality roles.',
  },
];

export default function WhatWeDoPage() {
  return (
    <div style={{ backgroundColor: '#141313' }}>
      <main className="wa-py-24 wa-px-8 wa-max-w-7xl wa-mx-auto wa-space-y-20">
        <section className="wa-max-w-4xl wa-space-y-6">
          <p className="wa-text-sm wa-font-semibold wa-uppercase wa-tracking-wider" style={{ color: '#ad2c4d' }}>
            What We Do
          </p>
          <h1 className="wa-text-4xl md:wa-text-6xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
            Bridging Austin&apos;s Opportunity Gap
          </h1>
          <p className="wa-text-lg wa-leading-relaxed" style={{ color: '#debfc2' }}>
            WorkforceAP delivers no-cost career training because programs are publicly funded through workforce development pathways,
            including WIOA-aligned support. Members do not pay tuition — public investment covers access so opportunity is not limited by income.
          </p>
        </section>

        <section className="wa-grid md:wa-grid-cols-2 wa-gap-6">
          <div style={cardStyle} className="wa-space-y-4">
            <h2 className="wa-text-2xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
              Mission
            </h2>
            <p style={{ color: '#debfc2' }}>
              Expand economic mobility for Austin residents through rigorous training, recognized certifications, and direct pathways to employment.
            </p>
          </div>
          <div style={cardStyle} className="wa-space-y-4">
            <h2 className="wa-text-2xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
              Values
            </h2>
            <ul className="wa-space-y-2" style={{ color: '#debfc2' }}>
              <li>• Access without tuition barriers</li>
              <li>• Employer-aligned outcomes</li>
              <li>• Measurable impact and accountability</li>
              <li>• Community-first workforce development</li>
            </ul>
          </div>
        </section>

        <section className="wa-space-y-8">
          <h2 className="wa-text-3xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
            How Programs Work
          </h2>
          <div className="wa-grid md:wa-grid-cols-2 wa-gap-6">
            {processSteps.map((step, index) => (
              <article key={step.title} style={cardStyle} className="wa-space-y-3">
                <p className="wa-text-sm wa-font-semibold wa-uppercase wa-tracking-wide" style={{ color: '#ad2c4d' }}>
                  Step {index + 1}
                </p>
                <h3 className="wa-text-xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
                  {step.title}
                </h3>
                <p style={{ color: '#debfc2' }}>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wa-space-y-6">
          <h2 className="wa-text-3xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
            Training Partners
          </h2>
          <div className="wa-flex wa-flex-wrap wa-gap-3">
            {partners.map((partner) => (
              <span
                key={partner}
                className="wa-inline-flex wa-items-center wa-px-4 wa-py-2 wa-text-sm wa-font-medium"
                style={{
                  color: '#e6e1e1',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {partner}
              </span>
            ))}
          </div>
        </section>

        <section className="wa-space-y-6">
          <h2 className="wa-text-3xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
            Impact
          </h2>
          <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 lg:wa-grid-cols-4 wa-gap-6">
            {impactStats.map((stat) => (
              <article key={stat.label} style={cardStyle} className="wa-space-y-2">
                <p className="wa-text-3xl wa-font-semibold" style={{ color: '#ad2c4d' }}>
                  {stat.value}
                </p>
                <p style={{ color: '#debfc2' }}>{stat.label}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wa-space-y-4" style={cardStyle}>
          <h2 className="wa-text-3xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
            Our Funding
          </h2>
          <p style={{ color: '#debfc2' }}>
            WorkforceAP programs are supported by public workforce funding structures under the Workforce Innovation and Opportunity Act (WIOA),
            along with aligned community and employer partnerships. WIOA is a federal workforce development framework designed to help job seekers
            gain skills and connect to in-demand careers.
          </p>
          <p style={{ color: '#debfc2' }}>
            This is why eligible participants can train at no cost: tuition is funded so residents can focus on outcomes, not debt.
          </p>
          <Link
            href="/apply"
            className="wa-inline-flex wa-items-center wa-justify-center wa-px-6 wa-py-3 wa-font-medium"
            style={{ backgroundColor: '#ad2c4d', color: '#e6e1e1', borderRadius: '10px' }}
          >
            Apply Now
          </Link>
        </section>
      </main>
    </div>
  );
}
