'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { formatPhone } from '@/lib/formatPhone';
import type { HealthStatus } from '@/lib/admin/healthScore';

function formatMemberDate(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  profile: { profilePhone?: string | null } | null;
  enrolledProgram: string | null;
  enrolledAt: Date | string | null;
  assessmentScorePct: number | null;
  assessmentCompleted: boolean | null;
  updatedAt: Date | string;
  programTitle: string | null | undefined;
  coursesCompleted: string[];
  totalCourses: number;
  liveTraining: {
    percent: number;
    coursesCompleted: number;
    coursesActive: number;
    totalCourses: number;
    lastUpdatedAt: Date | string;
  } | null;
  partnerName: string | null;
  partnerId: string | null;
  fitScore?: number;
  healthStatus?: HealthStatus;
};

type MembersTableProps = { members: Member[] };

function FitScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? '#16a34a' : score >= 5 ? '#d97706' : '#dc2626';
  const bg = score >= 8 ? '#f0fdf4' : score >= 5 ? '#fffbeb' : '#fef2f2';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, color, background: bg, border: `1px solid ${color}20` }}>{score}/10</span>;
}

function HealthDot({ status }: { status: HealthStatus }) {
  const color = status === 'green' ? '#16a34a' : status === 'yellow' ? '#d97706' : '#dc2626';
  const label = status === 'green' ? 'Active' : status === 'yellow' ? 'At Risk' : 'Inactive';
  return <span title={label} style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: color, marginRight: '0.35rem', verticalAlign: 'middle' }} />;
}

function formatTraining(m: Member): string {
  if (m.liveTraining) {
    const active = m.liveTraining.coursesActive > 0 ? ` · ${m.liveTraining.coursesActive} active` : '';
    return `${m.liveTraining.percent}% overall · ${m.liveTraining.coursesCompleted}/${m.liveTraining.totalCourses} done${active}`;
  }
  if (m.assessmentCompleted) return `${m.coursesCompleted.length}/${m.totalCourses}`;
  return '—';
}

export default function MembersTable({ members }: MembersTableProps) {
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !search || m.fullName?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    const matchProgram = !programFilter || m.enrolledProgram === programFilter;
    const matchPartner = !partnerFilter || (partnerFilter === '__none' ? !m.partnerId : m.partnerId === partnerFilter);
    const matchHealth = !healthFilter || m.healthStatus === healthFilter;
    return matchSearch && matchProgram && matchPartner && matchHealth;
  });

  const programs = [...new Set(members.map((m) => m.enrolledProgram).filter(Boolean))] as string[];
  const partnerOptions = [...new Map(members.filter((m) => m.partnerId).map((m) => [m.partnerId!, m.partnerName!])).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '0.5rem', width: '220px' }} />
        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} style={{ padding: '0.5rem', width: '200px' }}><option value="">All programs</option>{programs.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        <select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} style={{ padding: '0.5rem', width: '220px' }}><option value="">All partners</option><option value="__none">No partner</option>{partnerOptions.map(([pid, pname]) => <option key={pid} value={pid}>{pname}</option>)}</select>
        <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)} style={{ padding: '0.5rem', width: '140px' }}><option value="">All health</option><option value="green">Active</option><option value="yellow">At Risk</option><option value="red">Inactive</option></select>
      </div>

      <div className="admin-table-scroll admin-members-desktop">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th className="members-col-md">Phone</th><th>Program</th><th>Partner</th><th>Fit</th><th>Health</th><th>Enrolled</th><th>Score %</th><th>Training</th><th className="members-col-md">Last Active</th><th>Session</th></tr></thead>
          <tbody>{filtered.map((m) => {
            const rawPhone = m.profile?.profilePhone ?? m.phone;
            const phoneDisplay = formatPhone(rawPhone);
            const lastActive = formatMemberDate(m.updatedAt) ?? '—';
            return (<tr key={m.id} data-clickable onClick={() => window.location.assign(`/admin/members/${m.id}`)}>
              <td><Link href={`/admin/members/${m.id}`} onClick={(e) => e.stopPropagation()}>{m.healthStatus && <HealthDot status={m.healthStatus} />}{m.fullName}</Link><div className="members-name-details">{rawPhone ? <><span>{phoneDisplay}</span><span className="members-name-details-sep"> · </span></> : null}<span>Last active {lastActive}</span></div></td>
              <td>{m.email}</td><td className="members-col-md">{phoneDisplay}</td><td>{m.programTitle ?? '—'}</td><td>{m.partnerName ?? '—'}</td><td>{m.fitScore != null ? <FitScoreBadge score={m.fitScore} /> : '—'}</td><td>{m.healthStatus ? <span style={{ fontSize: '0.8rem', fontWeight: 600, color: m.healthStatus === 'green' ? '#16a34a' : m.healthStatus === 'yellow' ? '#d97706' : '#dc2626' }}>{m.healthStatus === 'green' ? 'Active' : m.healthStatus === 'yellow' ? 'At Risk' : 'Inactive'}</span> : '—'}</td><td>{formatMemberDate(m.enrolledAt) ?? '—'}</td><td><span className={m.assessmentScorePct != null ? m.assessmentScorePct >= 70 ? 'admin-score-high' : m.assessmentScorePct >= 50 ? 'admin-score-mid' : 'admin-score-low' : ''}>{m.assessmentScorePct != null ? `${m.assessmentScorePct}%` : '—'}</span></td><td>{formatTraining(m)}</td><td className="members-col-md">{lastActive}</td>
              <td>
                <Link
                  href={`/counselor/sessions/${m.id}/run`}
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                >
                  Start session
                </Link>
              </td></tr>);
          })}</tbody>
        </table>
      </div>

      <ul className="admin-portal-card-list admin-members-cards" aria-label="Members (mobile layout)">
        {filtered.map((m) => {
          const rawPhone = m.profile?.profilePhone ?? m.phone;
          const phoneDisplay = formatPhone(rawPhone);
          const lastActive = formatMemberDate(m.updatedAt) ?? '—';
          return (<li key={m.id} className="admin-portal-card" style={{ cursor: 'pointer' }} onClick={() => window.location.assign(`/admin/members/${m.id}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.location.assign(`/admin/members/${m.id}`); }} aria-label={`View details for ${m.fullName}`}>
            <div className="admin-portal-card__header"><Link href={`/admin/members/${m.id}`} style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{m.healthStatus && <HealthDot status={m.healthStatus} />}{m.fullName}</Link>{m.healthStatus ? <span className="admin-portal-card__badge" style={{ background: m.healthStatus === 'green' ? 'rgba(22,163,74,0.12)' : m.healthStatus === 'yellow' ? 'rgba(217,119,6,0.12)' : 'rgba(220,38,38,0.12)', color: m.healthStatus === 'green' ? '#166534' : m.healthStatus === 'yellow' ? '#b45309' : '#991b1b' }}>{m.healthStatus === 'green' ? 'Active' : m.healthStatus === 'yellow' ? 'At Risk' : 'Inactive'}</span> : null}</div>
            <p className="admin-portal-card__meta">{m.email}</p>
            {rawPhone ? <p className="admin-portal-card__meta">{phoneDisplay}</p> : null}
            <p className="admin-portal-card__row"><span className="admin-portal-card__label">Program</span> {m.programTitle ?? '—'}</p>
            <p className="admin-portal-card__row"><span className="admin-portal-card__label">Partner</span> {m.partnerName ?? '—'}</p>
            <p className="admin-portal-card__row"><span className="admin-portal-card__label">Fit</span> {m.fitScore != null ? <FitScoreBadge score={m.fitScore} /> : '—'}</p>
            <p className="admin-portal-card__row"><span className="admin-portal-card__label">Training</span> {formatTraining(m)}</p>
            <p className="admin-portal-card__meta">Last active {lastActive}</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <Link
                href={`/counselor/sessions/${m.id}/run`}
                onClick={(e) => e.stopPropagation()}
                className="btn btn-sm btn-outline"
                style={{ fontSize: '0.75rem', flex: 1, textAlign: 'center' }}
              >
                Start session
              </Link>
            </div>
          </li>);
        })}
      </ul>

      {filtered.length === 0 && <div className="admin-empty-state"><h3>{members.length === 0 ? 'No members yet' : 'No matches'}</h3><p>{members.length === 0 ? 'Add your first member to get started.' : 'Try adjusting your search or filters.'}</p>{members.length === 0 && <a href="/admin/members/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={16} /> Add Member</a>}</div>}
    </div>
  );
}
