'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { employerMatchPipelineLabel } from '@/lib/employer/aiMatchPipelineLabels';
import { matchScoreAsPercent } from '@/lib/employer/matchScoreDisplay';
import DataTable from '@/components/portal/ui/DataTable';
import PortalEmptyState from '@/components/portal/PortalEmptyState';

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
    return (
      <PortalEmptyState
        title="No suggested candidates yet"
        description="When WorkforceAP matches members to your open roles, they will appear here with match scores and pipeline status."
        icon={<span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-on-surface-variant)' }} aria-hidden>group_add</span>}
      />
    );
  }

  return (
    <div className="employer-match-history">
      {error ? (
        <p className="employer-apps-error" role="alert">
          {error}
        </p>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <DataTable
          variant="admin"
          tableClassName="admin-table"
          scrollX={false}
          rows={rows}
          rowKey={(row) => row.id}
          columns={[
            {
              key: 'member',
              header: 'Member',
              cell: (row) => (
                <Link
                  href={`/employer/candidates/${row.studentId}?jobId=${encodeURIComponent(row.jobId)}`}
                  style={{ fontWeight: 600, color: 'var(--color-accent)' }}
                >
                  {row.student.fullName}
                </Link>
              ),
            },
            { key: 'job', header: 'Job', cell: (row) => row.job.title },
            {
              key: 'match',
              header: 'Match',
              align: 'right',
              cell: (row) => <span style={{ fontWeight: 600 }}>{matchScoreAsPercent(row.matchScore)}%</span>,
            },
            {
              key: 'status',
              header: 'Your status',
              cell: (row) => (
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
              ),
            },
            {
              key: 'updated',
              header: 'Last update',
              cell: (row) => (
                <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {new Date(row.statusUpdatedAt ?? row.createdAt).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'application',
              header: 'Application',
              cell: (row) =>
                row.applicationId ? (
                  <Link href={`/employer/applications#${row.applicationId}`}>Open in applicants</Link>
                ) : (
                  <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}
