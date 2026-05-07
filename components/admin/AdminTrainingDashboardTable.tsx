'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { TrainingDashboardRow } from '@/lib/admin/trainingDashboard';

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function formatLastTouch(value: string | Date | null): string {
  if (!value) return 'No activity yet';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return 'No activity yet';
  const diffHours = Math.max(1, Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function statusFor(row: TrainingDashboardRow): { label: string; color: string; bg: string } {
  if (row.progressPercent >= 100 || row.completedCount >= row.totalCourses) {
    return { label: 'Complete', color: '#166534', bg: 'rgba(22,163,74,0.12)' };
  }
  if (row.staleTrainingDetectedAt) {
    return { label: 'Stale', color: '#991b1b', bg: 'rgba(220,38,38,0.12)' };
  }
  if (row.progressPercent > 0 || row.activeCourseCount > 0) {
    return { label: 'In progress', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' };
  }
  return { label: 'Not started', color: '#92400e', bg: 'rgba(245,158,11,0.12)' };
}

export default function AdminTrainingDashboardTable({ rows }: { rows: TrainingDashboardRow[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [program, setProgram] = useState('');

  const programs = useMemo(
    () => [...new Map(rows.map((row) => [row.enrolledProgram, row.programTitle])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [rows]
  );

  const filtered = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    const rowStatus = statusFor(row).label.toLowerCase().replace(' ', '_');
    const matchesQuery = !q || row.fullName.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
    const matchesStatus = !status || rowStatus === status;
    const matchesProgram = !program || row.enrolledProgram === program;
    return matchesQuery && matchesStatus && matchesProgram;
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search member or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: '0.6rem', minWidth: '220px' }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '0.6rem', minWidth: '170px' }}>
          <option value="">All training statuses</option>
          <option value="in_progress">In progress</option>
          <option value="not_started">Not started</option>
          <option value="stale">Stale</option>
          <option value="complete">Complete</option>
        </select>
        <select value={program} onChange={(e) => setProgram(e.target.value)} style={{ padding: '0.6rem', minWidth: '220px' }}>
          <option value="">All programs</option>
          {programs.map(([slug, title]) => <option key={slug} value={slug}>{title}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Program</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Last training touch</th>
              <th>Partner / counselor</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const badge = statusFor(row);
              return (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/members/${row.id}`}>{row.fullName}</Link>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{row.email}</div>
                  </td>
                  <td>
                    {row.programTitle}
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>Enrolled {formatDate(row.enrolledAt)}</div>
                  </td>
                  <td><span style={{ display: 'inline-flex', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800, color: badge.color, background: badge.bg }}>{badge.label}</span></td>
                  <td>
                    <strong>{row.progressPercent}%</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{row.completedCount}/{row.totalCourses} complete · {row.activeCourseCount} active</div>
                  </td>
                  <td>{formatLastTouch(row.lastTrainingActivityAt)}</td>
                  <td>
                    <div>{row.partnerName ?? 'No partner'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{row.counselorName ?? 'No counselor'}</div>
                  </td>
                  <td><Link href={`/admin/members/${row.id}`} className="btn btn-outline btn-sm">Open</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
