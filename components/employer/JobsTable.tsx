'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type JobItem = {
  id: string;
  title: string;
  location: string;
  locationType: string;
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
];

export default function JobsTable({ jobs }: { jobs: JobItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [closing, setClosing] = useState<string | null>(null);

  const filtered =
    filter === 'all'
      ? jobs
      : filter === 'filled'
        ? jobs.filter((j) => j.status === 'filled' || j.status === 'closed')
        : jobs.filter((j) => j.status === filter);

  const handleClose = async (id: string) => {
    if (!confirm('Mark this job as filled/closed?')) return;
    setClosing(id);
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'filled' }),
      });
      if (res.ok) router.refresh();
      else alert('Failed to update');
    } finally {
      setClosing(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`btn btn-ghost btn-sm ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Location</th>
              <th>Status</th>
              <th>Applications</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr key={j.id}>
                <td>
                  <Link href={`/employer/jobs/${j.id}`} style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                    {j.title}
                  </Link>
                </td>
                <td>{j.location}</td>
                <td>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      background:
                        j.status === 'live'
                          ? 'rgba(74, 155, 79, 0.15)'
                          : j.status === 'pending'
                            ? 'rgba(255, 165, 0, 0.15)'
                            : j.status === 'draft'
                              ? 'var(--color-gray-200)'
                              : 'var(--color-gray-100)',
                    }}
                  >
                    {j.statusLabel}
                  </span>
                </td>
                <td>{j.applicationsCount}</td>
                <td>
                  <Link href={`/employer/jobs/${j.id}`} style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>
                    Edit
                  </Link>
                  {(j.status === 'live' || j.status === 'approved') && (
                    <button
                      type="button"
                      onClick={() => handleClose(j.id)}
                      disabled={!!closing}
                      style={{ marginRight: '0.5rem', fontSize: '0.9rem', cursor: closing ? 'wait' : 'pointer' }}
                    >
                      {closing === j.id ? 'Updating…' : 'Close'}
                    </button>
                  )}
                  <Link href={`/employer/applications?jobId=${j.id}`} style={{ fontSize: '0.9rem' }}>
                    View Apps
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p style={{ color: 'var(--color-gray-500)', marginTop: '1rem' }}>No jobs match this filter.</p>
      )}
    </div>
  );
}
