import Link from 'next/link';
import { ArrowLeft, MessagesSquare } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { DesignSurface } from '@/components/portal/kit';

/**
 * Member Portal — LILLEY AI CAREER COACH session-detail view.
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
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--wa-type-meta)', fontWeight: 700, color: 'var(--wa-accent)', textDecoration: 'none' }}
        >
          <ArrowLeft size={13} aria-hidden="true" /> {backLabel}
        </Link>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 'var(--wa-type-meta)',
              fontWeight: 700,
              color: 'var(--wa-accent)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <MessagesSquare size={13} aria-hidden="true" />
            <span>{title}</span>
          </div>
          <p style={{ fontSize: 'var(--wa-type-meta)', color: 'var(--wa-muted)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{dateLabel}</p>
        </div>

        <Card>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: 'var(--wa-type-body)', color: 'var(--wa-text)' }}>{output}</div>
        </Card>
      </div>
    </DesignSurface>
  );
}
