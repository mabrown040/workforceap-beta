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

const steps = [
  { num: 1, title: 'Apply', desc: 'Quick online application', color: 'var(--color-accent)' },
  { num: 2, title: 'Overview', desc: 'Learn about our programs and mission', color: 'var(--color-gold)' },
  { num: 3, title: 'Interview', desc: 'One-on-one with a counselor', color: 'var(--color-green)' },
  { num: 4, title: 'Membership', desc: 'Join the WorkforceAP community', color: 'var(--color-blue)' },
  { num: 5, title: 'Assessment', desc: 'Skills and goals evaluation', color: 'var(--color-purple)' },
  { num: 6, title: 'Workforce Readiness', desc: 'Build foundational skills', color: 'var(--color-accent)' },
  { num: 7, title: 'Resources', desc: 'Connect with tools, network & support. We offer used loaner laptops to be earned at the successful completion of the Workforce Advancement Program with a complete certificate.', color: 'var(--color-gold)' },
  { num: 8, title: 'Training', desc: 'Industry certification courses', color: 'var(--color-green)' },
  { num: 9, title: 'Certify', desc: 'Earn credentials', color: 'var(--color-blue)' },
  { num: 10, title: 'Job Placement Assistance', desc: 'Career launch support & assessment', color: 'var(--color-purple)' },
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
        label="10-Step Process"
        title="From Application to Career"
        description="Our comprehensive process ensures you receive the support, training, and placement assistance needed to transform your career."
      />

      <section className="content-section">
        <div className="container">
          <div className="workforceap-process-flow">
            {steps.map((step) => (
              <div key={step.num} className="process-step animate-on-scroll">
                <div className="step-number" style={{ background: step.color }}>{step.num}</div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}

            <div className="process-final animate-on-scroll">
              <div className="step-number" style={{ background: 'var(--color-primary)', fontSize: '1.5rem' }}>🎉</div>
              <div className="step-content">
                <h3>Better Life &amp; Future</h3>
                <p>A rewarding career, financial stability, and endless possibilities.</p>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }} className="animate-on-scroll">
            <Link href="/apply" className="btn btn-primary btn-large">Start Your Journey Today</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
