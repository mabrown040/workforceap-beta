'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Linkedin } from 'lucide-react';
import { LEADERS } from '@/lib/content/leadership';
import './leadership.css';

export default function LeadershipContent() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleBio = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  return (
    <section className="content-section">
      <div className="container">
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }} className="animate-on-scroll">
          Our Team
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-gray-500)',
            marginBottom: '2.5rem',
            fontSize: '1rem',
          }}
          className="animate-on-scroll"
        >
          Click a card to read the full bio, or use &quot;Read more&quot; to expand here.
        </p>

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
                <p className={`leader-card-bio ${expanded[leader.slug] ? 'expanded' : ''}`}>
                  {leader.cardBio}
                </p>
                <div className="leader-card-actions">
                  <button
                    type="button"
                    className="leader-card-read-more"
                    onClick={(e) => toggleBio(e, leader.slug)}
                  >
                    {expanded[leader.slug] ? 'Show less' : 'Read more'}
                  </button>
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
            Interested in partnering with us, volunteering your expertise, or joining the board? We&apos;d love
            to hear from you.
          </p>
          <Link href="/contact" className="btn btn-primary btn-large">
            Get In Touch
          </Link>
        </div>
      </div>
    </section>
  );
}
