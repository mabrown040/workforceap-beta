'use client';

import Link from 'next/link';
import { JOB_READY_TRAINING_PCT } from '@/lib/member/trainingProgress';

export type JobReadyRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  enrolledProgram: string | null;
  trainingPct: number;
  completedCount: number;
  totalCourses: number;
  interviewEligible: boolean;
};

export default function AdminJobReadyTable({ rows }: { rows: JobReadyRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="admin-empty-state">
        <h3>No one is at {JOB_READY_TRAINING_PCT}%+ training yet</h3>
        <p>Members appear here once they complete {JOB_READY_TRAINING_PCT}% or more of their enrolled program. This is separate from Interview ready, which gates on pre-screening.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Program</th>
            <th>Training progress</th>
            <th>Pre-screening</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`/admin/members/${r.id}`}>{r.fullName}</Link>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{r.email}</div>
                {r.phone && <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{r.phone}</div>}
              </td>
              <td>{r.enrolledProgram ?? '—'}</td>
              <td>
                <strong>{r.trainingPct}%</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                  {r.completedCount}/{r.totalCourses} courses
                </div>
              </td>
              <td>
                {r.interviewEligible ? (
                  <span style={{ color: 'var(--color-success, #16a34a)' }}>Done</span>
                ) : (
                  <span style={{ color: 'var(--color-on-surface-variant)' }}>Pending</span>
                )}
              </td>
              <td>
                <Link href={`/admin/members/${r.id}`} className="btn btn-outline btn-sm">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
