'use client';

import Link from 'next/link';

type ProgressBannerProps = {
  programTitle: string;
  completedCount: number;
  totalCount: number;
};

export default function ProgressBanner({ programTitle, completedCount, totalCount }: ProgressBannerProps) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="progress-banner">
      <div className="progress-banner-main">
        <span className="progress-banner-title">{programTitle}</span>
        <div className="progress-banner-track-wrap">
          <div
            className="progress-banner-track"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${completedCount} of ${totalCount} courses complete`}
          >
            <div className="progress-banner-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="progress-banner-meta">
          {completedCount} of {totalCount} courses
        </span>
      </div>
      <Link href="/dashboard" className="btn btn-primary progress-banner-cta">
        <span className="progress-banner-cta-text">Continue Training →</span>
      </Link>
    </div>
  );
}
