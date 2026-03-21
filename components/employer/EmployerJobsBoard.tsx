'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { trackEmployerJobAction } from '@/lib/analytics/events';

export type EmployerJobBoardItem = {
  id: string;
  title: string;
  location: string;
  descriptionPreview: string;
  status: string;
  statusLabel: string;
  applicationsCount: number;
  updatedAt: Date;
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'live', label: 'Live' },
  { value: 'filled', label: 'Filled' },
] as const;

function statusModifier(status: string): string {
  if (status === 'live') return 'employer-job-card__status--live';
  if (status === 'pending' || status === 'approved') return 'employer-job-card__status--pending';
  if (status === 'draft') return 'employer-job-card__status--draft';
  return 'employer-job-card__status--neutral';
}

export default function EmployerJobsBoard({ jobs }: { jobs: EmployerJobBoardItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return jobs;
    if (filter === 'filled') return jobs.filter((j) => j.status === 'filled' || j.status === 'closed');
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  async function submitForReview(id: string, jobStatus: string) {
    setBusyId(id);
    trackEmployerJobAction('submit_review', id, { status: jobStatus });
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Could not submit for review');
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const handleClose = async (id: string, status: string) => {
    if (!confirm('Mark this job as filled/closed?')) return;
    setClosingId(id);
    trackEmployerJobAction('close_job', id, { status });
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'filled' }),
      });
      if (res.ok) router.refresh();
      else alert('Failed to update');
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="employer-jobs-board">
      <div className="employer-jobs-board__filters" role="toolbar" aria-label="Filter job postings">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`employer-jobs-board__filter ${filter === f.value ? 'is-active' : ''}`}
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="employer-jobs-board__empty">No jobs match this filter.</p>
      ) : (
        <ul className="employer-jobs-board__grid" role="list">
          {filtered.map((j) => (
            <li key={j.id}>
              <article className="employer-job-card">
                <div className="employer-job-card__top">
                  <span className={`employer-job-card__status ${statusModifier(j.status)}`}>{j.statusLabel}</span>
                  <time className="employer-job-card__time" dateTime={j.updatedAt.toISOString()}>
                    Updated {j.updatedAt.toLocaleDateString()}
                  </time>
                </div>
                <h2 className="employer-job-card__title">{j.title}</h2>
                <p className="employer-job-card__meta">{j.location}</p>
                <p className="employer-job-card__preview">{j.descriptionPreview}</p>
                {j.status !== 'draft' && (
                  <p className="employer-job-card__apps">
                    <strong>{j.applicationsCount}</strong> application{j.applicationsCount === 1 ? '' : 's'}
                  </p>
                )}
                <div className="employer-job-card__actions">
                  <Link
                    href={`/employer/jobs/${j.id}`}
                    className="btn btn-primary btn-sm"
                    onClick={() => trackEmployerJobAction('edit', j.id, { status: j.status })}
                  >
                    {j.status === 'draft' ? 'Edit draft' : 'Edit posting'}
                  </Link>
                  {j.status === 'draft' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === j.id}
                      onClick={() => submitForReview(j.id, j.status)}
                    >
                      {busyId === j.id ? 'Submitting…' : 'Submit for review'}
                    </button>
                  )}
                  {(j.status === 'live' || j.status === 'approved') && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={!!closingId}
                      onClick={() => handleClose(j.id, j.status)}
                    >
                      {closingId === j.id ? 'Updating…' : 'Mark filled'}
                    </button>
                  )}
                  {j.status !== 'draft' && (
                    <Link
                      href={`/employer/applications?jobId=${j.id}`}
                      className="btn btn-ghost btn-sm"
                      onClick={() => trackEmployerJobAction('view_applications', j.id, { status: j.status })}
                    >
                      View applications
                    </Link>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
