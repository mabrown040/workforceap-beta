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

const AUDIENCE_SUMMARY = [
  {
    title: 'Members',
    body: 'WorkforceAP offers no-cost training, workforce readiness, certifications, and placement support for qualifying participants.',
  },
  {
    title: 'Employers',
    body: 'WorkforceAP offers a certified, pre-screened pipeline and a clearer path to hire talent aligned to open roles.',
  },
  {
    title: 'Partners',
    body: 'WorkforceAP offers a trusted referral destination and a shared model for expanding opportunity in the Austin launch market.',
  },
];

export default function WhatWeDoPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="What WorkforceAP offers each audience"
        subtitle="Members get training and placement support. Employers get certified talent. Partners get a scalable referral model. This page explains the operating model behind those journeys."
      >
        <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
          <Link href="/programs" className="btn btn-primary">Explore programs</Link>
          <Link href="/employers" className="btn btn-outline">Hire talent</Link>
          <Link href="/contact" className="btn btn-outline">Contact WorkforceAP</Link>
        </div>
      </PageHero>

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=80"
        label="Our Approach"
        title="One model, three clear journeys"
        description="We build employer-aligned workforce pathways that help members move into better jobs, help employers hire certified talent, and help partners refer people into a system with real follow-through."
      />

      <section className="content-section">
        <div className="container">
          <div className="values-grid" style={{ marginBottom: '3rem' }}>
            {AUDIENCE_SUMMARY.map((item) => (
              <div key={item.title} className="value-card animate-on-scroll">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mission-vision-grid">
            <div className="mv-card animate-on-scroll">
              <div className="mv-icon mission"><Target size={32} className="text-current" /></div>
              <h2>Who this is for</h2>
              <p>People deciding whether WorkforceAP is the right fit: prospective members, employer decision-makers, funders, and community partners who need a concise view of the model.</p>
            </div>
            <div className="mv-card animate-on-scroll">
              <div className="mv-icon vision"><Globe size={32} className="text-current" /></div>
              <h2>What WorkforceAP offers</h2>
              <p>Employer-aligned training, no-cost access for qualifying participants, and job placement support backed by partnerships instead of participant debt.</p>
            </div>
          </div>

          <div className="legacy-section animate-on-scroll">
            <h2>Why the model works</h2>
            <p className="legacy-subtitle">Employers influence the pipeline. Grants and partners expand access. Members get a pathway to recognized credentials and a stronger shot at employment.</p>
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

          <h2 className="section-title animate-on-scroll">What we stand for</h2>
          <div className="values-grid">
            {[
              { Icon: Target, name: 'Equity', desc: 'Fair access to opportunity — no one should pay for the training that gets them hired.' },
              { Icon: Globe, name: 'Employer-aligned', desc: 'We teach what employers hire for. Google, IBM, AWS, CompTIA — credentials that open doors.' },
              { Icon: Lightbulb, name: 'Outcomes matter', desc: 'Our success is measured by jobs landed, careers launched, and stronger hiring outcomes.' },
              { Icon: Handshake, name: 'Partnership', desc: 'Government, employers, and community organizations expand what members can access alone.' },
              { Icon: TrendingUp, name: 'Scale where it works', desc: 'Austin is the launch market. We expand carefully when the model is ready to travel.' },
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

          <div className="cta-section animate-on-scroll">
            <h2>What to do next</h2>
            <p>Apply if you are ready to begin, explore programs if you are comparing options, hire talent if you are an employer, or contact WorkforceAP if you need the right conversation first.</p>
            <div className="cta-buttons">
              <Link href="/apply" className="btn btn-primary">Apply</Link>
              <Link href="/programs" className="btn btn-outline">Explore programs</Link>
              <Link href="/employers" className="btn btn-dark">Hire talent</Link>
              <Link href="/contact" className="btn btn-outline">Contact WorkforceAP</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
