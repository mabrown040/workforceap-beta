'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import {
  DesignSurface,
  SectionHeader,
  DataTable,
  StatusTag,
  type Column,
  type KitTone,
} from '@/components/portal/kit';

/**
 * Jobs board — the admin job-posting queue rendered as a dense roster table.
 * Mockup: workforceap-admin-full.html "jobs" view.
 * Target route: /admin/jobs
 *
 * Columns: Role · Employer · Location · Wage · Applicants · Status.
 * Status is a StatusTag (Open=ok, Closing=warn, Pending=info, …). Wide table
 * collapses to stacked cards on mobile via DataTable mobile="cards".
 */

/** Display status mapped from the underlying JobStatusEnum. */
export type JobDisplayStatus =
  | 'Open'
  | 'Closing'
  | 'Pending'
  | 'Draft'
  | 'Filled'
  | 'Closed';

export interface JobRow {
  id: string;
  /** Role / job title. */
  role: string;
  employer: string;
  location: string;
  /** Pre-formatted wage range, e.g. "$72–88k" or "—". */
  wage: string;
  applicants: number;
  status: JobDisplayStatus;
}

export interface JobsBoardKitProps {
  jobs?: JobRow[];
  /** Total open roles (for the subtitle). */
  openRoles?: number;
  /** Distinct employers with open roles (for the subtitle). */
  employers?: number;
}

const DEFAULT_JOBS: JobRow[] = [
  {
    id: 'sf-admin',
    role: 'Salesforce Administrator',
    employer: 'Deloitte',
    location: 'Austin, TX',
    wage: '$72–88k',
    applicants: 14,
    status: 'Open',
  },
  {
    id: 'it-support',
    role: 'IT Support Specialist',
    employer: 'Dell',
    location: 'Round Rock',
    wage: '$58–70k',
    applicants: 9,
    status: 'Open',
  },
  {
    id: 'med-assistant',
    role: 'Medical Assistant',
    employer: "St. David's",
    location: 'Austin, TX',
    wage: '$48–55k',
    applicants: 22,
    status: 'Closing',
  },
];

const STATUS_TONE: Record<JobDisplayStatus, KitTone> = {
  Open: 'ok',
  Closing: 'warn',
  Pending: 'info',
  Draft: 'muted',
  Filled: 'ok',
  Closed: 'muted',
};

export function JobsBoardKit({
  jobs = DEFAULT_JOBS,
  openRoles = 127,
  employers = 48,
}: JobsBoardKitProps) {
  const router = useRouter();
  const subtitle = `${openRoles.toLocaleString()} open ${
    openRoles === 1 ? 'role' : 'roles'
  } across ${employers.toLocaleString()} ${employers === 1 ? 'employer' : 'employers'}`;

  const columns: Column<JobRow>[] = [
    {
      key: 'role',
      header: 'Role',
      render: (row) => <span style={{ fontWeight: 700 }}>{row.role}</span>,
    },
    {
      key: 'employer',
      header: 'Employer',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.employer}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.location}</span>,
    },
    {
      key: 'wage',
      header: 'Wage',
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{row.wage}</span>
      ),
    },
    {
      key: 'applicants',
      header: 'Applicants',
      align: 'right',
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
          {row.applicants}
        </span>
      ),
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
        title="Jobs"
        kicker="Employers"
        goal={subtitle}
        action={
          <a
            href="/admin/jobs?ui=legacy"
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
              background: 'var(--wa-accent)',
              color: '#fff',
            }}
          >
            <Plus className="h-4 w-4" aria-hidden /> Post Job
          </a>
        }
      />

      <DataTable<JobRow>
        columns={columns}
        rows={jobs}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/admin/jobs/${row.id}`)}
        minWidth={760}
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
                  {row.role}
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
                  {row.employer} · {row.location}
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
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {row.wage}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>
                <b style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--wa-text)' }}>
                  {row.applicants}
                </b>{' '}
                applicants
              </span>
            </div>
          </div>
        )}
        emptyTitle="No open roles"
        emptyDescription="Approved job postings will appear here once employers publish roles."
      />
    </DesignSurface>
  );
}
