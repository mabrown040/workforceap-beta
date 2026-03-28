import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'For Employers | WorkforceAP',
  description:
    'Hire certified, job-ready talent from Austin\'s premier no-cost workforce training program. Zero placement fees. Pre-screened candidates. Google, IBM, AWS, and CompTIA certified.',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '24px',
};

const accentBorderStyle = {
  ...cardStyle,
  borderLeft: '3px solid #ad2c4d',
};

const valueProps = [
  {
    icon: '🎯',
    title: 'Pre-screened candidates',
    desc: 'Every graduate has completed a rigorous application, assessment, and interview process. We send you qualified, motivated talent — not a stack of resumes.',
  },
  {
    icon: '💰',
    title: 'Zero cost to hire',
    desc: 'No placement fees. No recruiter markup. WorkforceAP is publicly funded through the WIOA Workforce Development Act — so our talent pipeline is genuinely free.',
  },
  {
    icon: '🏅',
    title: 'Industry-certified graduates',
    desc: 'Graduates earn certifications from Google, IBM, AWS, CompTIA, and more before they reach you. They\'re credentialed, not just trained.',
  },
  {
    icon: '⚡',
    title: 'Job-ready in 6–12 months',
    desc: 'Our cohort-based programs move fast. Members go from application to employment-ready in 6 to 12 months depending on the track.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Register as a partner employer',
    desc: 'Tell us about your open roles, team culture, and what you\'re looking for in a candidate. Takes about 10 minutes.',
  },
  {
    num: '02',
    title: 'We match you with graduates',
    desc: 'Our placement team reviews your needs against active graduates and cohort completions. We send you a curated shortlist — typically within a week.',
  },
  {
    num: '03',
    title: 'Hire with confidence',
    desc: 'Interview, select, and onboard. We stay engaged post-placement to support both you and the new hire during the transition.',
  },
];

const certBadges = ['Google Career Certificates', 'IBM SkillsBuild', 'AWS Certified', 'CompTIA A+', 'CompTIA Security+', 'CompTIA Network+', 'Microsoft', 'Coursera'];

export default function ForEmployersPage() {
  return (
    <div style={{ backgroundColor: '#141313', minHeight: '100vh', color: '#e6e1e1' }}>
      <main className="wa-pt-32 wa-pb-24 wa-px-6 md:wa-px-12 wa-mx-auto" style={{ maxWidth: '80rem' }}>

        {/* Hero */}
        <section className="wa-py-16 wa-mb-16">
          <div className="wa-mb-4">
            <span
              className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest"
              style={{ color: '#ad2c4d', letterSpacing: '0.12em' }}
            >
              Partner With WorkforceAP
            </span>
          </div>
          <h1
            className="wa-text-5xl md:wa-text-7xl wa-font-extrabold wa-mb-6"
            style={{ color: '#e6e1e1', lineHeight: 1.05, letterSpacing: '-0.03em' }}
          >
            Hire Certified,<br />
            <span style={{ backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Job-Ready Talent
            </span>
            <br />— Free.
          </h1>
          <p className="wa-text-xl wa-max-w-2xl wa-mb-10" style={{ color: '#debfc2', lineHeight: 1.7 }}>
            WorkforceAP graduates are credentialed, assessed, and career-ready. Our placement services come at zero cost to employers — funded by the federal WIOA Workforce Development Act.
          </p>
          <div className="wa-flex wa-flex-wrap wa-gap-4">
            <Link
              href="/contact?reason=employer"
              className="wa-inline-block wa-font-bold wa-text-base wa-px-8 wa-py-4"
              style={{ background: '#ad2c4d', color: '#fff', borderRadius: '8px', textDecoration: 'none' }}
            >
              Partner With Us
            </Link>
            <Link
              href="/jobs"
              className="wa-inline-block wa-font-semibold wa-text-base wa-px-8 wa-py-4"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#e6e1e1', borderRadius: '8px', textDecoration: 'none' }}
            >
              Post a Job Opening
            </Link>
          </div>
        </section>

        {/* Value props */}
        <section className="wa-mb-20">
          <h2 className="wa-text-3xl wa-font-bold wa-mb-10" style={{ color: '#e6e1e1' }}>
            Why partner with WorkforceAP?
          </h2>
          <div className="wa-grid md:wa-grid-cols-2 wa-gap-6">
            {valueProps.map((v) => (
              <div key={v.title} style={accentBorderStyle}>
                <div className="wa-text-3xl wa-mb-4">{v.icon}</div>
                <h3 className="wa-text-xl wa-font-bold wa-mb-2" style={{ color: '#e6e1e1' }}>{v.title}</h3>
                <p style={{ color: '#debfc2', lineHeight: 1.65 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Certifications */}
        <section className="wa-mb-20" style={{ ...cardStyle, padding: '40px' }}>
          <h2 className="wa-text-2xl wa-font-bold wa-mb-6" style={{ color: '#e6e1e1' }}>
            Certifications your new hires will have
          </h2>
          <div className="wa-flex wa-flex-wrap wa-gap-3">
            {certBadges.map((cert) => (
              <span
                key={cert}
                className="wa-text-sm wa-font-semibold wa-px-4 wa-py-2"
                style={{
                  background: 'rgba(173,44,77,0.12)',
                  border: '1px solid rgba(173,44,77,0.3)',
                  borderRadius: '6px',
                  color: '#ffb2bc',
                }}
              >
                {cert}
              </span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="wa-mb-20">
          <h2 className="wa-text-3xl wa-font-bold wa-mb-10" style={{ color: '#e6e1e1' }}>
            How it works for employers
          </h2>
          <div className="wa-grid md:wa-grid-cols-3 wa-gap-6">
            {steps.map((s) => (
              <div key={s.num} style={cardStyle}>
                <div
                  className="wa-text-4xl wa-font-black wa-mb-4"
                  style={{ color: '#ad2c4d', fontVariantNumeric: 'tabular-nums' }}
                >
                  {s.num}
                </div>
                <h3 className="wa-text-lg wa-font-bold wa-mb-2" style={{ color: '#e6e1e1' }}>{s.title}</h3>
                <p className="wa-text-sm" style={{ color: '#debfc2', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="wa-mb-20">
          <div className="wa-grid wa-grid-cols-2 md:wa-grid-cols-4 wa-gap-6">
            {[
              { value: '84%', label: 'Placement rate' },
              { value: '3,400+', label: 'Graduates trained' },
              { value: '$0', label: 'Cost to employers' },
              { value: '6–12mo', label: 'Average time to hire-ready' },
            ].map((stat) => (
              <div key={stat.label} style={{ ...cardStyle, textAlign: 'center' }}>
                <div className="wa-text-4xl wa-font-black wa-mb-1" style={{ color: '#ad2c4d' }}>{stat.value}</div>
                <div className="wa-text-sm wa-font-medium" style={{ color: '#debfc2' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className="wa-rounded-2xl wa-py-16 wa-px-10 wa-text-center"
          style={{ background: 'rgba(173,44,77,0.1)', border: '1px solid rgba(173,44,77,0.25)' }}
        >
          <h2 className="wa-text-3xl wa-font-bold wa-mb-4" style={{ color: '#e6e1e1' }}>
            Ready to build your pipeline?
          </h2>
          <p className="wa-text-lg wa-mb-8 wa-mx-auto wa-max-w-xl" style={{ color: '#debfc2' }}>
            Tell us about your hiring needs and we'll match you with our next graduating cohort.
          </p>
          <Link
            href="/contact?reason=employer"
            className="wa-inline-block wa-font-bold wa-text-lg wa-px-10 wa-py-4"
            style={{ background: '#ad2c4d', color: '#fff', borderRadius: '8px', textDecoration: 'none' }}
          >
            Get in Touch
          </Link>
        </section>
      </main>
    </div>
  );
}
