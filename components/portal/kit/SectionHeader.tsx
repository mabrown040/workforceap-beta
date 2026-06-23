import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  /** Optional persona/page goal caption (e.g. "Know who needs me today"). */
  goal?: string;
  /** Small uppercase eyebrow above the title. */
  kicker?: string;
  /** Right-aligned action (button/link). Stacks below the title on mobile. */
  action?: ReactNode;
}

/**
 * Page/section header with optional goal caption + action. The goal line is the
 * validation hook from the concept mockups ("does this view serve the goal?").
 */
export function SectionHeader({ title, goal, kicker, action }: SectionHeaderProps) {
  return (
    <div className="wa-flex wa-flex-col md:wa-flex-row md:wa-items-end wa-justify-between wa-gap-3 wa-mb-5">
      <div>
        {kicker ? (
          <div
            className="wa-text-xs wa-font-bold wa-uppercase"
            style={{ letterSpacing: '0.12em', color: 'var(--wa-accent)' }}
          >
            {kicker}
          </div>
        ) : null}
        <h2 className="wa-text-2xl wa-font-extrabold" style={{ letterSpacing: '-0.03em' }}>
          {title}
        </h2>
        {goal ? (
          <p className="wa-text-sm wa-mt-1" style={{ color: 'var(--wa-muted)' }}>
            {goal}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
