import NextLink from 'next/link';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Token, type TokenColor } from '@astryxdesign/core/Token';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import {
  DesignSurface,
  SectionHeader,
  KpiStrip,
  DataTable,
  type Column,
  type KpiItem,
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
  /** Latest Coursera course grade 0–100; null when unknown. */
  courseraGrade?: number | null;
  /** False when the row is a Coursera identity with no WAP member. */
  inWap?: boolean;
  /** Linked WAP member has Coursera progress but no assigned program. */
  noProgram?: boolean;
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
  /** Override the footer when the loader capped the learner scan. */
  showingLabel?: string;
}

const PACE_TOKEN_COLOR: Record<Pace, TokenColor> = {
  'On track': 'green',
  Ahead: 'green',
  Stalled: 'pink',
  Behind: 'yellow',
};

export function TrainingProgressKit({
  rows,
  onTrack,
  behind,
  stalled,
  avgPercent,
  showingLabel,
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
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.student}
          </span>
          {row.inWap === false ? <Token label="Unmatched" size="sm" color="pink" /> : null}
          {row.inWap !== false && row.noProgram ? <Token label="No program" size="sm" color="yellow" /> : null}
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
      key: 'courseraGrade',
      header: 'Coursera grade',
      align: 'right',
      render: (row) => (
        <span style={{ ...numStyle, fontWeight: 700 }}>
          {row.courseraGrade != null && Number.isFinite(row.courseraGrade)
            ? `${Math.round(row.courseraGrade * 100) / 100}%`
            : '—'}
        </span>
      ),
    },
    {
      key: 'pace',
      header: 'Pace',
      render: (row) => <Token label={row.pace} size="sm" color={PACE_TOKEN_COLOR[row.pace]} />,
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Training progress"
        kicker="Programs"
        goal="Live B4B + LMS progress across all members"
        action={
          <AstryxLink href="/admin/training-progress?ui=legacy" as={NextLink as never} isStandalone>
            <Button label="Detailed view" variant="secondary" size="sm" />
          </AstryxLink>
        }
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
          <Card>
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
                {row.inWap === false ? (
                  <div style={{ marginTop: 4 }}>
                    <Token label="Unmatched" size="sm" color="pink" />
                  </div>
                ) : row.noProgram ? (
                  <div style={{ marginTop: 4 }}>
                    <Token label="No program" size="sm" color="yellow" />
                  </div>
                ) : null}
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
                <Token label={row.pace} size="sm" color={PACE_TOKEN_COLOR[row.pace]} />
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
              <span style={numStyle}>
                Grade{' '}
                <b style={{ color: 'var(--wa-text)' }}>
                  {row.courseraGrade != null && Number.isFinite(row.courseraGrade)
                    ? `${Math.round(row.courseraGrade * 100) / 100}%`
                    : '—'}
                </b>
              </span>
            </div>
          </Card>
        )}
        emptyTitle="No training progress yet"
        emptyDescription="Members in a program and Coursera learners not yet in WAP show up here once activity exists."
      />

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--wa-muted)',
          marginTop: 16,
        }}
      >
        {showingLabel ?? `Showing ${rows.length} learner${rows.length === 1 ? '' : 's'}`}
      </p>
    </DesignSurface>
  );
}
