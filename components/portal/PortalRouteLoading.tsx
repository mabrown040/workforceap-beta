/**
 * Shared loading skeleton for authenticated portal routes (member dashboard shell and similar).
 */
export default function PortalRouteLoading() {
  return (
    <div className="portal-route-loading" aria-busy="true" aria-label="Loading">
      <div className="portal-skeleton portal-skeleton--hero" />
      <div className="portal-skeleton-grid">
        <div className="portal-skeleton portal-skeleton--card" />
        <div className="portal-skeleton portal-skeleton--card" />
        <div className="portal-skeleton portal-skeleton--card" />
      </div>
      <div className="portal-skeleton portal-skeleton--block" />
      <div className="portal-skeleton portal-skeleton--block portal-skeleton--short" />
    </div>
  );
}
