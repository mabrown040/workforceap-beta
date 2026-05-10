/**
 * Shared loading skeleton for authenticated portal routes (member dashboard shell and similar).
 */
export default function PortalRouteLoading() {
  return (
    <div className="portal-route-loading" aria-busy="true" aria-label="Loading">
      <div className="portal-skeleton-stack">
        <div className="portal-skeleton portal-skeleton--line portal-skeleton--lg" />
        <div className="portal-skeleton portal-skeleton--line portal-skeleton--md" />
      </div>
      <div className="portal-skeleton portal-skeleton--hero" />
      <div className="portal-skeleton-grid portal-skeleton-grid--dashboard-metrics">
        <div className="portal-skeleton portal-skeleton--card portal-skeleton--dashboard-metric" />
        <div className="portal-skeleton portal-skeleton--card portal-skeleton--dashboard-metric" />
        <div className="portal-skeleton portal-skeleton--card portal-skeleton--dashboard-metric" />
      </div>
      <div className="portal-skeleton portal-skeleton--block portal-skeleton--dashboard-list" />
      <div className="portal-skeleton portal-skeleton--block portal-skeleton--short" />
    </div>
  );
}
