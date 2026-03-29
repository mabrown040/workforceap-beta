import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';

export const metadata: Metadata = {
  title: 'For Employers | WorkforceAP',
  description:
    'Hire certified, job-ready talent from Austin’s premier no-cost workforce training program. Zero placement fees. Pre-screened candidates.',
};

const valueProps = [
  {
    title: 'Pre-screened candidates',
    desc: 'Graduates come through assessment, counseling, and program completion before they ever reach your shortlist.',
  },
  {
    title: 'Zero placement fees',
    desc: 'This is a workforce pipeline, not a staffing markup business. Hiring support remains free to employers.',
  },
  {
    title: 'Credentialed hires',
    desc: 'Programs are built around employer-recognized certifications, not generic completion claims.',
  },
  {
    title: 'Faster path to readiness',
    desc: 'Tracks are structured to move motivated learners toward entry-level role readiness in months, not years.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Share your hiring need',
    desc: 'Tell us what roles are open, what level of readiness you need, and where your team needs support.',
  },
  {
    num: '02',
    title: 'Receive a curated match set',
    desc: 'We line active graduates up against your requirements and send candidates who can actually fit the role.',
  },
  {
    num: '03',
    title: 'Hire with support',
    desc: 'We stay close during the placement window to reduce friction for both the employer and the new hire.',
  },
];

const certBadges = ['Google Career Certificates', 'IBM SkillsBuild', 'AWS Certified', 'CompTIA', 'Microsoft', 'Coursera'];

export default function ForEmployersPage() {
  return (
    <StitchPage>
      <StitchHero
        badge="Employer Partnerships"
        title={
          <>
            Hire certified talent without
            <br />
            the <span className="stitch-title-highlight">legacy recruiter overhead</span>
          </>
        }
        description="WorkforceAP graduates are trained, credentialed, and supported through placement. Employer partnerships stay anchored around fit, speed, and zero placement fees."
        actions={
          <>
            <Link href="/contact?reason=employer" className="btn btn-primary">Partner with WorkforceAP</Link>
            <Link href="/jobs" className="btn btn-outline">Review the jobs board</Link>
          </>
        }
        meta={
          <div className="stitch-stat-grid">
            <div className="stitch-card stitch-stat-card"><strong>84%</strong><span>Placement rate</span></div>
            <div className="stitch-card stitch-stat-card"><strong>3,400+</strong><span>Graduates served</span></div>
            <div className="stitch-card stitch-stat-card"><strong>$0</strong><span>Cost to employers</span></div>
          </div>
        }
      />

      <section className="stitch-section">
        <div className="stitch-grid-2">
          {valueProps.map((value) => (
            <article key={value.title} className="stitch-card">
              <div className="stitch-kicker">Why it works</div>
              <h3 className="wa-text-2xl wa-font-bold wa-mt-3">{value.title}</h3>
              <p className="wa-mt-3">{value.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-grid-2">
          <article className="stitch-surface stitch-surface--strong">
            <div className="stitch-kicker">Recognized Signals</div>
            <h2 className="wa-text-4xl wa-font-bold wa-mt-3">Credentials your hiring team already understands</h2>
            <div className="stitch-pill-row wa-mt-6">
              {certBadges.map((cert) => (
                <span key={cert} className="stitch-pill">
                  {cert}
                </span>
              ))}
            </div>
          </article>
          <article className="stitch-surface">
            <div className="stitch-kicker">Workflow</div>
            <div className="stitch-panel-list wa-mt-4">
              {steps.map((step) => (
                <div key={step.num} className="wa-flex wa-gap-4 wa-items-start">
                  <div className="stitch-step-number">{step.num}</div>
                  <div>
                    <strong className="wa-block">{step.title}</strong>
                    <p className="wa-mt-2">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-cta-band">
          <div className="stitch-kicker">Ready to Build the Pipeline</div>
          <h2>Tell us what roles you need filled next</h2>
          <p>We’ll line your hiring demand up against active cohorts and send candidates who can step into the right level of work.</p>
          <div className="stitch-actions">
            <Link href="/contact?reason=employer" className="btn btn-primary">Start the conversation</Link>
            <Link href="/what-we-do" className="btn btn-outline">See the model</Link>
          </div>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
