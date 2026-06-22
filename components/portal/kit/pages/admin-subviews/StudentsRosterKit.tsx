'use client';

import { useState } from 'react';
import {
  DesignSurface,
  SectionHeader,
  DataTable,
  Avatar,
  StatusTag,
  ProgressBar,
  colorVar,
  type Column,
  type KitColor,
  type KitTone,
} from '@/components/portal/kit';

/**
 * Students roster — the consolidated members workspace with saved-view filter
 * chips (dense). Mockup: workforceap-admin-suite.html "Students" view.
 * Target route: /admin/students
 *
 * Interactive (filter chips toggle the visible rows) → needs 'use client'.
 * Uses DataTable mobile="cards" so the wide roster stacks cleanly on mobile
 * (the mockup calls out "wide table → stacked cards on mobile, no squish").
 */
export type StudentStatus = 'Job-Ready' | 'At Risk' | 'In Training' | 'Interviewing' | 'Placed';

export interface StudentRow {
  id: string;
  name: string;
  initials?: string;
  location: string;
  program: string;
  /** 0–100 course progress. */
  progress: number;
  /** Readiness score, 0–100. */
  readiness: number;
  counselor: string;
  status: StudentStatus;
  /** Last-active caption, e.g. "2h ago". */
  lastActive: string;
}

/** Filter chips. "All" is special-cased to show everything. */
export type StudentFilter = 'All' | 'Job-Ready' | 'At Risk' | 'In Training';

export interface StudentsRosterKitProps {
  students?: StudentRow[];
  /** Total roster size for the "Showing N of TOTAL" footer + All chip count. */
  total?: number;
}

const DEFAULT_STUDENTS: StudentRow[] = [
  {
    id: 'mb',
    name: 'Mike Brown',
    initials: 'MB',
    location: 'Austin, TX',
    program: 'Cloud & IT',
    progress: 78,
    readiness: 84,
    counselor: 'S. Chen',
    status: 'Job-Ready',
    lastActive: '2h ago',
  },
  {
    id: 'jd',
    name: 'Jasmine Davis',
    initials: 'JD',
    location: 'Austin, TX',
    program: 'Healthcare',
    progress: 92,
    readiness: 91,
    counselor: 'R. Patel',
    status: 'Placed',
    lastActive: '1d ago',
  },
  {
    id: 'ct',
    name: 'Carlos Torres',
    initials: 'CT',
    location: 'Round Rock, TX',
    program: 'Skilled Trades',
    progress: 34,
    readiness: 41,
    counselor: 'S. Chen',
    status: 'At Risk',
    lastActive: '16d ago',
  },
  {
    id: 'aw',
    name: 'Aisha Williams',
    initials: 'AW',
    location: 'Austin, TX',
    program: 'Data & AI',
    progress: 88,
    readiness: 79,
    counselor: 'R. Patel',
    status: 'Interviewing',
    lastActive: '5h ago',
  },
];

const FILTERS: StudentFilter[] = ['All', 'Job-Ready', 'At Risk', 'In Training'];

const STATUS_TONE: Record<StudentStatus, KitTone> = {
  'Job-Ready': 'warn',
  Placed: 'ok',
  'At Risk': 'alert',
  Interviewing: 'info',
  'In Training': 'muted',
};

/** A student matches "In Training" if they are not yet job-ready/placed/interviewing. */
function matchesFilter(student: StudentRow, filter: StudentFilter): boolean {
  if (filter === 'All') return true;
  if (filter === 'In Training') {
    return student.status === 'In Training' || student.status === 'At Risk';
  }
  return student.status === filter;
}

function readinessColor(score: number): KitColor {
  if (score >= 70) return 'success';
  if (score >= 50) return 'gold';
  return 'accent';
}

/** Readiness score as a CSS var string (success ≥70, gold ≥50, else crimson). */
function readinessVar(score: number): string {
  return colorVar(readinessColor(score));
}

export function StudentsRosterKit({
  students = DEFAULT_STUDENTS,
  total = 847,
}: StudentsRosterKitProps) {
  const [active, setActive] = useState<StudentFilter>('All');

  const counts: Record<StudentFilter, number> = {
    All: total,
    'Job-Ready': students.filter((s) => matchesFilter(s, 'Job-Ready')).length,
    'At Risk': students.filter((s) => s.status === 'At Risk').length,
    'In Training': students.filter((s) => matchesFilter(s, 'In Training')).length,
  };

  const visible = students.filter((s) => matchesFilter(s, active));

  const StudentCell = ({ row }: { row: StudentRow }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Avatar initials={row.initials ?? row.name.slice(0, 2).toUpperCase()} size={32} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--wa-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.location}
        </div>
      </div>
    </div>
  );

  const ProgressCell = ({ row }: { row: StudentRow }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 72 }}>
        <ProgressBar
          pct={row.progress}
          color={row.status === 'At Risk' ? 'accent' : 'success'}
          aria-label={`${row.name} progress ${row.progress}%`}
        />
      </div>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: 'var(--wa-muted)' }}>
        {row.progress}%
      </span>
    </div>
  );

  const columns: Column<StudentRow>[] = [
    { key: 'name', header: 'Student', render: (row) => <StudentCell row={row} /> },
    { key: 'program', header: 'Program', render: (row) => (
        <span style={{ color: 'var(--wa-muted)' }}>{row.program}</span>
      ) },
    { key: 'progress', header: 'Progress', render: (row) => <ProgressCell row={row} /> },
    {
      key: 'readiness',
      header: 'Readiness',
      render: (row) => (
        <span
          style={{
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            color: readinessVar(row.readiness),
          }}
        >
          {row.readiness}
        </span>
      ),
    },
    { key: 'counselor', header: 'Counselor', render: (row) => (
        <span style={{ color: 'var(--wa-muted)' }}>{row.counselor}</span>
      ) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusTag tone={STATUS_TONE[row.status]}>{row.status}</StatusTag>,
    },
    {
      key: 'lastActive',
      header: 'Last active',
      align: 'right',
      render: (row) => (
        <span style={{ color: row.status === 'At Risk' ? 'var(--wa-accent)' : 'var(--wa-muted)', fontWeight: row.status === 'At Risk' ? 700 : 400 }}>
          {row.lastActive}
        </span>
      ),
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader title="Students" kicker="People" goal="Find and act on any student." />

      {/* Saved-view filter chips */}
      <div className="wa-flex wa-flex-wrap wa-items-center wa-gap-2 wa-mb-5" role="group" aria-label="Roster filters">
        {FILTERS.map((f) => {
          const on = active === f;
          const isRisk = f === 'At Risk';
          return (
            <button
              key={f}
              type="button"
              onClick={() => setActive(f)}
              aria-pressed={on}
              className="wa-kit-focus"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: on ? 'transparent' : isRisk ? '#f3d4dc' : 'var(--wa-border)',
                background: on ? 'var(--wa-accent)' : 'var(--wa-surface)',
                color: on ? '#fff' : isRisk ? 'var(--wa-accent)' : 'var(--wa-text)',
              }}
            >
              {f}
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  opacity: on ? 0.85 : 0.6,
                  color: on ? '#fff' : isRisk ? 'var(--wa-accent)' : 'var(--wa-muted)',
                }}
              >
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      <DataTable<StudentRow>
        columns={columns}
        rows={visible}
        rowKey={(row) => row.id}
        minWidth={760}
        mobile="cards"
        cardRender={(row) => (
          <div className="wa-kit-card wa-kit-card--sm">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <StudentCell row={row} />
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={STATUS_TONE[row.status]}>{row.status}</StatusTag>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'var(--wa-muted)', margin: '12px 0 4px' }}>
              <span style={{ minWidth: 0 }}>{row.program} · {row.counselor}</span>
              <span style={{ whiteSpace: 'nowrap' }}>
                Readiness{' '}
                <b
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: readinessVar(row.readiness),
                  }}
                >
                  {row.readiness}
                </b>
              </span>
            </div>
            <ProgressBar
              pct={row.progress}
              color={row.status === 'At Risk' ? 'accent' : 'success'}
              aria-label={`${row.name} progress ${row.progress}%`}
            />
            <div style={{ fontSize: 10, color: 'var(--wa-muted)', marginTop: 6 }}>
              {row.progress}% complete · last active {row.lastActive}
            </div>
          </div>
        )}
        emptyTitle="No students match this view"
        emptyDescription="Try a different filter."
      />

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--wa-muted)', marginTop: 16 }}>
        Showing {visible.length} of {total}
      </p>
    </DesignSurface>
  );
}
