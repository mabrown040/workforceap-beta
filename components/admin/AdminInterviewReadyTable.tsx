'use client';

import { useState } from 'react';
import Link from 'next/link';

export type InterviewReadyRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  assessmentScorePct: number | null;
  interviewRequestedAt: Date | null;
  preScreening: {
    primaryGoal: string;
    weeklyHours: string;
    barrier: string;
    employmentStatus: string;
  } | null;
};

function mailtoSchedule(email: string, name: string) {
  const subject = encodeURIComponent(`WorkforceAP interview — ${name}`);
  const body = encodeURIComponent(
    `Hi ${name.split(' ')[0] || 'there'},\n\nI'd like to schedule your WorkforceAP interview.\n\n`
  );
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
}

export default function AdminInterviewReadyTable({ rows }: { rows: InterviewReadyRow[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const markInterviewed = async (id: string) => {
    setBusy(id);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/members/${id}/interview`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_interviewed' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="admin-empty-state">
        <h3>No one in the interview queue</h3>
        <p>Members appear here after they complete pre-screening.</p>
      </div>
    );
  }

  return (
    <div>
      {msg && <p className="form-error" role="alert">{msg}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Assessment %</th>
              <th>Pre-screening</th>
              <th>Request</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/members/${r.id}`}>{r.fullName}</Link>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{r.email}</div>
                </td>
                <td>{r.assessmentScorePct ?? '—'}</td>
                <td>
                  {r.preScreening ? (
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
                      <li>Goal: {r.preScreening.primaryGoal}</li>
                      <li>Time/wk: {r.preScreening.weeklyHours}</li>
                      <li>Barrier: {r.preScreening.barrier.slice(0, 80)}{r.preScreening.barrier.length > 80 ? '…' : ''}</li>
                    </ul>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{r.interviewRequestedAt ? new Date(r.interviewRequestedAt).toLocaleString() : 'Not requested'}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => mailtoSchedule(r.email, r.fullName)}
                    >
                      Schedule (email)
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy === r.id}
                      onClick={() => void markInterviewed(r.id)}
                    >
                      {busy === r.id ? '…' : 'Mark interviewed'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
