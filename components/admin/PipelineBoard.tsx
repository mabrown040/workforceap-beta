'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getPipelineStage,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_COLORS,
  PIPELINE_STAGES_ORDERED,
  type PipelineStage,
  type PipelineStudent,
} from '@/lib/pipeline/stage';

/** JSON-serializable pipeline row from the server */
export type PipelineStudentPayload = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  enrolledProgram: string | null;
  enrolledAt: string | null;
  assessmentCompleted: boolean;
  coursesCompleted: unknown;
  deletedAt: string | null;
  createdAt: string;
  placementRecord: {
    employerName: string;
    jobTitle: string;
    salaryOffered: number | null;
    placedAt: string;
  } | null;
  userCertifications: { certName: string; earnedAt: string }[];
  applications: { status: string; submittedAt: string | null }[];
};

function toPipelineStudent(p: PipelineStudentPayload): PipelineStudent {
  return {
    id: p.id,
    fullName: p.fullName,
    email: p.email,
    enrolledProgram: p.enrolledProgram,
    enrolledAt: p.enrolledAt ? new Date(p.enrolledAt) : null,
    assessmentCompleted: p.assessmentCompleted,
    coursesCompleted: p.coursesCompleted,
    deletedAt: p.deletedAt ? new Date(p.deletedAt) : null,
    placementRecord: p.placementRecord
      ? {
          employerName: p.placementRecord.employerName,
          jobTitle: p.placementRecord.jobTitle,
          salaryOffered: p.placementRecord.salaryOffered,
          placedAt: new Date(p.placementRecord.placedAt),
        }
      : null,
    userCertifications: p.userCertifications.map((c) => ({
      certName: c.certName,
      earnedAt: new Date(c.earnedAt),
    })),
    applications: p.applications.map((a) => ({
      status: a.status,
      submittedAt: a.submittedAt ? new Date(a.submittedAt) : null,
    })),
  };
}

function phoneDigits(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '');
}

type PipelineBoardProps = {
  students: PipelineStudentPayload[];
};

export default function PipelineBoard({ students }: PipelineBoardProps) {
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');
  const [enrolledFrom, setEnrolledFrom] = useState('');
  const [enrolledTo, setEnrolledTo] = useState('');

  const programOptions = useMemo(() => {
    const slugs = new Set<string>();
    for (const s of students) {
      if (s.enrolledProgram) slugs.add(s.enrolledProgram);
    }
    return [...slugs].sort();
  }, [students]);

  const filteredPayloads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const fromTs = enrolledFrom ? new Date(enrolledFrom).setHours(0, 0, 0, 0) : null;
    const toTs = enrolledTo ? new Date(enrolledTo).setHours(23, 59, 59, 999) : null;

    return students.filter((p) => {
      const s = toPipelineStudent(p);
      const stage = getPipelineStage(s);

      if (stageFilter && stage !== stageFilter) return false;
      if (programFilter && p.enrolledProgram !== programFilter) return false;

      if (fromTs != null || toTs != null) {
        const t = p.enrolledAt ? new Date(p.enrolledAt).getTime() : NaN;
        if (Number.isNaN(t)) return false;
        if (fromTs != null && t < fromTs) return false;
        if (toTs != null && t > toTs) return false;
      }

      if (!q) return true;
      const name = (p.fullName ?? '').toLowerCase();
      const email = (p.email ?? '').toLowerCase();
      const phone = phoneDigits(p.phone);
      const matchText = name.includes(q) || email.includes(q);
      const matchPhone = qDigits.length >= 3 && phone.includes(qDigits);
      return matchText || matchPhone;
    });
  }, [students, search, programFilter, stageFilter, enrolledFrom, enrolledTo]);

  const byStage = useMemo(() => {
    const out: Record<PipelineStage, PipelineStudentPayload[]> = {
      applied: [],
      enrolled: [],
      in_training: [],
      certified: [],
      job_searching: [],
      placed: [],
      closed: [],
    };
    for (const p of filteredPayloads) {
      const stage = getPipelineStage(toPipelineStudent(p));
      out[stage].push(p);
    }
    return out;
  }, [filteredPayloads]);

  const totalActive = filteredPayloads.filter((s) => !s.deletedAt).length;
  const totalPlaced = byStage.placed.length;
  const placedWithSalary = byStage.placed.filter((s) => s.placementRecord?.salaryOffered);
  const avgSalary =
    placedWithSalary.length > 0
      ? Math.round(
          placedWithSalary.reduce((sum, s) => sum + (s.placementRecord?.salaryOffered ?? 0), 0) /
            placedWithSalary.length,
        )
      : null;

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'var(--color-gray-50)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Search and filter pipeline</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
            Search
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or phone"
              aria-label="Search pipeline by name, email, or phone"
              style={{ padding: '0.45rem 0.6rem', minWidth: '220px' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
            Filter by program
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', minWidth: '160px' }}
            >
              <option value="">All programs</option>
              {programOptions.map((slug) => (
                <option key={slug} value={slug}>
                  {slug.replace(/-/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
            Filter by status
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter((e.target.value as PipelineStage | '') || '')}
              style={{ padding: '0.45rem 0.6rem', minWidth: '160px' }}
            >
              <option value="">All statuses</option>
              {PIPELINE_STAGES_ORDERED.map((st) => (
                <option key={st} value={st}>
                  {PIPELINE_STAGE_LABELS[st]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
            Enrolled from
            <input
              type="date"
              value={enrolledFrom}
              onChange={(e) => setEnrolledFrom(e.target.value)}
              style={{ padding: '0.45rem 0.6rem' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
            Enrolled to
            <input
              type="date"
              value={enrolledTo}
              onChange={(e) => setEnrolledTo(e.target.value)}
              style={{ padding: '0.45rem 0.6rem' }}
            />
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Active', value: totalActive },
          { label: 'Placed', value: totalPlaced },
          {
            label: 'Placement Rate',
            value: totalActive > 0 ? `${Math.round((totalPlaced / totalActive) * 100)}%` : '—',
          },
          { label: 'Avg Salary', value: avgSalary ? `$${avgSalary.toLocaleString()}` : '—' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '1rem 1.5rem',
              background: 'var(--color-gray-50)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              minWidth: '120px',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1rem',
          overflowX: 'auto',
        }}
      >
        {PIPELINE_STAGES_ORDERED.map((stage) => {
          const stageStudents = byStage[stage];
          const color = PIPELINE_STAGE_COLORS[stage];
          return (
            <div key={stage} style={{ minWidth: '160px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color }}>{PIPELINE_STAGE_LABELS[stage]}</span>
                <span
                  style={{
                    background: color,
                    color: 'white',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    padding: '0.1rem 0.5rem',
                    fontWeight: 700,
                  }}
                >
                  {stageStudents.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stageStudents.slice(0, 10).map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/members/${s.id}`}
                    style={{
                      display: 'block',
                      padding: '0.6rem 0.75rem',
                      border: `1px solid ${color}22`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: '6px',
                      textDecoration: 'none',
                      color: 'inherit',
                      background: 'white',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.fullName}
                    </div>
                    {s.enrolledProgram && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-gray-500)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '0.15rem',
                        }}
                      >
                        {s.enrolledProgram.replace(/-/g, ' ')}
                      </div>
                    )}
                    {stage === 'placed' && s.placementRecord && (
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.15rem' }}>
                        {s.placementRecord.employerName}
                      </div>
                    )}
                  </Link>
                ))}
                {stageStudents.length > 10 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', textAlign: 'center', padding: '0.25rem' }}>
                    +{stageStudents.length - 10} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
