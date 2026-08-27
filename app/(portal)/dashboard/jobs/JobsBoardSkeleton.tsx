import { JobListingRowSkeleton } from '@/components/portal/kit';

/** Public job board row skeleton (matches kit JobListingRow geometry). */
export default function JobsBoardSkeleton() {
  return (
    <div className="wa-kit-card" style={{ padding: 0, overflow: 'hidden' }} aria-busy="true" aria-label="Loading job listings">
      {Array.from({ length: 6 }).map((_, i) => (
        <JobListingRowSkeleton key={i} first={i === 0} />
      ))}
    </div>
  );
}
