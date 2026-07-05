import Link from 'next/link';
import { ArrowLeft, MessagesSquare } from 'lucide-react';
import { DesignSurface } from '@/components/portal/kit';

/**
 * Member Portal — AI CAREER COUNSELOR session-detail view.
 *
 * Target route: app/(portal)/dashboard/counselor/[id]
 * Surface: warm (member-facing).
 */

export interface MemberCounselorSessionKitProps {
  title: string;
  dateLabel: string;
  output: string;
  backLabel: string;
}

export function MemberCounselorSessionKit({ title, dateLabel, output, backLabel }: MemberCounselorSessionKitProps) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <Link
          href="/dashboard/counselor"
          className="wa-kit-focus hover:wa-opacity-80 wa-transition-opacity wa-duration-150 motion-reduce:wa-transition-none"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--wa-accent)', textDecoration: 'none' }}
        >
          <ArrowLeft size={13} aria-hidden="true" /> {backLabel}
        </Link>

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
            <MessagesSquare size={13} aria-hidden="true" />
            <span>{title}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--wa-muted)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{dateLabel}</p>
        </div>

        <div className="wa-kit-card" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: 14, color: 'var(--wa-text)' }}>
          {output}
        </div>
      </div>
    </DesignSurface>
  );
}
