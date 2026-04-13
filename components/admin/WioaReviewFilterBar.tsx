import Link from 'next/link';
import { WIOA_REVIEW_LABELS, WIOA_REVIEW_STATUSES } from '@/lib/wioa/wioaReview';

export default function WioaReviewFilterBar({ active }: { active: string | null }) {
  return (
    <div
      role="toolbar"
      aria-label="Filter by review status"
      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}
    >
      <Link
        href="/admin/wioa-screening"
        className={`btn btn-sm ${active == null ? 'btn-primary' : 'btn-outline'}`}
      >
        All
      </Link>
      {WIOA_REVIEW_STATUSES.map((s) => (
        <Link
          key={s}
          href={`/admin/wioa-screening?review=${encodeURIComponent(s)}`}
          className={`btn btn-sm ${active === s ? 'btn-primary' : 'btn-outline'}`}
        >
          {WIOA_REVIEW_LABELS[s]}
        </Link>
      ))}
    </div>
  );
}
