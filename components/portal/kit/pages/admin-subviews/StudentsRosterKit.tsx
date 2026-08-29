'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@astryxdesign/core/Card';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Token, type TokenColor } from '@astryxdesign/core/Token';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import {
  DesignSurface,
  SectionHeader,
  DataTable,
  Avatar,
  colorVar,
  type Column,
  type KitColor,
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
  /** Latest Coursera course grade 0–100; null when unknown. */
  courseraGrade?: number | null;
  /** False when the row is a Coursera identity with no WAP member. */
  inWap?: boolean;
  /** Linked member with Coursera progress but no assigned WAP program. */
  noProgram?: boolean;
  /** Override the default `/admin/members/:id` row click. */
  href?: string;
}

/** Filter chips. "All" is special-cased to show everything. */
export type StudentFilter = 'All' | 'Job-Ready' | 'At Risk' | 'In Training' | 'Unmatched';

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

const FILTERS: StudentFilter[] = ['All', 'Job-Ready', 'At Risk', 'In Training', 'Unmatched'];

/** Maps the kit's semantic tone vocabulary to a real Token color. */
const STATUS_TOKEN_COLOR: Record<StudentStatus, TokenColor> = {
  'Job-Ready': 'orange',
  Placed: 'green',
  'At Risk': 'pink',
  Interviewing: 'blue',
  'In Training': 'gray',
};

function matchesFilter(student: StudentRow, filter: StudentFilter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Unmatched') return student.inWap === false;
  if (student.inWap === false) return false;
  return student.status === filter;
}

function formatRosterGrade(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '—';
  const rounded = Math.round(pct * 100) / 100;
  return `${String(rounded)}%`;
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
  const router = useRouter();
  const [active, setActive] = useState<StudentFilter>('All');

  const counts: Record<StudentFilter, number> = {
    All: total,
    'Job-Ready': students.filter((s) => matchesFilter(s, 'Job-Ready')).length,
    'At Risk': students.filter((s) => s.status === 'At Risk' && s.inWap !== false).length,
    'In Training': students.filter((s) => s.status === 'In Training' && s.inWap !== false).length,
    Unmatched: students.filter((s) => s.inWap === false).length,
  };

  const visible = students.filter((s) => matchesFilter(s, active));

  const StudentCell = ({ row }: { row: StudentRow }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Avatar initials={row.initials ?? row.name.slice(0, 2).toUpperCase()} size={32} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
          {row.inWap === false ? <Token label="Unmatched" size="sm" color="pink" /> : null}
          {row.inWap !== false && row.noProgram ? <Token label="No program" size="sm" color="yellow" /> : null}
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
          value={row.progress}
          label={`${row.name} progress`}
          isLabelHidden
          variant={row.status === 'At Risk' ? 'accent' : 'success'}
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
      key: 'courseraGrade',
      header: 'Coursera grade',
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
          {formatRosterGrade(row.courseraGrade)}
        </span>
      ),
    },
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
      render: (row) => <Token label={row.status} size="sm" color={STATUS_TOKEN_COLOR[row.status]} />,
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
      <div className="wa-mb-5">
        <SegmentedControl
          value={active}
          onChange={(v) => setActive(v as StudentFilter)}
          label="Roster filters"
          size="sm"
          layout="hug"
        >
          {FILTERS.map((f) => (
            <SegmentedControlItem key={f} value={f} label={`${f} · ${counts[f]}`} />
          ))}
        </SegmentedControl>
      </div>

      <DataTable<StudentRow>
        columns={columns}
        rows={visible}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(row.href ?? `/admin/members/${row.id}`)}
        minWidth={760}
        mobile="cards"
        cardRender={(row) => (
          <Card padding={3}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <StudentCell row={row} />
              </div>
              <div style={{ flexShrink: 0 }}>
                <Token label={row.status} size="sm" color={STATUS_TOKEN_COLOR[row.status]} />
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
              value={row.progress}
              label={`${row.name} progress`}
              isLabelHidden
              variant={row.status === 'At Risk' ? 'accent' : 'success'}
            />
            <div style={{ fontSize: 10, color: 'var(--wa-muted)', marginTop: 6 }}>
              {row.progress}% complete · Coursera grade {formatRosterGrade(row.courseraGrade)} · last active {row.lastActive}
            </div>
          </Card>
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
