import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'What We Do',
  description:
    'Learn how WorkforceAP breaks systemic barriers for Austin-area residents through digital literacy, AI, occupational training, and wrap-around support in Austin, TX.',
  path: '/what-we-do',
});

export default function WhatWeDoPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="What We Do"
        subtitle="Breaking down systemic barriers through education, technology, and opportunity."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=80"
        label="Our Approach"
        title="Empowering Through Education"
        description="We deliver comprehensive workforce development programs that combine industry-recognized certifications with wrap-around support services to ensure every member succeeds."
      />

      <section className="content-section">
        <div className="container">
          <div className="mission-vision-grid">
            <div className="mv-card animate-on-scroll">
              <div className="mv-icon mission">&#x1F3AF;</div>
              <h2>Mission</h2>
              <p>The Workforce Advancement Project exists to break down systemic barriers by providing digital literacy, artificial intelligence, occupational, and professional certification training to underserved individuals, adult learners, and veteran populations.</p>
            </div>
            <div className="mv-card animate-on-scroll">
              <div className="mv-icon vision">&#x1F30D;</div>
              <h2>Vision</h2>
              <p>We are working to create a world where every individual and family — regardless of background, income, opportunity, or circumstance — has access to the skills, opportunity, and support necessary to thrive in the workforce today and lead the workforce of tomorrow.</p>
            </div>
          </div>

          <div className="legacy-section animate-on-scroll">
            <h2>Our Leadership &amp; Legacy</h2>
            <p className="legacy-subtitle">Built on a foundation of over 25 years of experience in developing, managing, and training for successful workforce initiatives.</p>
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

          <h2 className="section-title animate-on-scroll">Our Core Values</h2>
          <div className="values-grid">
            {[
              { icon: '⚔', name: 'Equity', desc: 'Ensuring fair access to opportunity, training, and economic mobility for all individuals.' },
              { icon: '🚀', name: 'Opportunity', desc: 'Opening pathways to meaningful, life-changing careers in high-demand industries.' },
              { icon: '💡', name: 'Innovation', desc: 'Preparing communities for the AI-powered future of work with cutting-edge training.' },
              { icon: '🤝', name: 'Partnership', desc: 'Leveraging collective strength across government, education, and industry sectors.' },
              { icon: '📈', name: 'Impact', desc: 'Delivering measurable outcomes that strengthen both individuals and local economies.' },
            ].map((v) => (
              <div key={v.name} className="value-card animate-on-scroll">
                <div className="value-icon">{v.icon}</div>
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
