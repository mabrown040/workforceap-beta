'use client';

import Image from 'next/image';
import LocalizedLink from '@/components/LocalizedLink';
import { LEADERS } from '@/lib/content/leadership';

const executives = LEADERS.filter(
  (l) => l.section !== 'consultant' && (l.role === 'Executive Director, CEO' || l.role === 'Chief Operating Officer')
);
const boardMembers = LEADERS.filter(
  (l) => l.section !== 'consultant' && l.role.startsWith('Board Member')
);
const leadConsultants = LEADERS.filter((l) => l.section === 'consultant');

function portraitStyleFor(slug: string) {
  return slug === 'michael-brown'
    ? { objectFit: 'cover' as const, objectPosition: 'center 24%' }
    : { objectFit: 'cover' as const };
}

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function LeadershipContent() {
  return (
    <>
      {/* ── Executive Council ── */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">Executive Council</span>
            <h2>Operational Leadership</h2>
          </div>

          <div className="wa-exec-grid">
            {executives.map((leader, index) => (
              <LocalizedLink
                key={leader.slug}
                href={`/leadership/${leader.slug}`}
                className="wa-exec-card"
              >
                <div className="wa-exec-photo">
                  <Image
                    src={leader.image}
                    alt={leader.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={index === 0}
                    style={portraitStyleFor(leader.slug)}
                  />
                  {leader.founder && <span className="wa-founder">Founder</span>}
                </div>

                <div className="wa-exec-body">
                  <span className="wa-role">{leader.role}</span>
                  <h3>{leader.name}</h3>
                  {leader.missionRelevance && (
                    <p className="wa-mission">{leader.missionRelevance}</p>
                  )}
                  <p className="wa-bio">{leader.cardBio}</p>
                  <span className="wa-go">
                    View profile
                    <ArrowIcon size={16} />
                  </span>
                </div>
              </LocalizedLink>
            ))}
          </div>
        </div>
      </section>

      {/* ── Board of Trustees ── */}
      <section className="wa-band wa-band--alt">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">Board of Trustees</span>
            <h2>Strategic Governance</h2>
          </div>

          <div className="wa-board-grid">
            {boardMembers.map((leader) => (
              <LocalizedLink
                key={leader.slug}
                href={`/leadership/${leader.slug}`}
                className="wa-board-card"
              >
                <div className="wa-board-photo">
                  <Image
                    src={leader.image}
                    alt={leader.name}
                    fill
                    sizes="176px"
                    style={portraitStyleFor(leader.slug)}
                  />
                </div>

                <div className="wa-board-body">
                  <span className="wa-role">{leader.role}</span>
                  <h3>{leader.name}</h3>
                  {leader.missionRelevance && (
                    <p className="wa-mission">{leader.missionRelevance}</p>
                  )}
                  <p className="wa-bio">{leader.cardBio}</p>
                </div>

                <span className="wa-go">
                  <ArrowIcon size={20} />
                </span>
              </LocalizedLink>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lead Consultant (bottom, before CTA) ── */}
      {leadConsultants.length > 0 ? (
        <section className="wa-band">
          <div className="wa-wrap">
            <div className="wa-sec-head">
              <span className="wa-eyebrow">Advisory</span>
              <h2>Lead Consultant</h2>
            </div>
            <div className="wa-consult-grid">
              {leadConsultants.map((leader) => (
                <LocalizedLink
                  key={leader.slug}
                  href={`/leadership/${leader.slug}`}
                  className="wa-consult-card"
                >
                  {leader.image && leader.image.trim().length > 0 ? (
                    <div className="wa-consult-photo">
                      <Image
                        src={leader.image}
                        alt={leader.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 480px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div className="wa-consult-fallback" aria-hidden>
                      <span className="wa-fallback-ic">
                        <svg
                          width="36"
                          height="36"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 18v-1a4 4 0 0 1 4-4h2" />
                          <path d="M21 18v-1a4 4 0 0 0-4-4h-2" />
                          <circle cx="12" cy="7" r="4" />
                          <path d="M12 11v3" />
                        </svg>
                      </span>
                      <span className="wa-fallback-lab">WorkforceAP leadership</span>
                    </div>
                  )}
                  <div className="wa-consult-body">
                    <span className="wa-role">{leader.role}</span>
                    <h3>{leader.name}</h3>
                    {leader.missionRelevance ? (
                      <p className="wa-mission">{leader.missionRelevance}</p>
                    ) : null}
                    <p className="wa-bio">{leader.cardBio}</p>
                  </div>
                </LocalizedLink>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── CTA Section ── */}
      <section className="wa-band wa-band--alt">
        <div className="wa-wrap">
          <div className="wa-cta">
            <span className="wa-cta-ic" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </span>
            <h2>Join the Mission</h2>
            <p>
              Whether you want to partner, volunteer, serve on the board, or
              support workforce development nationwide &mdash; we want to hear
              from you.
            </p>
            <div className="wa-acts">
              <LocalizedLink href="/contact" className="wa-btn wa-btn--light">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
                Get in Touch
              </LocalizedLink>
              <LocalizedLink href="/programs" className="wa-btn wa-btn--translucent">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                View Programs
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
