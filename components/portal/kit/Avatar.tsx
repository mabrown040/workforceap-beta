interface AvatarProps {
  initials: string;
  size?: number;
  /** Gradient background (crimson) vs flat info-blue. */
  gradient?: boolean;
}

/** Initials avatar in a gradient/solid circle. Used in tables, headers, threads. */
export function Avatar({ initials, size = 36, gradient = true }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.34,
        color: '#fff',
        flexShrink: 0,
        background: gradient
          ? 'linear-gradient(135deg, var(--wa-accent), var(--wa-accent-dark))'
          : 'var(--wa-info)',
      }}
    >
      {initials}
    </div>
  );
}
