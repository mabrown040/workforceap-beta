'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

function exportMembersCsv(rows: Member[]) {
  const headers = ['Name', 'Email', 'Phone', 'Program', 'Enrolled', 'Score %', 'Training', 'Last Active'];
  const csvRows = rows.map((m) => [
    m.fullName,
    m.email,
    formatPhone(m.profile?.profilePhone ?? m.phone),
    m.programTitle ?? '',
    m.enrolledAt?.toLocaleDateString() ?? '',
    m.assessmentScorePct != null ? String(m.assessmentScorePct) : '',
    m.assessmentCompleted ? `${m.coursesCompleted.length}/${m.totalCourses}` : '',
    m.updatedAt.toLocaleDateString(),
  ]);
  const csv = [headers.join(','), ...csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MembersTable({ members }: MembersTableProps) {
  const searchParams = useSearchParams();
  const programFromUrl = searchParams.get('program')?.trim() ?? '';

  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');

  useEffect(() => {
    if (programFromUrl) {
      setProgramFilter(programFromUrl);
    }
  }, [programFromUrl]);

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        const matchSearch =
          !search ||
          m.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          m.email?.toLowerCase().includes(search.toLowerCase());
        const matchProgram = !programFilter || m.enrolledProgram === programFilter;
        return matchSearch && matchProgram;
      }),
    [members, search, programFilter],
  );

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (filtered.some((m) => m.id === id)) next.add(id);
      }
      return next;
    });
  }, [filtered]);

  const programs = [...new Set(members.map((m) => m.enrolledProgram).filter(Boolean))] as string[];

  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));
  const someSelected = selected.size > 0;

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const m of filtered) next.delete(m.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const m of filtered) next.add(m.id);
        return next;
      });
    }
  };

  const selectedMembers = useMemo(() => members.filter((m) => selected.has(m.id)), [members, selected]);

  const runBulkAction = (action: string) => {
    if (selected.size === 0 || !action) return;
    if (action === 'export') {
      exportMembersCsv(selectedMembers);
    } else if (action === 'status') {
      const first = selectedMembers[0];
      if (first) window.location.assign(`/admin/members/${first.id}`);
    } else if (action === 'message') {
      const emails = selectedMembers.map((m) => m.email).filter(Boolean);
      if (emails.length) window.location.href = `mailto:${emails.map((e) => encodeURIComponent(e)).join(',')}`;
    }
    setBulkAction('');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search members"
          style={{ padding: '0.5rem', width: '220px' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <span>Filter by program</span>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            style={{ padding: '0.5rem', width: '200px' }}
          >
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        <span style={{ fontSize: '0.9rem', color: 'var(--color-gray-700)', minWidth: '7rem' }}>
          {someSelected ? `${selected.size} selected` : '0 selected'}
        </span>
        <label htmlFor="members-bulk-actions" className="sr-only">
          Bulk actions
        </label>
        <select
          id="members-bulk-actions"
          value={bulkAction}
          disabled={!someSelected}
          onChange={(e) => {
            const v = e.target.value;
            setBulkAction('');
            if (v) runBulkAction(v);
          }}
          style={{ padding: '0.45rem 0.6rem', minWidth: '180px', opacity: someSelected ? 1 : 0.6 }}
        >
          <option value="">Bulk actions</option>
          <option value="export">Export selected</option>
          <option value="status">Change status</option>
          <option value="message">Send message</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '2.5rem' }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allFilteredSelected;
                  }}
                  onChange={toggleSelectAll}
                  aria-label="Select all members in this list"
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Program</th>
              <th>Enrolled</th>
              <th>Score %</th>
              <th>Training</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr
                key={m.id}
                data-clickable
                onClick={() => window.location.assign(`/admin/members/${m.id}`)}
              >
                <td
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggleRow(m.id)}
                    aria-label={`Select ${m.fullName}`}
                  />
                </td>
                <td>
                  <Link href={`/admin/members/${m.id}`} onClick={(e) => e.stopPropagation()}>
                    {m.fullName}
                  </Link>
                </td>
                <td>{m.email}</td>
                <td>{formatPhone(m.profile?.profilePhone ?? m.phone)}</td>
                <td>{m.programTitle ?? '—'}</td>
                <td>{m.enrolledAt?.toLocaleDateString() ?? '—'}</td>
                <td>
                  <span
                    className={
                      m.assessmentScorePct != null
                        ? m.assessmentScorePct >= 70
                          ? 'admin-score-high'
                          : m.assessmentScorePct >= 50
                            ? 'admin-score-mid'
                            : 'admin-score-low'
                        : ''
                    }
                  >
                    {m.assessmentScorePct != null ? `${m.assessmentScorePct}%` : '—'}
                  </span>
                </td>
                <td>{m.assessmentCompleted ? `${m.coursesCompleted.length}/${m.totalCourses}` : '—'}</td>
                <td>{m.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
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
            <a href="/admin/members/new" className="btn btn-primary">
              Add Member
            </a>
          )}
        </div>
      )}
    </div>
  );
}
