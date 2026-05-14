import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';

/** Route-level skeleton for the member dashboard home.
 *  Shown while the async page data (memberState, intake, B4B progress, etc.) resolves.
 */
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
