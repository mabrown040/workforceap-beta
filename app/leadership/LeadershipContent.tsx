'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Linkedin } from 'lucide-react';
import { LEADERS } from '@/lib/content/leadership';
import './leadership.css';

export default function LeadershipContent() {
  return (
    <section className="content-section leadership-trust-page">
      <div className="container">
        <div className="leadership-trust-intro animate-on-scroll">
          <p className="leadership-trust-lead">
            Our board and leadership bring the combination that makes WorkforceAP work:
            <strong> decades of Austin workforce experience</strong>, <strong>employer-side tech credibility</strong>, <strong>military and operations discipline</strong>, and <strong>community roots</strong> that connect training to real outcomes.
          </p>
          <p className="leadership-trust-sub">
            This isn&apos;t a generic nonprofit team. These are people who&apos;ve run programs at scale, led at Goodwill and Urban League, built systems at IBM and Microsoft, commanded in the Army and at AWS — and who show up for Austin.
          </p>
        </div>

        <h2 className="leadership-grid-title animate-on-scroll">Meet the Team</h2>

        <div className="leaders-card-grid animate-on-scroll">
          {LEADERS.map((leader) => (
            <article key={leader.slug} className="leader-card">
              <Link href={`/leadership/${leader.slug}`} className="leader-card-overlay-link">
                <span className="sr-only">View full profile: {leader.name}</span>
              </Link>
              <div className="leader-card-photo">
                <Image src={leader.image} alt={leader.name} width={240} height={240} loading="lazy" />
                {leader.founder && <span className="leader-card-badge">Founder</span>}
              </div>
              <div className="leader-card-body">
                <div className="leader-card-name">{leader.name}</div>
                <div className="leader-card-role">{leader.role}</div>
                {leader.missionRelevance && (
                  <p className="leader-card-relevance">
                    {leader.missionRelevance}
                  </p>
                )}
                <p className="leader-card-bio">
                  {leader.cardBio}
                </p>
                <div className="leader-card-actions">
                  <Link href={`/leadership/${leader.slug}`} className="leader-card-profile-link">
                    Full profile →
                  </Link>
                  <a
                    href={leader.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="leader-card-linkedin"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Linkedin size={18} strokeWidth={2} aria-hidden />
                    LinkedIn
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="join-cta animate-on-scroll">
          <h2>Join Our Mission</h2>
          <p>
            Interested in partnering, volunteering, or joining the board? We&apos;d love to hear from you.
          </p>
          <Link href="/contact" className="btn btn-primary btn-large">
            Get In Touch
          </Link>
        </div>
      </div>
    </section>
  );
}
