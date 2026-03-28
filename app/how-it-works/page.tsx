import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How It Works | WorkforceAP',
  description:
    'See the full 11-step WorkforceAP journey from application through certification, placement, and outcomes.',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '24px',
};

const steps = [
  {
    title: 'Apply',
    description:
      'Complete a short intake form with your goals and background. This helps our team understand where you are now and where you want to go.',
  },
  {
    title: 'Overview',
    description:
      'Attend a program overview session to understand timelines, expectations, and support services. You get a clear picture before committing to a path.',
  },
  {
    title: 'Membership',
    description:
      'Enroll as a WorkforceAP member and confirm program alignment. Membership gives you structured access to coaching, tools, and workforce pathways.',
  },
  {
    title: 'Assessment',
    description:
      'Complete readiness and skills assessments used for placement into the best-fit track. The goal is alignment, not gatekeeping.',
  },
  {
    title: 'Interview',
    description:
      'Meet with a workforce advisor for a deeper fit conversation. Together, you validate goals, barriers, and a realistic completion plan.',
  },
  {
    title: 'Workforce Readiness',
    description:
      'Build essential employability skills including communication, professionalism, and interview preparation. This phase strengthens job retention, not just job entry.',
  },
  {
    title: 'Resources',
    description:
      'Access support services and learning resources that help you stay on track. Workforce development is strongest when training is paired with practical support.',
  },
  {
    title: 'Training',
    description:
      'Begin technical training in your selected pathway. Coursework is aligned to real employer demand and competency-based milestones.',
  },
  {
    title: 'Certify',
    description:
      'Prepare for and complete industry-recognized certification exams. Credentials validate your skills with trusted employer-facing standards.',
  },
  {
    title: 'Placement',
    description:
      'Engage in guided placement support including resume strategy, interview matching, and employer introductions. The objective is quality placement, not just application volume.',
  },
  {
    title: 'Outcomes',
    description:
      'Transition into employment and continue with post-placement support where available. Outcomes are measured through wage lift, retention, and long-term mobility.',
  },
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
    q: 'What certifications can I prepare for?',
    a: 'Program pathways include certifications aligned with providers such as Google, IBM, AWS, and CompTIA, based on track availability.',
  },
  {
    q: 'Does WorkforceAP help with job placement?',
    a: 'Yes. Placement support includes employer connection, interview prep, and job search guidance focused on real hiring outcomes.',
  },
  {
    q: 'Who is WorkforceAP designed to serve?',
    a: 'The model is built to expand opportunity for Austin job seekers, including underserved communities and adult learners seeking career mobility.',
  },
];

export default function HowItWorksPage() {
  return (
    <div style={{ backgroundColor: '#141313' }}>
      <main className="wa-py-24 wa-px-8 wa-max-w-7xl wa-mx-auto wa-space-y-20">
        <section className="wa-max-w-4xl wa-space-y-6">
          <p className="wa-text-sm wa-font-semibold wa-uppercase wa-tracking-wider" style={{ color: '#ad2c4d' }}>
            How It Works
          </p>
          <h1 className="wa-text-4xl md:wa-text-6xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
            The 11-Step WorkforceAP Journey
          </h1>
          <p className="wa-text-lg wa-leading-relaxed" style={{ color: '#debfc2' }}>
            From first application to measurable career outcomes, each step is designed to build readiness, credentialed skills,
            and direct connection to employment.
          </p>
        </section>

        <section className="wa-space-y-8">
          <div className="wa-grid md:wa-grid-cols-2 wa-gap-6">
            {steps.map((step, index) => (
              <article key={step.title} style={cardStyle} className="wa-space-y-3">
                <p className="wa-text-sm wa-font-semibold wa-uppercase wa-tracking-wide" style={{ color: '#ad2c4d' }}>
                  Step {index + 1}
                </p>
                <h2 className="wa-text-2xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
                  {step.title}
                </h2>
                <p style={{ color: '#debfc2' }}>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wa-space-y-6">
          <h2 className="wa-text-3xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
            Frequently Asked Questions
          </h2>
          <div className="wa-grid wa-grid-cols-1 wa-gap-4">
            {faqs.map((item) => (
              <article key={item.q} style={cardStyle} className="wa-space-y-2">
                <h3 className="wa-text-xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
                  {item.q}
                </h3>
                <p style={{ color: '#debfc2' }}>{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={cardStyle} className="wa-space-y-4">
          <h2 className="wa-text-3xl wa-font-semibold" style={{ color: '#e6e1e1' }}>
            Ready to Begin?
          </h2>
          <p style={{ color: '#debfc2' }}>
            Start your application and take the first step toward a certified, job-ready career pathway.
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
