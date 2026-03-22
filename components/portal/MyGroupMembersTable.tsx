'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import MyGroupExportButton from '@/components/portal/MyGroupExportButton';

type Member = {
  id: string;
  fullName: string;
  email: string;
  enrolledProgram: string | null;
  progressPct: number;
  stageKey: string;
  stage: string;
  updatedAtLabel: string;
  placementRecord?: { employerName: string; jobTitle: string; salaryOffered: number | null; placedAt: string } | null;
};

export default function MyGroupMembersTable({ members }: { members: Member[] }) {
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((member) => {
      if (stage !== 'all' && member.stageKey !== stage) return false;
      if (!q) return true;
      return [member.fullName, member.email, member.enrolledProgram ?? '', member.stage].join(' ').toLowerCase().includes(q);
    });
  }, [members, search, stage]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Members</h2>
        <MyGroupExportButton members={filtered} />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, or program"
          style={{ minWidth: 260, flex: '1 1 280px', padding: '0.7rem 0.9rem', borderRadius: 8, border: '1px solid var(--color-border, #ddd)' }}
        />
        <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ padding: '0.7rem 0.9rem', borderRadius: 8, border: '1px solid var(--color-border, #ddd)' }}>
          <option value="all">All stages</option>
          <option value="applied">Applied</option>
          <option value="enrolled">Enrolled</option>
          <option value="in_training">In training</option>
          <option value="certified">Certified</option>
          <option value="placed">Placed</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Program</th>
              <th>Progress</th>
              <th>Last active</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/my-group/members/${m.id}`} style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                    {m.fullName}
                  </Link>
                </td>
                <td>{m.enrolledProgram ?? '—'}</td>
                <td>{m.progressPct}%</td>
                <td>{m.updatedAtLabel}</td>
                <td>{m.stage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? <p style={{ color: 'var(--color-gray-500)', marginBottom: '2rem' }}>No members match this filter yet.</p> : null}
    </>
  );
}
