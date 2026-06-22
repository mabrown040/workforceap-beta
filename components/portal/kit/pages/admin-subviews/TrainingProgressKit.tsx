import {
  DesignSurface,
  SectionHeader,
  KpiStrip,
  DataTable,
  StatusTag,
  type Column,
  type KpiItem,
  type KitTone,
} from '@/components/portal/kit';

/**
 * Training progress — live B4B + LMS progress across all members (dense).
 * Mockup: workforceap-admin-full.html "training-progress" view.
 * Target route: /admin/training-progress
 *
 * Server-rendered (no interactivity): all aggregation happens in the page
 * loader and lands here as plain rows. DataTable mobile="cards" so the wide
 * progress table stacks on mobile instead of squishing.
 */

/** Pace classification derived from progress + recent activity. */
export type Pace = 'On track' | 'Ahead' | 'Behind' | 'Stalled';

export interface TrainingRow {
  id: string;
  /** Learner full name. */
  student: string;
  /** Program title (e.g. "AWS Practitioner"). */
  program: string;
  /** Canonical modules completed in the program. */
  modulesDone: number;
  /** Total canonical modules in the program. */
  modulesTotal: number;
  /** Overall percent complete across the program's modules (0–100, rounded). */
  percentComplete: number;
  /** Pace classification. */
  pace: Pace;
}

export interface TrainingProgressKitProps {
  rows: TrainingRow[];
  /** Learners classified On track (or Ahead). */
  onTrack: number;
  /** Learners classified Behind. */
  behind: number;
  /** Learners classified Stalled. */
  stalled: number;
  /** Average percent complete across all rows (0–100, rounded). */
  avgPercent: number;
}

const PACE_TONE: Record<Pace, KitTone> = {
  'On track': 'ok',
  Ahead: 'ok',
  Stalled: 'alert',
  Behind: 'warn',
};

export function TrainingProgressKit({
  rows,
  onTrack,
  behind,
  stalled,
  avgPercent,
}: TrainingProgressKitProps) {
  const kpis: KpiItem[] = [
    { label: 'On Track', value: onTrack, color: 'success' },
    { label: 'Behind', value: behind, color: 'gold' },
    { label: 'Stalled', value: stalled, color: 'accent' },
    { label: 'Avg %', value: `${avgPercent}%`, color: 'info' },
  ];

  const numStyle = { fontVariantNumeric: 'tabular-nums' as const };

  const columns: Column<TrainingRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <span
          style={{
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {row.student}
        </span>
      ),
    },
    {
      key: 'program',
      header: 'Program',
      render: (row) => (
        <span
          style={{
            color: 'var(--wa-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {row.program}
        </span>
      ),
    },
    {
      key: 'modules',
      header: 'Modules',
      align: 'right',
      render: (row) => (
        <span style={numStyle}>
          {row.modulesDone} / {row.modulesTotal}
        </span>
      ),
    },
    {
      key: 'percentComplete',
      header: '% Complete',
      align: 'right',
      render: (row) => (
        <span style={{ ...numStyle, fontWeight: 700 }}>{row.percentComplete}%</span>
      ),
    },
    {
      key: 'pace',
      header: 'Pace',
      render: (row) => <StatusTag tone={PACE_TONE[row.pace]}>{row.pace}</StatusTag>,
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Training progress"
        kicker="Programs"
        goal="Live B4B + LMS progress across all members"
      />

      <div className="wa-mb-5">
        <KpiStrip items={kpis} />
      </div>

      <DataTable<TrainingRow>
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        minWidth={680}
        mobile="cards"
        cardRender={(row) => (
          <div className="wa-kit-card wa-kit-card--sm">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.student}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--wa-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.program}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={PACE_TONE[row.pace]}>{row.pace}</StatusTag>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 11,
                color: 'var(--wa-muted)',
                margin: '12px 0 0',
              }}
            >
              <span style={numStyle}>
                Modules{' '}
                <b style={{ color: 'var(--wa-text)' }}>
                  {row.modulesDone} / {row.modulesTotal}
                </b>
              </span>
              <span style={numStyle}>
                Complete <b style={{ color: 'var(--wa-text)' }}>{row.percentComplete}%</b>
              </span>
            </div>
          </div>
        )}
        emptyTitle="No training progress yet"
        emptyDescription="Once members enroll and start coursework, their pace shows up here."
      />

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--wa-muted)',
          marginTop: 16,
        }}
      >
        Showing {rows.length} learner{rows.length === 1 ? '' : 's'}
      </p>
    </DesignSurface>
  );
}
