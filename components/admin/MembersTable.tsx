'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPhone } from '@/lib/formatPhone';

type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  profile: { profilePhone?: string | null } | null;
  enrolledProgram: string | null;
  enrolledAt: Date | null;
  assessmentScorePct: number | null;
  assessmentCompleted: boolean | null;
  updatedAt: Date;
  programTitle: string | null | undefined;
  coursesCompleted: string[];
  totalCourses: number;
};

type MembersTableProps = {
  members: Member[];
};

export default function MembersTable({ members }: MembersTableProps) {
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');

  const filtered = members.filter((m) => {
    const matchSearch = !search || 
      m.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase());
    const matchProgram = !programFilter || m.enrolledProgram === programFilter;
    return matchSearch && matchProgram;
  });

  const programs = [...new Set(members.map((m) => m.enrolledProgram).filter(Boolean))] as string[];

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '0.5rem', width: '220px' }}
        />
        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          style={{ padding: '0.5rem', width: '200px' }}
        >
          <option value="">All programs</option>
          {programs.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Program</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Enrolled</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Score %</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Training</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/admin/members/${m.id}`}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                  <Link href={`/admin/members/${m.id}`} onClick={(e) => e.stopPropagation()}>{m.fullName}</Link>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.email}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{formatPhone(m.profile?.profilePhone ?? m.phone)}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.programTitle ?? '—'}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.enrolledAt?.toLocaleDateString() ?? '—'}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.assessmentScorePct ?? '—'}%</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.assessmentCompleted ? `${m.coursesCompleted.length}/${m.totalCourses}` : '—'}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-gray-600)' }}>No members match your filters.</p>
      )}
    </div>
  );
}
