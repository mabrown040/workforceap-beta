'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { employerMatchPipelineLabel } from '@/lib/employer/aiMatchPipelineLabels';

export type EmployerMatchHistoryRow = {
  id: string;
  jobId: string;
  studentId: string;
  status: string;
  matchScore: number;
  createdAt: string;
  statusUpdatedAt: string | null;
  job: { id: string; title: string };
  student: { id: string; fullName: string };
  applicationId: string | null;
};

const STATUSES = [
  'suggested',
  'employer_notified',
  'student_notified',
  'contacted',
  'interviewing',
  'hired',
  'rejected',
] as const;

export default function EmployerMatchHistoryClient({ initialRows }: { initialRows: EmployerMatchHistoryRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patchStatus = useCallback(async (jobId: string, studentId: string, matchId: string, status: string) => {
    setBusyId(matchId);
    setError(null);
    try {
      const r = await fetch(`/api/employer/jobs/${jobId}/matches/${studentId}`, {
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
          row.id === matchId
            ? {
                ...row,
                status: data.status ?? status,
                statusUpdatedAt: data.statusUpdatedAt ?? new Date().toISOString(),
              }
            : row
        )
      );
    } finally {
      setBusyId(null);
    }
  }, []);

  if (rows.length === 0) {
    return <p style={{ color: 'var(--color-on-surface-variant)' }}>No suggested candidates yet. When WorkforceAP matches members to your roles, they appear here.</p>;
  }

  return (
    <div className="employer-match-history">
      {error ? (
        <p className="employer-apps-error" role="alert">
          {error}
        </p>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Job</th>
              <th>Match</th>
              <th>Your status</th>
              <th>Last update</th>
              <th>Application</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const last = row.statusUpdatedAt ?? row.createdAt;
              return (
                <tr key={row.id}>
                  <td>
                    <Link
                      href={`/employer/candidates/${row.studentId}?jobId=${encodeURIComponent(row.jobId)}`}
                      style={{ fontWeight: 600, color: 'var(--color-accent)' }}
                    >
                      {row.student.fullName}
                    </Link>
                  </td>
                  <td>{row.job.title}</td>
                  <td>{row.matchScore}%</td>
                  <td>
                    <select
                      className="form-control"
                      style={{ minWidth: '10rem', fontSize: '0.85rem' }}
                      value={row.status}
                      disabled={busyId === row.id}
                      onChange={(e) => void patchStatus(row.jobId, row.studentId, row.id, e.target.value)}
                      aria-label={`Status for ${row.student.fullName}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {employerMatchPipelineLabel(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {new Date(last).toLocaleString()}
                  </td>
                  <td>
                    {row.applicationId ? (
                      <Link href={`/employer/applications#${row.applicationId}`}>Open in applicants</Link>
                    ) : (
                      <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
