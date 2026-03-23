'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

export type EmployerApplicationRow = {
  id: string;
  jobId: string;
  status: string;
  appliedAt: string;
  employerNotes: string | null;
  job: { id: string; title: string };
  student: { id: string; fullName: string; email: string };
};

const STATUSES = ['pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected'] as const;

export default function EmployerApplicationsClient({ initialRows }: { initialRows: EmployerApplicationRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patchStatus = useCallback(async (id: string, status: string) => {
    setBusyId(id);
    setError(null);
    try {
      const r = await fetch(`/api/employer/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Update failed');
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                status: data.status ?? status,
                employerNotes: data.employerNotes ?? row.employerNotes,
              }
            : row
        )
      );
    } finally {
      setBusyId(null);
    }
  }, []);

  if (rows.length === 0) {
    return <p style={{ color: 'var(--color-gray-500)' }}>No applications yet.</p>;
  }

  return (
    <div>
      {error ? (
        <p className="employer-apps-error" role="alert">
          {error}
        </p>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Job</th>
              <th>Status</th>
              <th>Applied</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((app) => (
              <tr key={app.id}>
                <td>
                  <div>
                    <strong>{app.student.fullName}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
                      {app.student.email}
                    </div>
                  </div>
                </td>
                <td>
                  <Link href={`/employer/jobs/${app.job.id}`} style={{ color: 'var(--color-accent)' }}>
                    {app.job.title}
                  </Link>
                </td>
                <td>
                  <select
                    className="employer-app-status-select"
                    value={app.status}
                    disabled={busyId === app.id}
                    onChange={(e) => void patchStatus(app.id, e.target.value)}
                    aria-label={`Status for ${app.student.fullName}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
