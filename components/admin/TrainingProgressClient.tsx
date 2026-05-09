'use client';

import { useMemo, useState } from 'react';

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
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
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

function SortHeader<R>({
  label,
  sortKey,
  current,
  dir,
  onClick,
}: {
  label: string;
  sortKey: keyof R | string;
  current: keyof R | string | null;
  dir: SortDir;
  onClick: (key: keyof R | string) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      style={{
        textAlign: 'left',
        padding: '0.5rem 0.6rem',
        cursor: 'pointer',
        userSelect: 'none',
        borderBottom: '1px solid var(--color-outline-variant, #d8d6d2)',
        background: active ? 'rgba(43,123,185,0.08)' : 'transparent',
        fontSize: '0.78rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {active && <span style={{ marginLeft: 4 }}>{dir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}

const cell: React.CSSProperties = {
  padding: '0.5rem 0.6rem',
  borderBottom: '1px solid var(--color-outline-variant, #ededed)',
  fontSize: '0.85rem',
  verticalAlign: 'top',
};

function StatusPill({ status }: { status: string }) {
  const palette: Record<string, { bg: string; fg: string; label: string }> = {
    COMPLETED: { bg: 'rgba(34,197,94,0.15)', fg: 'rgb(22,163,74)', label: 'completed' },
    IN_PROGRESS: { bg: 'rgba(164,127,56,0.14)', fg: 'var(--color-accent)', label: 'in progress' },
    NOT_STARTED: { bg: 'rgba(120,120,120,0.10)', fg: 'var(--color-on-surface-variant)', label: 'not started' },
  };
  const p = palette[status] ?? palette.NOT_STARTED;
  return (
    <span
      style={{
        fontSize: '0.7rem',
        padding: '0.1rem 0.4rem',
        borderRadius: '0.4rem',
        background: p.bg,
        color: p.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {p.label}
    </span>
  );
}

function RolePill({ role }: { role: string | null }) {
  if (!role || role === 'member') return null;
  return (
    <span
      style={{
        fontSize: '0.65rem',
        padding: '0.05rem 0.3rem',
        borderRadius: '0.3rem',
        background: 'rgba(124, 58, 237, 0.12)',
        color: 'rgb(109, 40, 217)',
        marginLeft: '0.4rem',
        whiteSpace: 'nowrap',
      }}
      title="Admin / super_admin dogfooding member experience"
    >
      {role}
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
    const sorted = [...rows].sort((a, b) => {
      const v = compare(a[sortKey as keyof CurriculumRow], b[sortKey as keyof CurriculumRow]);
      return sortDir === 'asc' ? v : -v;
    });
    return sorted;
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
    const sorted = [...rows].sort((a, b) => {
      const v = compare(a[sortKey as keyof RawCourseraRow], b[sortKey as keyof RawCourseraRow]);
      return sortDir === 'asc' ? v : -v;
    });
    return sorted;
  }, [rawRows, filter, sortKey, sortDir]);

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
        <div role="tablist" aria-label="Training progress view" style={{ display: 'flex', gap: '0.25rem' }}>
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
            minWidth: 220,
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

      <div style={{ overflowX: 'auto', background: 'var(--color-surface, #fff)', border: '1px solid var(--color-outline-variant, #ededed)', borderRadius: '0.5rem' }}>
        {view === 'curriculum' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <SortHeader<CurriculumRow> label="Learner" sortKey="learnerName" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<CurriculumRow> label="Email" sortKey="learnerEmail" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<CurriculumRow> label="Program" sortKey="programTitle" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<CurriculumRow> label="Course" sortKey="courseName" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<CurriculumRow> label="Progress" sortKey="percentComplete" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<CurriculumRow> label="Status" sortKey="status" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<CurriculumRow> label="Last activity" sortKey="lastActivityAt" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<CurriculumRow> label="Last updated" sortKey="lastUpdatedAt" current={sortKey} dir={sortDir} onClick={handleSort} />
              </tr>
            </thead>
            <tbody>
              {filteredCurriculum.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...cell, textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: '1.5rem' }}>
                    No rows. Curriculum rows only exist when a learner has an enrolledProgram set.
                  </td>
                </tr>
              ) : (
                filteredCurriculum.map((r) => (
                  <tr key={r.key}>
                    <td style={cell}>
                      <strong>{r.learnerName || '—'}</strong>
                      <RolePill role={r.learnerRole} />
                    </td>
                    <td style={cell}>{r.learnerEmail}</td>
                    <td style={cell}>{r.programTitle}</td>
                    <td style={cell}>
                      {r.courseName}
                      {r.courseraCourseId && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>{r.courseraCourseId}</div>
                      )}
                    </td>
                    <td style={{ ...cell, textAlign: 'right' }}>{r.percentComplete}%</td>
                    <td style={cell}><StatusPill status={r.status} /></td>
                    <td style={cell}>{fmtDate(r.lastActivityAt)}</td>
                    <td style={cell}>{fmtDate(r.lastUpdatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <SortHeader<RawCourseraRow> label="Learner" sortKey="learnerName" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<RawCourseraRow> label="Email" sortKey="learnerEmail" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<RawCourseraRow> label="Coursera program" sortKey="courseraProgramName" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<RawCourseraRow> label="Coursera course" sortKey="courseName" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<RawCourseraRow> label="Mapped to canonical" sortKey="mappedCourseSlug" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<RawCourseraRow> label="Progress" sortKey="percentComplete" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<RawCourseraRow> label="Hours" sortKey="learningHours" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortHeader<RawCourseraRow> label="Last activity" sortKey="lastActivityTime" current={sortKey} dir={sortDir} onClick={handleSort} />
              </tr>
            </thead>
            <tbody>
              {filteredRaw.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...cell, textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: '1.5rem' }}>
                    No raw Coursera rows. Either no learner has triggered a B4B refresh or no CSV import has run.
                  </td>
                </tr>
              ) : (
                filteredRaw.map((r) => (
                  <tr key={r.key}>
                    <td style={cell}>
                      <strong>{r.learnerName || '(unmapped user)'}</strong>
                      <RolePill role={r.learnerRole} />
                    </td>
                    <td style={cell}>{r.learnerEmail}</td>
                    <td style={cell}>
                      {r.courseraProgramName ?? r.courseraProgramSlug}
                      {r.courseraProgramSlug && r.courseraProgramName && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>{r.courseraProgramSlug}</div>
                      )}
                    </td>
                    <td style={cell}>
                      {r.courseName}
                      {r.courseraCourseSlug && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>{r.courseraCourseSlug}</div>
                      )}
                    </td>
                    <td style={cell}>
                      {r.mappedCourseSlug ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>
                          {r.mappedProgramSlug} <br /> {r.mappedCourseSlug}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '0.4rem',
                            background: 'rgba(220, 38, 38, 0.10)',
                            color: 'rgb(185, 28, 28)',
                          }}
                          title="Not yet linked to a canonical curriculum course. Add the courseraCourseId to the program definition in lib/content/programs.ts to map."
                        >
                          unmapped
                        </span>
                      )}
                    </td>
                    <td style={{ ...cell, textAlign: 'right' }}>{Math.round(r.percentComplete)}%</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{r.learningHours.toFixed(1)}</td>
                    <td style={cell}>{fmtDate(r.lastActivityTime)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
