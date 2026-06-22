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
 * Email & cron management — automated email/workflow jobs rendered as a dense
 * roster. Sibling of the CronsMonitorKit "crons" view, but sourced from the
 * static CRON_REGISTRY joined with the latest WorkflowDiagnostic run per job.
 * Target route: /admin/email-crons
 *
 * One row per registered cron. Columns: Email job · Schedule · Last run ·
 * Status. Status folds the registry `enabled` flag and the latest run status
 * onto a StatusTag (Success=ok, Retrying/Failed=alert, Disabled=muted). All
 * aggregation happens in the page loader and lands here as plain data.
 * DataTable mobile="cards" so the wide table stacks instead of squishing.
 */

/** Display status mapped from the underlying job state. */
export type EmailCronDisplayStatus =
  | 'Success'
  | 'Retrying'
  | 'Disabled'
  | 'Pending';

export interface EmailCronRow {
  id: string;
  /** Job display name. */
  job: string;
  /** Human schedule caption (e.g. "Sunday 6PM UTC"). */
  schedule: string;
  /** Relative last-run caption (e.g. "3h ago") or "—" when never run. */
  lastRun: string;
  status: EmailCronDisplayStatus;
}

export interface EmailCronsKitProps {
  jobs: EmailCronRow[];
  /** Total registered email/cron jobs (KPI). */
  totalJobs: number;
  /** Jobs currently enabled (KPI). */
  enabled: number;
  /** Jobs whose latest run failed (KPI). */
  failing: number;
  /** Relative caption of the most recent run across all jobs, or "—". */
  lastRun: string;
}

const STATUS_TONE: Record<EmailCronDisplayStatus, KitTone> = {
  Success: 'ok',
  Retrying: 'alert',
  Disabled: 'muted',
  Pending: 'info',
};

export function EmailCronsKit({
  jobs,
  totalJobs,
  enabled,
  failing,
  lastRun,
}: EmailCronsKitProps) {
  const kpis: KpiItem[] = [
    { label: 'Total Jobs', value: totalJobs },
    { label: 'Enabled', value: enabled, color: 'success' },
    { label: 'Failing', value: failing, color: failing > 0 ? 'accent' : 'muted' },
    { label: 'Last Run', value: lastRun, color: 'info' },
  ];

  const columns: Column<EmailCronRow>[] = [
    {
      key: 'job',
      header: 'Email job',
      render: (row) => (
        <span style={{ fontWeight: 700, fontSize: 13 }}>{row.job}</span>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.schedule}</span>,
    },
    {
      key: 'lastRun',
      header: 'Last run',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.lastRun}</span>,
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
        title="Email Crons"
        kicker="System"
        goal="Automated email & workflow jobs"
      />

      <div className="wa-mb-5">
        <KpiStrip items={kpis} />
      </div>

      <DataTable<EmailCronRow>
        columns={columns}
        rows={jobs}
        rowKey={(row) => row.id}
        minWidth={640}
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
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.job}
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
                  {row.schedule}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={STATUS_TONE[row.status]}>{row.status}</StatusTag>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 11,
                color: 'var(--wa-muted)',
                marginTop: 12,
              }}
            >
              <span>
                Last run <b style={{ color: 'var(--wa-text)' }}>{row.lastRun}</b>
              </span>
            </div>
          </div>
        )}
        emptyTitle="No email crons registered"
        emptyDescription="Registered email and workflow jobs will appear here."
      />

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--wa-muted)',
          marginTop: 16,
        }}
      >
        Showing {jobs.length} of {totalJobs}
      </p>
    </DesignSurface>
  );
}
