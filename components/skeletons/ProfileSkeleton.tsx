'use client';

/**
 * Loading skeleton for member profile page.
 * Mirrors the profile form/layout structure.
 */
export function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading profile"
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {/* Avatar + name row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem',
        }}
      >
        <div
          className="portal-skeleton"
          style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '999px',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="portal-skeleton"
            style={{
              height: '1.25rem',
              width: '50%',
              borderRadius: '0.375rem',
              marginBottom: '0.5rem',
            }}
          />
          <div
            className="portal-skeleton"
            style={{
              height: '0.875rem',
              width: '30%',
              borderRadius: '0.375rem',
            }}
          />
        </div>
      </div>

      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="portal-card portal-card--flat"
          style={{ padding: '1rem' }}
        >
          <div
            className="portal-skeleton"
            style={{
              height: '0.75rem',
              width: '5rem',
              borderRadius: '999px',
              marginBottom: '0.5rem',
            }}
          />
          <div
            className="portal-skeleton"
            style={{
              height: '2.5rem',
              width: '100%',
              borderRadius: '0.5rem',
            }}
          />
        </div>
      ))}
    </div>
  );
}
