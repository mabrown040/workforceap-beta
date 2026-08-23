import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';

/** Route-level skeleton for the member dashboard home.
 *  Default kit UI waits on `loadMemberDashboardHome` (1–2 Prisma ops).
 *  `?ui=legacy` still resolves memberState / intake / B4B.
 */
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
