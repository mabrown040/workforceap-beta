/**
 * JobsSkeleton — loading placeholder for matched-roles and job-board
 * card lists. Mirrors the job-card / matched-role card dimensions so
 * content swapping is layout-stable.
 */
export default function JobsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section aria-busy="true" aria-label="Loading job matches">
      <p className="sr-only">Loading job matches</p>

      {/* Section header */}
      <div style={{ marginBottom: '1rem' }}>
        <div
          className="portal-skeleton"
          style={{
            height: '1.25rem',
            width: '12rem',
            borderRadius: '0.375rem',
            marginBottom: '0.5rem',
          }}
        />
        <div
          className="portal-skeleton"
          style={{
            height: '0.875rem',
            width: '60%',
            borderRadius: '0.375rem',
          }}
        />
      </div>

      {/* Job match cards */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="portal-skeleton"
            style={{
              height: '4.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              gap: '1rem',
            }}
          >
            {/* Title + company lines */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div
                className="portal-skeleton"
                style={{
                  height: '0.875rem',
                  width: '45%',
                  borderRadius: '999px',
                }}
              />
              <div
                className="portal-skeleton"
                style={{
                  height: '0.75rem',
                  width: '30%',
                  borderRadius: '999px',
                }}
              />
            </div>

            {/* Match-percentage pill */}
            <div
              className="portal-skeleton"
              style={{
                height: '1.5rem',
                width: '3.5rem',
                borderRadius: '50px',
                flexShrink: 0,
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
