import { type KitBaseProps, type KitDataAttrs } from './base';

interface AvatarProps extends KitBaseProps<HTMLSpanElement>, KitDataAttrs {
  initials: string;
  size?: number;
  /** Soft crimson tile vs muted surface-2. */
  gradient?: boolean;
  /** Optional profile photo URL (signed or public). Falls back to initials. */
  src?: string;
}

/**
 * Initials avatar — kit-native circle on `--wa-*`. Callers pass `initials`
 * (and optional `size` / `gradient`); do not leak extra props onto the DOM.
 */
export function Avatar({
  initials,
  size = 36,
  gradient = true,
  src,
  className,
  style,
  ref,
  ...rest
}: AvatarProps) {
  const label = initials.slice(0, 2).toUpperCase();
  const fontSize = Math.max(10, Math.round(size * 0.36));
  const shellStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    borderRadius: 999,
    background: src ? 'var(--wa-surface-2)' : gradient ? 'var(--wa-accent-soft)' : 'var(--wa-surface-2)',
    color: gradient ? 'var(--wa-accent)' : 'var(--wa-muted)',
    fontSize,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    flexShrink: 0,
    overflow: 'hidden',
    ...style,
  } as const;

  return (
    <span
      ref={ref}
      className={className}
      role="img"
      aria-label={label}
      style={shellStyle}
      {...rest}
    >
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        label
      )}
    </span>
  );
}
