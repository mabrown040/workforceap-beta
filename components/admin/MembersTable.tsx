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
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th className="members-col-md">Phone</th>
              <th>Program</th>
              <th>Enrolled</th>
              <th>Score %</th>
              <th>Training</th>
              <th className="members-col-md">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const rawPhone = m.profile?.profilePhone ?? m.phone;
              const phoneDisplay = formatPhone(rawPhone);
              const lastActive = m.updatedAt.toLocaleDateString();
              const narrowDetails = [rawPhone ? `Phone: ${phoneDisplay}` : null, `Last active: ${lastActive}`]
                .filter(Boolean)
                .join(' · ');
              return (
              <tr
                key={m.id}
                data-clickable
                onClick={() => window.location.assign(`/admin/members/${m.id}`)}
              >
                <td>
                  <Link
                    href={`/admin/members/${m.id}`}
                    onClick={(e) => e.stopPropagation()}
                    title={narrowDetails}
                  >
                    {m.fullName}
                  </Link>
                  <div className="members-name-details">
                    {rawPhone ? (
                      <>
                        <span>{phoneDisplay}</span>
                        <span className="members-name-details-sep"> · </span>
                      </>
                    ) : null}
                    <span>Last active {lastActive}</span>
                  </div>
                </td>
                <td>{m.email}</td>
                <td className="members-col-md">{phoneDisplay}</td>
                <td>{m.programTitle ?? '—'}</td>
                <td>{m.enrolledAt?.toLocaleDateString() ?? '—'}</td>
                <td>
                  <span className={
                    m.assessmentScorePct != null
                      ? m.assessmentScorePct >= 70
                        ? 'admin-score-high'
                        : m.assessmentScorePct >= 50
                          ? 'admin-score-mid'
                          : 'admin-score-low'
                      : ''
                  }>
                    {m.assessmentScorePct != null ? `${m.assessmentScorePct}%` : '—'}
                  </span>
                </td>
                <td>{m.assessmentCompleted ? `${m.coursesCompleted.length}/${m.totalCourses}` : '—'}</td>
                <td className="members-col-md">{lastActive}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="admin-empty-state">
          <h3>{members.length === 0 ? 'No members yet' : 'No matches'}</h3>
          <p>
            {members.length === 0
              ? 'Add your first member to get started.'
              : 'Try adjusting your search or program filter.'}
          </p>
          {members.length === 0 && (
            <a href="/admin/members/new" className="btn btn-primary">Add Member</a>
          )}
        </div>
      )}
    </div>
  );
}
