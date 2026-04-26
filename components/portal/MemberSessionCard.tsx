import Link from 'next/link';
import { Sparkles } from 'lucide-react';

/**
 * "Your session with {actor} on {date}" card on the member dashboard.
 *
 * Renders when the member has had at least one in-office session run by a
 * counselor or admin in the last 30 days (per /plan-ceo-review reframe —
 * "dad brings them in, builds the profile while they're in office").
 *
 * The card is the proof-of-care: when the member logs in alone, they see
 * "we built this together on this date" and can pick up where they left off.
 */
export type MemberSessionCardProps = {
  actorName: string;
  startedAt: Date;
  toolCount: number;
};

export default function MemberSessionCard({ actorName, startedAt, toolCount }: MemberSessionCardProps) {
  const dateLabel = startedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section style={{ padding: '1rem 1.25rem 0' }} aria-labelledby="member-session-card-title">
      <div
        className="portal-card portal-card--flat"
        style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, white), white 70%)',
          border: '1px solid color-mix(in srgb, var(--color-accent) 18%, var(--outline-variant))',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span
          aria-hidden
          style={{
            background: 'rgba(173,44,77,0.14)',
            color: 'var(--color-accent)',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={20} aria-hidden />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            id="member-session-card-title"
            style={{
              margin: 0,
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-dark)',
            }}
          >
            Your in-office session
          </p>
          <h2
            style={{
              margin: '0.15rem 0 0.4rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--color-on-surface)',
              lineHeight: 1.3,
            }}
          >
            You and <strong>{actorName}</strong> built this on {dateLabel}.
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            {toolCount} {toolCount === 1 ? 'thing' : 'things'} we made together. Pick up where you left off,
            or build on top of it.
          </p>
        </div>
        <Link
          href="/dashboard/ai-tools/history"
          className="btn btn-primary btn-small"
          style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          See what we built
        </Link>
      </div>
    </section>
  );
}
