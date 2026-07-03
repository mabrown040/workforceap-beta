export type PortalRouteLoadingVariant = 'dashboard' | 'list' | 'form' | 'detail';

type PortalRouteLoadingProps = {
  /**
   * Shapes the skeleton to match the route it covers instead of always
   * showing the dashboard layout:
   *  - 'dashboard' (default, unchanged) — hero + metric cards + list block.
   *  - 'list' — stacked rows (jobs, messages).
   *  - 'form' — label + field pairs (profile, settings).
   *  - 'detail' — heading + paragraph lines (career brief, resume).
   */
  variant?: PortalRouteLoadingVariant;
};

const ARIA_LABEL_BY_VARIANT: Record<PortalRouteLoadingVariant, string> = {
  dashboard: 'Loading',
  list: 'Loading list',
  form: 'Loading form',
  detail: 'Loading details',
};

/**
 * Shared loading skeleton for authenticated portal routes (member dashboard
 * shell and similar). Defaults to the original dashboard-shaped skeleton for
 * backward compatibility — pass `variant` to match a different page shape.
 */
export default function PortalRouteLoading({ variant = 'dashboard' }: PortalRouteLoadingProps = {}) {
  return (
    <div className="portal-route-loading" aria-busy="true" aria-label={ARIA_LABEL_BY_VARIANT[variant]}>
      <div className="portal-skeleton-stack">
        <div className="portal-skeleton portal-skeleton--line portal-skeleton--lg" />
        <div className="portal-skeleton portal-skeleton--line portal-skeleton--md" />
      </div>

      {variant === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="portal-skeleton" style={{ height: '4.25rem', borderRadius: '0.875rem' }} />
          ))}
        </div>
      )}

      {variant === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '32rem' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="portal-skeleton portal-skeleton--line" style={{ width: '30%' }} />
              <div className="portal-skeleton" style={{ height: '2.75rem', borderRadius: '0.75rem' }} />
            </div>
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <>
          <div className="portal-skeleton portal-skeleton--hero" style={{ height: '4.5rem' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[0, 1].map((group) => (
              <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div className="portal-skeleton portal-skeleton--line" style={{ width: '96%' }} />
                <div className="portal-skeleton portal-skeleton--line" style={{ width: '91%' }} />
                <div className="portal-skeleton portal-skeleton--line" style={{ width: '60%' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {variant === 'dashboard' && (
        <>
          <div className="portal-skeleton portal-skeleton--hero" />
          <div className="portal-skeleton-grid portal-skeleton-grid--dashboard-metrics">
            <div className="portal-skeleton portal-skeleton--card portal-skeleton--dashboard-metric" />
            <div className="portal-skeleton portal-skeleton--card portal-skeleton--dashboard-metric" />
            <div className="portal-skeleton portal-skeleton--card portal-skeleton--dashboard-metric" />
          </div>
          <div className="portal-skeleton portal-skeleton--block portal-skeleton--dashboard-list" />
          <div className="portal-skeleton portal-skeleton--block portal-skeleton--short" />
        </>
      )}
    </div>
  );
}
