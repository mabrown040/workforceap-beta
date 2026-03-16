'use client';

import Link from 'next/link';

type ProgressRecord = {
  resourceId: string;
  completedAt: string | Date | null;
  viewCount: number;
};

type Props = {
  progress: ProgressRecord[];
};

export default function ResourceProgressSummary({ progress }: Props) {
  const completed = progress.filter((p) => p.completedAt).length;
  const viewed = progress.filter((p) => p.viewCount > 0).length;

  if (progress.length === 0) {
    return (
      <div className="resource-progress-summary">
        <h3>Resource progress</h3>
        <p>No resources viewed yet. <Link href="/resources">Explore resources</Link></p>
      </div>
    );
  }

  return (
    <div className="resource-progress-summary">
      <h3>Resource progress</h3>
      <p>{completed} completed, {viewed} viewed</p>
      <Link href="/resources" className="btn btn-outline btn-sm">
        View all resources
      </Link>
    </div>
  );
}
