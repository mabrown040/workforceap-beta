import { Users2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Token } from '@astryxdesign/core/Token';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
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
          <Card>
            <EmptyState
              icon={<Users2 size={18} aria-hidden="true" />}
              title="No mentors available yet"
              description="Check back soon — we're adding mentors to the network."
            />
          </Card>
        ) : (
          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-4">
            {mentors.map((mentor) => (
              <Card key={mentor.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
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
                      <Token label={mentor.industry} size="sm" color="blue" />
                    ) : null}
                  </div>
                  <div style={{ marginTop: 'auto', width: '100%' }}>
                    <AstryxLink href={`/dashboard/mentors/${mentor.id}`} as={Link as never} isStandalone style={{ width: '100%' }}>
                      <Button
                        label="Request session"
                        variant="primary"
                        size="sm"
                        endContent={<ArrowRight size={12} aria-hidden="true" />}
                        style={{ width: '100%' }}
                      />
                    </AstryxLink>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DesignSurface>
  );
}
