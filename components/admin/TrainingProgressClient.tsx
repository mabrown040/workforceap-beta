'use client';

import { useMemo, useState } from 'react';
import DataTable, { type DataTableColumn } from '@/components/portal/ui/DataTable';
import StatusBadge from '@/components/portal/StatusBadge';

export type CurriculumRow = {
  key: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  learnerRole: string;
  programSlug: string;
  programTitle: string;
  courseSlug: string;
  courseName: string;
  courseraCourseId: string | null;
  status: string;
  percentComplete: number;
  lastActivityAt: string | null;
  lastUpdatedAt: string | null;
};

export type RawCourseraRow = {
  key: string;
  learnerId: string | null;
  learnerName: string | null;
  learnerEmail: string;
  learnerRole: string | null;
  courseraCourseId: string;
  courseraCourseSlug: string | null;
  courseName: string;
  university: string | null;
  courseraProgramSlug: string;
  courseraProgramName: string | null;
  mappedProgramSlug: string | null;
  mappedCourseSlug: string | null;
  percentComplete: number;
  learningHours: number;
  isCompleted: boolean;
  enrollmentTime: string | null;
  lastActivityTime: string | null;
  completionTime: string | null;
};

type View = 'curriculum' | 'raw';
type SortDir = 'asc' | 'desc';

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

function compare(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

const STATUS_VARIANT: Record<string, 'success' | 'accent' | 'neutral'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'accent',
  NOT_STARTED: 'neutral',
};
const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in progress',
  NOT_STARTED: 'not started',
};

function SortLabel({
  label,
  active,
  dir,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
}) {
  return (
    <span style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label}
      {active && <span style={{ marginLeft: 4 }}>{dir === 'asc' ? '▲' : '▼'}</span>}
    </span>
  );
}

export default function TrainingProgressClient({
  curriculumRows,
  rawRows,
}: {
  curriculumRows: CurriculumRow[];
  rawRows: RawCourseraRow[];
}) {
  const [view, setView] = useState<View>('curriculum');
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<string>('learnerName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredCurriculum = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let rows = curriculumRows;
    if (q) {
      rows = rows.filter(
        (r) =>
          r.learnerName.toLowerCase().includes(q) ||
          r.learnerEmail.toLowerCase().includes(q) ||
          r.programTitle.toLowerCase().includes(q) ||
          r.courseName.toLowerCase().includes(q),
      );
    }
    return [...rows].sort((a, b) => {
      const v = compare(a[sortKey as keyof CurriculumRow], b[sortKey as keyof CurriculumRow]);
      return sortDir === 'asc' ? v : -v;
    });
  }, [curriculumRows, filter, sortKey, sortDir]);

  const filteredRaw = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let rows = rawRows;
    if (q) {
      rows = rows.filter(
        (r) =>
          (r.learnerName ?? '').toLowerCase().includes(q) ||
          r.learnerEmail.toLowerCase().includes(q) ||
          r.courseName.toLowerCase().includes(q) ||
          (r.courseraCourseSlug ?? '').toLowerCase().includes(q) ||
          (r.courseraProgramName ?? '').toLowerCase().includes(q),
      );
    }
    return [...rows].sort((a, b) => {
      const v = compare(a[sortKey as keyof RawCourseraRow], b[sortKey as keyof RawCourseraRow]);
      return sortDir === 'asc' ? v : -v;
    });
  }, [rawRows, filter, sortKey, sortDir]);

  const sortHeader = (label: string, key: string) => (
    <span onClick={() => handleSort(key)}>
      <SortLabel label={label} active={sortKey === key} dir={sortDir} />
    </span>
  );

  const learnerCell = (name: string | null, role: string | null) => (
    <>
      <strong>{name || '—'}</strong>
      {role && role !== 'member' && (
        <StatusBadge label={role} variant="info" className="wa-ml-1" />
      )}
    </>
  );

  const curriculumColumns: DataTableColumn<CurriculumRow>[] = [
    {
      key: 'learnerName',
      header: sortHeader('Learner', 'learnerName'),
      cell: (r) => learnerCell(r.learnerName, r.learnerRole),
    },
    {
      key: 'learnerEmail',
      header: sortHeader('Email', 'learnerEmail'),
      cell: (r) => r.learnerEmail,
      hideOnMobile: true,
    },
    {
      key: 'programTitle',
      header: sortHeader('Program', 'programTitle'),
      cell: (r) => r.programTitle,
      hideOnMobile: true,
    },
    {
      key: 'courseName',
      header: sortHeader('Course', 'courseName'),
      cell: (r) => (
        <>
          {r.courseName}
          {r.courseraCourseId && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>
              {r.courseraCourseId}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'percentComplete',
      header: sortHeader('Progress', 'percentComplete'),
      cell: (r) => `${r.percentComplete}%`,
      align: 'right',
    },
    {
      key: 'status',
      header: sortHeader('Status', 'status'),
      cell: (r) => (
        <StatusBadge
          label={STATUS_LABEL[r.status] ?? r.status.toLowerCase()}
          variant={STATUS_VARIANT[r.status] ?? 'neutral'}
        />
      ),
    },
    {
      key: 'lastActivityAt',
      header: sortHeader('Last activity', 'lastActivityAt'),
      cell: (r) => fmtDate(r.lastActivityAt),
      hideOnMobile: true,
    },
    {
      key: 'lastUpdatedAt',
      header: sortHeader('Last updated', 'lastUpdatedAt'),
      cell: (r) => fmtDate(r.lastUpdatedAt),
      hideOnMobile: true,
    },
  ];

  const rawColumns: DataTableColumn<RawCourseraRow>[] = [
    {
      key: 'learnerName',
      header: sortHeader('Learner', 'learnerName'),
      cell: (r) => learnerCell(r.learnerName ?? '(unmapped user)', r.learnerRole),
    },
    {
      key: 'learnerEmail',
      header: sortHeader('Email', 'learnerEmail'),
      cell: (r) => r.learnerEmail,
      hideOnMobile: true,
    },
    {
      key: 'courseraProgramName',
      header: sortHeader('Coursera program', 'courseraProgramName'),
      cell: (r) => (
        <>
          {r.courseraProgramName ?? r.courseraProgramSlug}
          {r.courseraProgramSlug && r.courseraProgramName && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>
              {r.courseraProgramSlug}
            </div>
          )}
        </>
      ),
      hideOnMobile: true,
    },
    {
      key: 'courseName',
      header: sortHeader('Coursera course', 'courseName'),
      cell: (r) => (
        <>
          {r.courseName}
          {r.courseraCourseSlug && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>
              {r.courseraCourseSlug}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'mappedCourseSlug',
      header: sortHeader('Mapped to canonical', 'mappedCourseSlug'),
      cell: (r) =>
        r.mappedCourseSlug ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>
            {r.mappedProgramSlug}
            <br />
            {r.mappedCourseSlug}
          </span>
        ) : (
          <StatusBadge label="unmapped" variant="error" />
        ),
    },
    {
      key: 'percentComplete',
      header: sortHeader('Progress', 'percentComplete'),
      cell: (r) => `${Math.round(r.percentComplete)}%`,
      align: 'right',
    },
    {
      key: 'learningHours',
      header: sortHeader('Hours', 'learningHours'),
      cell: (r) => r.learningHours.toFixed(1),
      align: 'right',
      hideOnMobile: true,
    },
    {
      key: 'lastActivityTime',
      header: sortHeader('Last activity', 'lastActivityTime'),
      cell: (r) => fmtDate(r.lastActivityTime),
      hideOnMobile: true,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '0.75rem',
          background: 'var(--color-surface, #fff)',
          border: '1px solid var(--color-outline-variant, #ededed)',
          borderRadius: '0.5rem',
        }}
      >
        <div role="tablist" aria-label="Training progress view" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          <button
            role="tab"
            aria-selected={view === 'curriculum'}
            onClick={() => setView('curriculum')}
            className={view === 'curriculum' ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ fontSize: '0.85rem' }}
          >
            Curriculum view
            <span style={{ marginLeft: 6, opacity: 0.75, fontSize: '0.75rem' }}>
              ({curriculumRows.length})
            </span>
          </button>
          <button
            role="tab"
            aria-selected={view === 'raw'}
            onClick={() => setView('raw')}
            className={view === 'raw' ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ fontSize: '0.85rem' }}
          >
            Raw Coursera view
            <span style={{ marginLeft: 6, opacity: 0.75, fontSize: '0.75rem' }}>
              ({rawRows.length})
            </span>
          </button>
        </div>
        <input
          type="search"
          placeholder="Filter by learner, course, program…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            minWidth: 180,
            padding: '0.4rem 0.6rem',
            borderRadius: '0.4rem',
            border: '1px solid var(--color-outline-variant, #d8d6d2)',
            fontSize: '0.85rem',
          }}
        />
      </div>

      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
        {view === 'curriculum'
          ? 'Row per (learner × enrolled program × canonical course). Pulls from the DB course_progress table — what the member dashboard renders.'
          : 'Row per (learner × actual Coursera course they’re enrolled in). Pulls from the coursera_course_progress table (CSV import + B4B refresh). Mapped column shows when a row links back to the canonical curriculum.'}
      </p>

      {view === 'curriculum' ? (
        <DataTable<CurriculumRow>
          columns={curriculumColumns}
          rows={filteredCurriculum}
          rowKey={(r) => r.key}
          density="compact"
          emptyState={
            <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: '1.5rem' }}>
              No rows. Curriculum rows only exist when a learner has an enrolledProgram set.
            </p>
          }
        />
      ) : (
        <DataTable<RawCourseraRow>
          columns={rawColumns}
          rows={filteredRaw}
          rowKey={(r) => r.key}
          density="compact"
          emptyState={
            <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: '1.5rem' }}>
              No raw Coursera rows. Either no learner has triggered a B4B refresh or no CSV import has run.
            </p>
          }
        />
      )}
    </div>
  );
}
