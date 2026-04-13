import PortalRouteLoading from '@/components/portal/PortalRouteLoading';

/** Shown while member dashboard sub-routes resolve (layout shell is usually already cached). */
export default function DashboardSegmentLoading() {
  return <PortalRouteLoading />;
}
