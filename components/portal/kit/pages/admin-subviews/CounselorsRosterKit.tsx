import {
  DesignSurface,
  SectionHeader,
  KpiStrip,
  DataTable,
  Avatar,
  type Column,
  type KpiItem,
} from '@/components/portal/kit';
import { Card } from '@astryxdesign/core/Card';
import { Token, type TokenColor } from '@astryxdesign/core/Token';

/**
 * Counselors roster — staff caseload & performance (dense).
 * Mockup: workforceap-admin-full.html "counselors" view.
 * Target route: /admin/counselors
 *
 * Server-rendered (no interactivity) so this stays a server component-friendly
 * module: all aggregation happens in the page loader and lands here as plain
 * data. Uses DataTable mobile="cards" so the wide caseload table stacks on
 * mobile instead of squishing.
 */
export interface CounselorRow {
  id: string;
  name: string;
  initials: string;
  /** Affiliation / title caption, e.g. "WorkforceAP · Career Coach". */
  caption: string;
  /** Active assignments owned. */
  caseload: number;
  /** Members in this caseload flagged at-risk. */
  atRisk: number;
  /** Members in this caseload with memberStatus = placed. */
  placements: number;
  /** Avg first-response caption (e.g. "2.1h") or "—" when unavailable. */
  avgResponse: string;
  /** Caseload load tone vs the cohort average. */
  load: 'Over' | 'Balanced' | 'Light';
}

export interface CounselorsRosterKitProps {
  counselors: CounselorRow[];
  /** Total active counselors (KPI + roster header). */
  total: number;
  /** Avg caseload across counselors (rounded). */
  avgCaseload: number;
  /** Total at-risk members owned across all counselors. */
  atRiskOwned: number;
  /** Avg first-response caption (e.g. "3.2h") or "—". */
  avgResponse: string;
}

const LOAD_TOKEN_COLOR: Record<CounselorRow['load'], TokenColor> = {
  Over: 'pink',
  Balanced: 'green',
  Light: 'blue',
};

export function CounselorsRosterKit({
  counselors,
  total,
  avgCaseload,
  atRiskOwned,
  avgResponse,
}: CounselorsRosterKitProps) {
  const kpis: KpiItem[] = [
    { label: 'Counselors', value: total },
    { label: 'Avg Caseload', value: avgCaseload, color: 'info' },
    { label: 'At-Risk Owned', value: atRiskOwned, color: 'accent' },
    { label: 'Avg Response', value: avgResponse, color: 'success' },
  ];

  const CounselorCell = ({ row }: { row: CounselorRow }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Avatar initials={row.initials} size={32} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
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
          {row.caption}
        </div>
      </div>
    </div>
  );

  const numStyle = { fontVariantNumeric: 'tabular-nums' as const };

  const columns: Column<CounselorRow>[] = [
    { key: 'name', header: 'Counselor', render: (row) => <CounselorCell row={row} /> },
    {
      key: 'caseload',
      header: 'Caseload',
      align: 'right',
      render: (row) => (
        <span style={{ ...numStyle, fontWeight: 700 }}>{row.caseload}</span>
      ),
    },
    {
      key: 'atRisk',
      header: 'At-risk',
      align: 'right',
      render: (row) => (
        <span
          style={{
            ...numStyle,
            fontWeight: 700,
            color: row.atRisk > 0 ? 'var(--wa-accent)' : 'var(--wa-muted)',
          }}
        >
          {row.atRisk}
        </span>
      ),
    },
    {
      key: 'placements',
      header: 'Placements',
      align: 'right',
      render: (row) => (
        <span style={{ ...numStyle, color: 'var(--wa-success)', fontWeight: 700 }}>
          {row.placements}
        </span>
      ),
    },
    {
      key: 'avgResponse',
      header: 'Avg response',
      align: 'right',
      render: (row) => (
        <span style={{ ...numStyle, color: 'var(--wa-muted)' }}>{row.avgResponse}</span>
      ),
    },
    {
      key: 'load',
      header: 'Load',
      render: (row) => <Token label={row.load} size="sm" color={LOAD_TOKEN_COLOR[row.load]} />,
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Counselors"
        kicker="People"
        goal="Staff caseload & performance"
      />

      <div className="wa-mb-5">
        <KpiStrip items={kpis} />
      </div>

      <DataTable<CounselorRow>
        columns={columns}
        rows={counselors}
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
                <CounselorCell row={row} />
              </div>
              <div style={{ flexShrink: 0 }}>
                <Token label={row.load} size="sm" color={LOAD_TOKEN_COLOR[row.load]} />
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
                Caseload <b style={{ color: 'var(--wa-text)' }}>{row.caseload}</b>
              </span>
              <span style={numStyle}>
                At-risk{' '}
                <b style={{ color: row.atRisk > 0 ? 'var(--wa-accent)' : 'var(--wa-text)' }}>
                  {row.atRisk}
                </b>
              </span>
              <span style={numStyle}>
                Placed <b style={{ color: 'var(--wa-success)' }}>{row.placements}</b>
              </span>
              <span style={numStyle}>Resp {row.avgResponse}</span>
            </div>
          </Card>
        )}
        emptyTitle="No counselors yet"
        emptyDescription="Add a counselor to start tracking caseload and performance."
      />

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--wa-muted)',
          marginTop: 16,
        }}
      >
        Showing {counselors.length} of {total}
      </p>
    </DesignSurface>
  );
}
