import type { ReactNode } from 'react';
import { cx, type KitBaseProps, type KitDataAttrs } from './base';

interface PageOpenerProps extends KitBaseProps<HTMLDivElement>, KitDataAttrs {
  /** Uppercase eyebrow (e.g. "My program"). */
  kicker: string;
  title: string;
  /** One-line lede under the title. */
  lede?: string;
  /** Optional lucide (or other) icon in the kicker row. */
  icon?: ReactNode;
  /** Trailing control aligned to the title (streak chip, status). */
  action?: ReactNode;
}

/**
 * Member page opener — kicker + h1 + lede. Matches the VoiceStudio / member
 * kit idiom so every member surface starts the same way. Use this instead of
 * `PageHeader` breadcrumbs on warm member routes.
 */
export function PageOpener({
  kicker,
  title,
  lede,
  icon,
  action,
  className,
  style,
  ref,
  ...rest
}: PageOpenerProps) {
  return (
    <div
      ref={ref}
      className={cx('wa-page-opener wa-flex wa-items-end wa-justify-between wa-flex-wrap', className)}
      style={{ gap: 12, ...style }}
      {...rest}
    >
      <div style={{ minWidth: 0 }}>
        <div
          className="wa-flex wa-items-center wa-gap-2"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--wa-accent)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {icon}
          <span>{kicker}</span>
        </div>
        <h1
          className="h-font"
          style={{
            fontSize: 'clamp(22px, 6vw, 30px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginTop: 4,
            textWrap: 'balance',
          }}
        >
          {title}
        </h1>
        {lede ? (
          <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 4 }}>{lede}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
