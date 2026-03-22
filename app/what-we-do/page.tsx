import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import { Target, Globe, Lightbulb, Handshake, TrendingUp } from 'lucide-react';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'What We Do',
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
              <div className="mv-icon mission"><Target size={32} className="text-current" /></div>
              <h2>Mission</h2>
              <p>Break down systemic barriers by providing digital literacy, AI, occupational, and professional certification training to underserved individuals, adult learners, and veterans — at no cost.</p>
            </div>
            <div className="mv-card animate-on-scroll">
              <div className="mv-icon vision"><Globe size={32} className="text-current" /></div>
              <h2>Why This Model Works</h2>
              <p>Employers fund talent pipelines. Grants fund access. We don&rsquo;t charge participants. Our success metric is your hire — when you land a job, we&rsquo;ve done our job. That alignment is why this scales beyond one local market.</p>
            </div>
          </div>

          <h2 className="section-title animate-on-scroll">What we optimize for (participant outcomes first)</h2>
          <p className="what-we-do-outcomes-lead animate-on-scroll">
            Credentials and training matter because they change hiring conversations. We lead with completion, job readiness,
            and first hire — revenue milestones below are organizational context, not the scoreboard for a member.
          </p>

          <h2 className="section-title animate-on-scroll" style={{ marginTop: '2.5rem' }}>What We Stand For</h2>
          <div className="values-grid">
            {[
              { Icon: Target, name: 'Equity', desc: 'Fair access to opportunity — no one should pay for the training that gets them hired.' },
              { Icon: Globe, name: 'Employer-Aligned', desc: 'We teach what employers hire for. Google, IBM, AWS, CompTIA — credentials that open doors.' },
              { Icon: Lightbulb, name: 'Outcomes Matter', desc: 'Our success is your hire. We measure what matters: jobs landed, careers launched.' },
              { Icon: Handshake, name: 'Partnership', desc: 'Government, employers, community orgs — we leverage collective strength so participants don\'t carry the load alone.' },
              { Icon: TrendingUp, name: 'Scale Where It Works', desc: 'We launch where we can deliver, then expand. Austin first; more communities as we grow.' },
            ].map((v) => {
              const Icon = v.Icon;
              return (
              <div key={v.name} className="value-card animate-on-scroll">
                <div className="value-icon"><Icon size={28} className="text-current" /></div>
                <h3>{v.name}</h3>
                <p>{v.desc}</p>
              </div>
              );
            })}
          </div>

          <div className="legacy-section animate-on-scroll" style={{ marginTop: '3rem' }}>
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
