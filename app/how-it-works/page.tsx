import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'How It Works',
};

const steps = [
  { num: 1, title: 'Inquire', desc: 'Reach out via phone, email, or apply online', color: 'var(--color-accent)' },
  { num: 2, title: 'Overview', desc: 'Learn about our programs and mission', color: 'var(--color-gold)' },
  { num: 3, title: 'Membership', desc: 'Join the WorkforceAP community', color: 'var(--color-green)' },
  { num: 4, title: 'Assessment', desc: 'Skills and goals evaluation', color: 'var(--color-blue)' },
  { num: 5, title: 'Interview', desc: 'One-on-one with a counselor', color: 'var(--color-purple)' },
  { num: 6, title: 'Resources', desc: 'Connect with tools and network', color: 'var(--color-accent)' },
  { num: 7, title: 'Readiness', desc: 'Build foundational skills', color: 'var(--color-gold)' },
  { num: 8, title: 'Direction', desc: 'Personalized career path', color: 'var(--color-green)' },
  { num: 9, title: 'Resume', desc: 'Professional resume creation', color: 'var(--color-blue)' },
  { num: 10, title: 'Training', desc: 'Industry certification courses', color: 'var(--color-purple)' },
  { num: 11, title: 'Certificate', desc: 'Earn credentials', color: 'var(--color-accent)' },
  { num: 12, title: 'Enhancement', desc: 'Update with new skills', color: 'var(--color-gold)' },
  { num: 13, title: 'Placement', desc: 'Job placement assistance & assessment', color: 'var(--color-green)' },
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
        label="13-Step Process"
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
