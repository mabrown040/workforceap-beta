'use client';

type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
};

export function Skeleton({
  className = '',
  style = {},
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  return (
    <span
      className={`skeleton skeleton-${variant} ${className}`.trim()}
      style={{
        width: width ?? (variant === 'text' ? '100%' : undefined),
        height: height ?? (variant === 'text' ? '1em' : variant === 'circular' ? '2rem' : undefined),
        ...style,
      }}
      aria-hidden
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" height={14} style={{ flex: 1, maxWidth: i === 0 ? 140 : 100 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} variant="text" height={12} style={{ flex: 1, maxWidth: c === 0 ? 120 : 80 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <Skeleton variant="rounded" height={120} style={{ marginBottom: '1rem' }} />
      <Skeleton variant="text" width="70%" style={{ marginBottom: '0.5rem' }} />
      <Skeleton variant="text" width="90%" style={{ marginBottom: '0.5rem' }} />
      <Skeleton variant="text" width="50%" />
    </div>
  );
}

export function ReadinessSkeleton() {
  return (
    <div className="skeleton-readiness">
      <div className="skeleton-readiness-header">
        <Skeleton variant="text" width={120} height={20} />
        <Skeleton variant="text" width="80%" height={14} style={{ marginTop: '0.5rem' }} />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton-readiness-section">
          <Skeleton variant="text" width="60%" height={18} />
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton variant="text" width="95%" />
            <Skeleton variant="text" width="88%" />
            <Skeleton variant="text" width="92%" />
          </div>
        </div>
      ))}
    </div>
  );
}
