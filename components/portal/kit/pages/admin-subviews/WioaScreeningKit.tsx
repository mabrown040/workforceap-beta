import {
  DesignSurface,
  SectionHeader,
  KpiStrip,
  DataTable,
  Avatar,
  StatusTag,
  type Column,
  type KpiItem,
  type KitTone,
} from '@/components/portal/kit';

/**
 * WIOA funding eligibility — screening & compliance (dense).
 * Mockup: workforceap-admin-full.html "wioa" view.
 * Target route: /admin/wioa-screening
 *
 * Server-rendered (no interactivity): the page loader does all the lean
 * aggregation (groupBy on review status + a capped findMany for the table) and
 * lands plain data here. DataTable mobile="cards" so the wide compliance table
 * stacks on phones instead of squishing.
 */

/** Determination drives the StatusTag tone + label in the table. */
export type WioaDetermination = 'Eligible' | 'Pending' | 'Needs docs' | 'Not eligible' | 'Unreviewed';

export interface WioaScreeningRow {
  id: string;
  /** Student / member full name. */
  name: string;
  initials: string;
  /** WIOA category caption, e.g. "Adult", "Dislocated Worker", "Youth". */
  category: string;
  /** Document status caption, e.g. "Complete" or "Missing W-2". */
  docs: string;
  /** Whether docs are outstanding (drives the docs cell color). */
  docsComplete: boolean;
  /** Staff determination → StatusTag. */
  determination: WioaDetermination;
  /** Reviewing staff name or "—". */
  reviewer: string;
}

export interface WioaScreeningKitProps {
  rows: WioaScreeningRow[];
  /** Total screenings submitted (table footer). */
  total: number;
  /** KPI: verified-eligible (staff). */
  eligible: number;
  /** KPI: pending + in-review. */
  pendingReview: number;
  /** KPI: needs more information / outstanding docs. */
  needDocs: number;
  /** KPI: determined not eligible (staff). */
  notEligible: number;
}

const DETERMINATION_TONE: Record<WioaDetermination, KitTone> = {
  Eligible: 'ok',
  Pending: 'warn',
  'Needs docs': 'alert',
  'Not eligible': 'muted',
  Unreviewed: 'info',
};

export function WioaScreeningKit({
  rows,
  total,
  eligible,
  pendingReview,
  needDocs,
  notEligible,
}: WioaScreeningKitProps) {
  const kpis: KpiItem[] = [
    { label: 'Eligible', value: eligible, color: 'success' },
    { label: 'Pending Review', value: pendingReview, color: 'gold' },
    { label: 'Need Docs', value: needDocs, color: 'accent' },
    { label: 'Not Eligible', value: notEligible },
  ];

  const StudentCell = ({ row }: { row: WioaScreeningRow }) => (
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
      </div>
    </div>
  );

  const columns: Column<WioaScreeningRow>[] = [
    { key: 'name', header: 'Student', render: (row) => <StudentCell row={row} /> },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span style={{ color: 'var(--wa-muted)' }}>{row.category}</span>
      ),
    },
    {
      key: 'docs',
      header: 'Docs',
      render: (row) => (
        <span
          style={{ color: row.docsComplete ? 'var(--wa-text)' : 'var(--wa-accent)', fontWeight: row.docsComplete ? 400 : 700 }}
        >
          {row.docs}
        </span>
      ),
    },
    {
      key: 'determination',
      header: 'Determination',
      render: (row) => (
        <StatusTag tone={DETERMINATION_TONE[row.determination]}>{row.determination}</StatusTag>
      ),
    },
    {
      key: 'reviewer',
      header: 'Reviewer',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.reviewer}</span>,
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Funding eligibility"
        kicker="Compliance"
        goal="WIOA screening & compliance"
      />

      <div className="wa-mb-5">
        <KpiStrip items={kpis} />
      </div>

      <DataTable<WioaScreeningRow>
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
                <StudentCell row={row} />
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={DETERMINATION_TONE[row.determination]}>
                  {row.determination}
                </StatusTag>
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
              <span>
                Category <b style={{ color: 'var(--wa-text)' }}>{row.category}</b>
              </span>
              <span>
                Docs{' '}
                <b style={{ color: row.docsComplete ? 'var(--wa-text)' : 'var(--wa-accent)' }}>
                  {row.docs}
                </b>
              </span>
              <span>
                Reviewer <b style={{ color: 'var(--wa-text)' }}>{row.reviewer}</b>
              </span>
            </div>
          </div>
        )}
        emptyTitle="No screenings yet"
        emptyDescription="Members who complete the WIOA self-screening will appear here for review."
      />

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--wa-muted)',
          marginTop: 16,
        }}
      >
        Showing {rows.length} of {total}
      </p>
    </DesignSurface>
  );
}
