'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LEADERS } from '@/lib/content/leadership';

const executives = LEADERS.filter(
  (l) => l.role === 'Executive Director, CEO' || l.role === 'Chief Operating Officer'
);
const boardMembers = LEADERS.filter((l) => l.role.startsWith('Board Member'));

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
                  className="stitch-card"
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
                    style={{
                      aspectRatio: '4/5',
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
                      style={{
                        objectFit: 'cover',
                      }}
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

          <div className="leadership-board-bento">
            {boardMembers.map((leader, idx) => {
              const colSpan = idx === 0 ? 'span 4' : idx === 1 ? 'span 2' : 'span 6';
              const isWide = idx === 0 || idx === 2;

              return (
                <Link
                  key={leader.slug}
                  href={`/leadership/${leader.slug}`}
                  style={{
                    gridColumn: colSpan,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <article
                    className="leadership-board-card"
                    style={{
                      background: 'var(--surface-container-lowest)',
                      borderRadius: 'var(--radius-xl, 1rem)',
                      overflow: 'hidden',
                      display: isWide ? 'grid' : 'flex',
                      gridTemplateColumns: isWide ? 'auto 1fr auto' : undefined,
                      flexDirection: isWide ? undefined : 'column',
                      alignItems: isWide ? 'center' : undefined,
                      gap: isWide ? '2rem' : '1.25rem',
                      padding: isWide ? '2rem' : '1.75rem',
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
                        width: isWide ? 120 : 72,
                        height: isWide ? 120 : 72,
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
                        sizes={isWide ? '120px' : '72px'}
                        style={{
                          objectFit: 'cover',
                        }}
                      />
                    </div>

                    <div className="leadership-board-body" style={{ flex: 1, minWidth: 0 }}>
                      <span
                        className="text-label-upper"
                        style={{
                          color: 'var(--color-accent)',
                          fontSize: '0.6rem',
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
                          fontSize: isWide ? '1.25rem' : '1.1rem',
                          fontWeight: 600,
                          margin: '0 0 0.35rem',
                        }}
                      >
                        {leader.name}
                      </h3>
                      {leader.missionRelevance && isWide && (
                        <p
                          className="leader-mission-callout"
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 500,
                            marginBottom: '0.5rem',
                            lineHeight: 1.5,
                          }}
                        >
                          {leader.missionRelevance}
                        </p>
                      )}
                      <p
                        style={{
                          color: 'var(--color-on-surface-variant)',
                          fontSize: '0.83rem',
                          lineHeight: 1.6,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: isWide ? 4 : 3,
                          WebkitBoxOrient: 'vertical' as const,
                          overflow: 'hidden',
                        }}
                      >
                        {leader.cardBio}
                      </p>
                    </div>

                    <span
                      className="material-symbols-outlined"
                      style={{
                        color: 'var(--color-on-surface-variant)',
                        opacity: 0.4,
                        fontSize: '1.25rem',
                        alignSelf: isWide ? 'center' : 'flex-end',
                      }}
                    >
                      arrow_forward
                    </span>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

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
            >
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
                <span className="material-symbols-outlined" style={{ fontSize: '1.15rem' }}>
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
                <span className="material-symbols-outlined" style={{ fontSize: '1.15rem' }}>
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
