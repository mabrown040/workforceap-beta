import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Workforce Development Training in Austin, TX',
  description:
    'How WorkforceAP works: employer-aligned training, no-cost to participants, job placement support. Operating model that scales beyond one market.',
  path: '/what-we-do',
});

export default function WhatWeDoPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="What We Do"
        subtitle="Employer-aligned training. No cost to participants. Job placement built in. A model that works — and scales."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=80"
        label="Our Approach"
        title="How Our Model Works"
        description="We train people for jobs employers are hiring for. Funding comes from grants and employer partnerships — not from participants. Success means graduates get hired. We're launching in Austin and building toward expansion."
      />

      <section className="content-section">
        <div className="container">
          <div className="mission-vision-grid">
            <div className="mv-card animate-on-scroll">
              <div className="mv-icon mission"><span className="material-symbols-outlined" style={{ fontSize: 32 }}>target</span></div>
              <h2>Mission</h2>
              <p>Break down systemic barriers by providing digital literacy, AI, occupational, and professional certification training to underserved individuals, adult learners, and veterans — at no cost.</p>
            </div>
            <div className="mv-card animate-on-scroll">
              <div className="mv-icon vision"><span className="material-symbols-outlined" style={{ fontSize: 32 }}>public</span></div>
              <h2>Why This Model Works</h2>
              <p>Employers fund talent pipelines. Grants fund access. We don&rsquo;t charge participants. Our success metric is your hire — when you land a job, we&rsquo;ve done our job. That alignment is why this scales beyond one local market.</p>
            </div>
          </div>

          <div className="legacy-section animate-on-scroll">
            <h2>Our Leadership &amp; Legacy</h2>
            <p className="legacy-subtitle">Built on 25+ years of workforce development — Goodwill, Austin Area Urban League, state and local initiatives. We know what works.</p>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-number gold">25+</div>
                <div className="stat-label">Years Experience</div>
                <p>Leading successful workforce development initiatives and career training programs.</p>
              </div>
              <div className="stat-card">
                <div className="stat-number gold">2,000+</div>
                <div className="stat-label">Clients Trained &amp; Career Enhanced</div>
                <p>Individuals empowered with the skills, certifications, and support to advance their careers.</p>
              </div>
              <div className="stat-card">
                <div className="stat-number gold">$700k</div>
                <div className="stat-label">Revenue Turnaround</div>
                <p>Revitalized Goodwill Career &amp; Technical Academy operations in a single year.</p>
              </div>
              <div className="stat-card">
                <div className="stat-number gold">$500k</div>
                <div className="stat-label">First-Year Revenue</div>
                <p>Established thriving workforce unit for Austin Area Urban League.</p>
              </div>
            </div>
          </div>

          <div className="wioa-callout animate-on-scroll" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', background: 'var(--surface-container-low)', borderLeft: '4px solid var(--color-accent)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              WorkforceAP programs align with <strong>WIOA (Workforce Innovation and Opportunity Act)</strong> eligibility criteria, including low-income individuals, dislocated workers, adult learners, and veterans seeking career advancement. Our employer-aligned training model is designed to serve the communities WIOA prioritizes.
            </p>
          </div>

          <h2 className="section-title animate-on-scroll">What We Stand For</h2>
          <div className="values-grid">
            {[
              { icon: 'target', name: 'Equity', desc: 'Fair access to opportunity — no one should pay for the training that gets them hired.' },
              { icon: 'public', name: 'Employer-Aligned', desc: 'We teach what employers hire for. Google, IBM, AWS, CompTIA — credentials that open doors.' },
              { icon: 'lightbulb', name: 'Outcomes Matter', desc: 'Our success is your hire. We measure what matters: jobs landed, careers launched.' },
              { icon: 'handshake', name: 'Partnership', desc: 'Government, employers, community orgs — we leverage collective strength so participants don\'t carry the load alone.' },
              { icon: 'trending_up', name: 'Scale Where It Works', desc: 'We launch where we can deliver, then expand. Austin first; more communities as we grow.' },
            ].map((v) => (
              <div key={v.name} className="value-card animate-on-scroll">
                <div className="value-icon"><span className="material-symbols-outlined" style={{ fontSize: 28 }}>{v.icon}</span></div>
                <h3>{v.name}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>

          <div className="cta-section animate-on-scroll">
            <h2>Ready to Jumpstart Your Career?</h2>
            <p>Join individuals who are transforming their careers through employer-aligned training and certifications.</p>
            <div className="cta-buttons">
              <Link href="/apply" className="btn btn-primary">Apply Now</Link>
              <Link href="/programs" className="btn btn-outline">Explore Programs</Link>
              <Link href="/leadership" className="btn btn-dark">Meet Our Team</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
