'use client';

import { useRouter } from 'next/navigation';
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
 * Placements — confirmed hires & wage data (dense).
 * Mockup: workforceap-admin-full.html "placements" view.
 * Target route: /admin/placements
 *
 * Server-rendered (no interactivity): all aggregation happens in the page
 * loader from lean Prisma queries and lands here as plain data. The wide
 * table collapses to stacked cards on mobile via DataTable mobile="cards".
 *
 * Columns: Student · Employer · Role · Wage · Survey · Status.
 *  - Survey: Done (a follow-up survey was completed) = ok, else Pending = muted.
 *  - Status: Confirmed (startDateVerified) = ok, else Pending = muted.
 */

/** Follow-up survey progress for a placement. */
export type SurveyStatus = 'Pending' | 'Done';
/** Hire confirmation state (mockup: "Confirmed" vs "Pending"). */
export type ConfirmStatus = 'Pending' | 'Confirmed';

export interface PlacementRow {
  id: string;
  /**
   * Member (User) id for this placement — used to drill into the member's
   * detail page on row click (parity with the legacy table's "Member" link).
   * Null when the placement has no linked user.
   */
  memberId?: string | null;
  /** Student / member display name. */
  student: string;
  employer: string;
  /** Job title / role. */
  role: string;
  /** Pre-formatted wage, e.g. "$52k" or "—". */
  wage: string;
  /** Follow-up survey progress. */
  survey: SurveyStatus;
  /** Hire confirmation state. */
  status: ConfirmStatus;
}

export interface PlacementsKitProps {
  placements: PlacementRow[];
  /** Placements recorded year-to-date (KPI: YTD). */
  ytd: number;
  /** Pre-formatted average wage, e.g. "$58k" or "—" (KPI: Avg Wage). */
  avgWage: string;
  /** Pre-formatted 90-day retention rate, e.g. "84%" or "—" (KPI: Retention 90d). */
  retention90d: string;
  /** Hires still awaiting confirmation (KPI: To Confirm). */
  toConfirm: number;
  /** Total placements in this view (footer). */
  total: number;
}

const SURVEY_TONE: Record<SurveyStatus, KitTone> = {
  Pending: 'muted',
  Done: 'ok',
};

const STATUS_TONE: Record<ConfirmStatus, KitTone> = {
  Pending: 'muted',
  Confirmed: 'ok',
};

export function PlacementsKit({
  placements,
  ytd,
  avgWage,
  retention90d,
  toConfirm,
  total,
}: PlacementsKitProps) {
  const router = useRouter();

  const kpis: KpiItem[] = [
    { label: 'YTD', value: ytd, color: 'success' },
    { label: 'Avg Wage', value: avgWage },
    { label: 'Retention 90d', value: retention90d, color: 'info' },
    { label: 'To Confirm', value: toConfirm, color: 'accent' },
  ];

  const numStyle = { fontVariantNumeric: 'tabular-nums' as const };

  const columns: Column<PlacementRow>[] = [
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
      key: 'employer',
      header: 'Employer',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.employer}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.role}</span>,
    },
    {
      key: 'wage',
      header: 'Wage',
      align: 'right',
      render: (row) => (
        <span style={{ ...numStyle, fontWeight: 700 }}>{row.wage}</span>
      ),
    },
    {
      key: 'survey',
      header: 'Survey',
      render: (row) => <StatusTag tone={SURVEY_TONE[row.survey]}>{row.survey}</StatusTag>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusTag tone={STATUS_TONE[row.status]}>{row.status}</StatusTag>,
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Placements"
        kicker="Outcomes"
        goal="Confirmed hires & wage data"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a
              href="/admin/placements/retention"
              className="wa-kit-focus"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                color: 'var(--wa-text)',
                border: '1px solid var(--wa-border, rgba(0,0,0,0.12))',
              }}
            >
              Retention decisions due
            </a>
            <a
              href="/admin/placements?ui=legacy"
              className="wa-kit-focus"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                color: 'var(--wa-text)',
                border: '1px solid var(--wa-border, rgba(0,0,0,0.12))',
              }}
            >
              Export
            </a>
          </div>
        }
      />

      <div className="wa-mb-5">
        <KpiStrip items={kpis} />
      </div>

      <DataTable<PlacementRow>
        columns={columns}
        rows={placements}
        rowKey={(row) => row.id}
        minWidth={720}
        onRowClick={(row) => {
          if (row.memberId) router.push(`/admin/members/${row.memberId}`);
        }}
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
                  {row.role} · {row.employer}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={STATUS_TONE[row.status]}>{row.status}</StatusTag>
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
                marginTop: 12,
              }}
            >
              <span style={{ ...numStyle, fontWeight: 700, color: 'var(--wa-text)' }}>
                {row.wage}
              </span>
              <span>
                Survey <StatusTag tone={SURVEY_TONE[row.survey]}>{row.survey}</StatusTag>
              </span>
            </div>
          </div>
        )}
        emptyTitle="No placements yet"
        emptyDescription="When a member lands a job, record it here so outcomes reporting stays accurate."
      />

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--wa-muted)',
          marginTop: 16,
        }}
      >
        Showing {placements.length} of {total}
      </p>
    </DesignSurface>
  );
}
