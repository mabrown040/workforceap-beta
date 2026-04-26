'use client';

import Image from 'next/image';
import Link from 'next/link';
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

export default function LeadershipContent() {
  return (
    <>
      {/* ── Executive Council ── */}
      <section className="content-section">
        <div className="container" style={{ maxWidth: 1400 }}>
          <div style={{ marginBottom: '3rem' }}>
            <span
              className="text-label-upper"
              style={{
                color: 'var(--color-accent)',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                display: 'block',
                marginBottom: '0.75rem',
              }}
            >
              Executive Council
            </span>
            <h2
              className="text-display-sm"
              style={{ color: 'var(--color-on-surface)', margin: 0 }}
            >
              Operational Leadership
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
            }}
          >
            {executives.map((leader, index) => (
              <Link
                key={leader.slug}
                href={`/leadership/${leader.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <article
                  className="portal-card portal-card--flat"
                  style={{
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-xl, 1rem)',
                    overflow: 'hidden',
                    transition: 'background 0.2s ease, transform 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-container-high)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface-container)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    className="leadership-exec-photo"
                    style={{
                      aspectRatio: '3/4',
                      maxHeight: 320,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      src={leader.image}
                      alt={leader.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={index === 0}
                      style={portraitStyleFor(leader.slug)}
                    />
                    {leader.founder && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '1rem',
                          left: '1rem',
                          background: 'var(--color-accent)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        Founder
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '1.5rem 1.75rem 2rem' }}>
                    <span
                      className="text-label-upper"
                      style={{
                        color: 'var(--color-accent)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.08em',
                        display: 'block',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {leader.role}
                    </span>
                    <h3
                      style={{
                        color: 'var(--color-on-surface)',
                        fontSize: '1.35rem',
                        fontWeight: 600,
                        margin: '0 0 0.35rem',
                      }}
                    >
                      {leader.name}
                    </h3>
                    {leader.missionRelevance && (
                      <p
                        className="leader-mission-callout"
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          marginBottom: '0.75rem',
                          lineHeight: 1.5,
                        }}
                      >
                        {leader.missionRelevance}
                      </p>
                    )}
                    <p
                      style={{
                        color: 'var(--color-on-surface-variant)',
                        fontSize: '0.875rem',
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      {leader.cardBio}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Board of Trustees ── */}
      <section
        className="content-section"
        style={{ background: 'var(--surface-container-low)' }}
      >
        <div className="container" style={{ maxWidth: 1400 }}>
          <div style={{ marginBottom: '3rem' }}>
            <span
              className="text-label-upper"
              style={{
                color: 'var(--color-accent)',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                display: 'block',
                marginBottom: '0.75rem',
              }}
            >
              Board of Trustees
            </span>
            <h2
              className="text-display-sm"
              style={{ color: 'var(--color-on-surface)', margin: 0 }}
            >
              Strategic Governance
            </h2>
          </div>

          <div className="leadership-board-equal">
            {boardMembers.map((leader) => (
              <Link
                key={leader.slug}
                href={`/leadership/${leader.slug}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <article
                  className="leadership-board-card leadership-board-card-equal"
                  style={{
                    background: 'var(--surface-container-lowest)',
                    borderRadius: 'var(--radius-xl, 1rem)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '1rem',
                    padding: '2rem 1.5rem',
                    height: '100%',
                    transition: 'background 0.2s ease, transform 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-container)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface-container-lowest)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    className="leadership-board-photo"
                    style={{
                      width: 176,
                      height: 176,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <Image
                      src={leader.image}
                      alt={leader.name}
                      fill
                      sizes="176px"
                      style={portraitStyleFor(leader.slug)}
                    />
                  </div>

                  <div className="leadership-board-body" style={{ flex: 1, minWidth: 0 }}>
                    <span
                      className="text-label-upper"
                      style={{
                        color: 'var(--color-accent)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        display: 'block',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {leader.role}
                    </span>
                    <h3
                      style={{
                        color: 'var(--color-on-surface)',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        margin: '0 0 0.5rem',
                      }}
                    >
                      {leader.name}
                    </h3>
                    {leader.missionRelevance && (
                      <p
                        className="leader-mission-callout"
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          marginBottom: '0.5rem',
                          lineHeight: 1.5,
                          textAlign: 'left',
                        }}
                      >
                        {leader.missionRelevance}
                      </p>
                    )}
                    <p
                      style={{
                        color: 'var(--color-on-surface-variant)',
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                        margin: 0,
                        textAlign: 'left',
                      }}
                    >
                      {leader.cardBio}
                    </p>
                  </div>

                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: 'var(--color-accent)',
                      opacity: 0.7,
                      fontSize: '1.25rem',
                    }}
                   aria-hidden="true">
                    arrow_forward
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lead Consultant (bottom, before CTA) ── */}
      {leadConsultants.length > 0 ? (
        <section className="content-section">
          <div className="container" style={{ maxWidth: 1400 }}>
            <div style={{ marginBottom: '3rem' }}>
              <span
                className="text-label-upper"
                style={{
                  color: 'var(--color-accent)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  display: 'block',
                  marginBottom: '0.75rem',
                }}
              >
                Advisory
              </span>
              <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', margin: 0 }}>
                Lead Consultant
              </h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
                alignItems: 'stretch',
              }}
            >
              {leadConsultants.map((leader) => (
                <Link
                  key={leader.slug}
                  href={`/leadership/${leader.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <article
                    className="portal-card portal-card--flat"
                    style={{
                      background: 'var(--surface-container-lowest)',
                      borderRadius: 'var(--radius-xl, 1rem)',
                      overflow: 'hidden',
                      height: '100%',
                      transition: 'background 0.2s ease, transform 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-container)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-container-lowest)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {leader.image && leader.image.trim().length > 0 ? (
                      <div
                        style={{
                          aspectRatio: '16/10',
                          position: 'relative',
                          overflow: 'hidden',
                          maxHeight: 260,
                        }}
                      >
                        <Image
                          src={leader.image}
                          alt={leader.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 480px"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div
                        aria-hidden
                        style={{
                          padding: '1.75rem 1.75rem 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: '2.25rem',
                            color: 'var(--color-accent)',
                            opacity: 0.85,
                          }}
                         aria-hidden="true">
                          support_agent
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: 'var(--color-on-surface-variant)',
                          }}
                        >
                          WorkforceAP leadership
                        </span>
                      </div>
                    )}
                    <div style={{ padding: '1.5rem 1.75rem 2rem' }}>
                      <span
                        className="text-label-upper"
                        style={{
                          color: 'var(--color-accent)',
                          fontSize: '0.65rem',
                          letterSpacing: '0.08em',
                          display: 'block',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {leader.role}
                      </span>
                      <h3
                        style={{
                          color: 'var(--color-on-surface)',
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          margin: '0 0 0.5rem',
                        }}
                      >
                        {leader.name}
                      </h3>
                      {leader.missionRelevance ? (
                        <p
                          className="leader-mission-callout"
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            marginBottom: '0.75rem',
                            lineHeight: 1.5,
                          }}
                        >
                          {leader.missionRelevance}
                        </p>
                      ) : null}
                      <p
                        style={{
                          color: 'var(--color-on-surface-variant)',
                          fontSize: '0.875rem',
                          lineHeight: 1.65,
                          margin: 0,
                        }}
                      >
                        {leader.cardBio}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── CTA Section ── */}
      <section className="content-section">
        <div className="container" style={{ maxWidth: 1400 }}>
          <div
            style={{
              background:
                'linear-gradient(135deg, var(--color-accent), var(--color-accent-light, #c0446b))',
              borderRadius: 'var(--radius-xl, 1rem)',
              padding: '4rem 3rem',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '2.5rem',
                marginBottom: '1rem',
                opacity: 0.85,
                display: 'block',
              }}
             aria-hidden="true">
              group_add
            </span>
            <h2
              className="text-display-sm"
              style={{ color: '#fff', margin: '0 0 1rem' }}
            >
              Join the Mission
            </h2>
            <p
              style={{
                fontSize: '1.05rem',
                maxWidth: '38rem',
                margin: '0 auto 2rem',
                opacity: 0.9,
                lineHeight: 1.7,
              }}
            >
              Whether you want to partner, volunteer, serve on the board, or
              support workforce development nationwide &mdash; we want to hear
              from you.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Link
                href="/contact"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#fff',
                  color: 'var(--color-accent)',
                  padding: '0.85rem 2rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.15rem' }} aria-hidden="true">
                  mail
                </span>
                Get in Touch
              </Link>
              <Link
                href="/programs"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  padding: '0.85rem 2rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                  transition: 'background 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.15rem' }} aria-hidden="true">
                  school
                </span>
                View Programs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
