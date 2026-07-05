import { Users2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { DesignSurface, Avatar } from '@/components/portal/kit';

/**
 * Member Portal — MENTOR BROWSE view.
 * Elevates the bespoke `.mentor-browse-card` grid to the Command Center kit
 * language (warm surface, kit cards, initials Avatar).
 *
 * Target route: app/(portal)/dashboard/mentors
 * Surface: warm (member-facing).
 */

export interface MentorSummary {
  id: string;
  fullName: string;
  title: string | null;
  company: string | null;
  industry: string | null;
}

export interface MemberMentorsKitProps {
  mentors: MentorSummary[];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function MemberMentorsKit({ mentors }: MemberMentorsKitProps) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-6">
        {/* Page opener */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--wa-accent)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <Users2 size={13} aria-hidden="true" />
            <span>Mentor network</span>
          </div>
          <h1
            className="h-font"
            style={{ fontSize: 'clamp(22px, 6vw, 30px)', marginTop: 4, fontWeight: 800, letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Find a mentor
          </h1>
          <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 4 }}>
            Browse WorkforceAP mentors and request a session with someone in your field.
          </p>
        </div>

        {mentors.length === 0 ? (
          <div className="wa-kit-card wa-flex wa-items-start wa-gap-3">
            <div
              aria-hidden="true"
              style={{ width: 40, height: 40, borderRadius: 'var(--wa-radius-sm)', background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Users2 size={18} aria-hidden="true" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wa-text)' }}>No mentors available yet</p>
              <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 2 }}>
                Check back soon — we&rsquo;re adding mentors to the network.
              </p>
            </div>
          </div>
        ) : (
          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-4">
            {mentors.map((mentor) => (
              <div key={mentor.id} className="wa-kit-card wa-kit-card--hover" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="wa-flex wa-items-center wa-gap-3">
                  <Avatar initials={initialsOf(mentor.fullName)} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--wa-text)' }}>{mentor.fullName}</div>
                    {mentor.title ? <div style={{ fontSize: 12, color: 'var(--wa-muted)' }}>{mentor.title}</div> : null}
                  </div>
                </div>
                <div className="wa-flex wa-items-center wa-justify-between wa-gap-2" style={{ flexWrap: 'wrap' }}>
                  {mentor.company ? (
                    <span style={{ fontSize: 12, color: 'var(--wa-muted)' }}>{mentor.company}</span>
                  ) : <span />}
                  {mentor.industry ? (
                    <span className="wa-kit-tag wa-kit-tag--info">{mentor.industry}</span>
                  ) : null}
                </div>
                <Link
                  href={`/dashboard/mentors/${mentor.id}`}
                  className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
                  style={{
                    marginTop: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 44,
                    padding: '10px 0',
                    background: 'var(--wa-accent)',
                    color: 'var(--wa-on-accent)',
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 999,
                    textDecoration: 'none',
                  }}
                >
                  Request session <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DesignSurface>
  );
}
