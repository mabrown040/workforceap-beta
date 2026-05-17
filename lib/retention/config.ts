/**
 * Data retention policy configuration.
 *
 * Defines how long each category of log/telemetry data is kept before
 * automated cleanup hard-deletes it. Member data (users, profiles,
 * enrollments, etc.) is NEVER auto-deleted by the cleanup job — only
 * log-like tables are in scope.
 *
 * GDPR right-to-erasure is handled separately via the admin erase endpoint.
 *
 * AUDIT-2026-05-16 §H-B1: WIOA participant records (eligibility, placement,
 * fund changes, exports, retention surveys) require a 3-year retention
 * window under 20 CFR 677 / §116. The audit-log table also receives "
 * non-sensitive" admin actions like role views and config reads that don't
 * need three years. The CRITICAL_AUDIT_ACTION_PREFIXES list below opts
 * specific action prefixes into the longer retention; everything else
 * keeps the 90-day default. The cleanup job consults this list before
 * deleting an audit row.
 */

export type RetentionTableConfig = {
  /** Prisma model name (camelCase) */
  model: string;
  /** Date column to compare against retention period */
  dateColumn: string;
  /** Retention period in days */
  days: number;
  /** Human-readable description */
  description: string;
};

export const RETENTION_BATCH_SIZE = 1000;

/**
 * Audit-log `action` prefixes that must be retained for ≥ 3 years for
 * federal grant compliance (WIOA §116, 20 CFR 677). Match is by
 * `startsWith` so a single prefix covers families (e.g. `wioa.` covers
 * `wioa.review.status_change`, `wioa.export`, etc).
 *
 * The cleanup job uses this list to skip rows whose `action` matches
 * any prefix here. Keep entries short and stable — once a row is
 * retained, do not remove its prefix from this list without a
 * compliance review.
 */
export const CRITICAL_AUDIT_ACTION_PREFIXES: readonly string[] = [
  'wioa.',
  'admin.export.',
  'admin.report.',
  'placement.',
  'funding.',
  'employer.approve',
  'employer.reject',
  'invitation.create',
  'role.change',
  'member.gdpr_erase',
];

/** Retention period applied to audit rows whose action matches a critical prefix. */
export const CRITICAL_AUDIT_RETENTION_DAYS = 365 * 3 + 1;

export const RETENTION_TABLES: RetentionTableConfig[] = [
  {
    model: 'auditLog',
    dateColumn: 'createdAt',
    days: 90,
    description: 'Admin action audit trail (default 90d; critical actions retained 3y — see CRITICAL_AUDIT_ACTION_PREFIXES)',
  },
  {
    model: 'xapiStatement',
    dateColumn: 'createdAt',
    days: 365,
    description: 'LRS/xAPI learning statements',
  },
  {
    model: 'cronExecution',
    dateColumn: 'createdAt',
    days: 30,
    description: 'Cron job execution records',
  },
  {
    model: 'webhookEvent',
    dateColumn: 'createdAt',
    days: 90,
    description: 'Webhook delivery events',
  },
  {
    model: 'memberEvent',
    dateColumn: 'createdAt',
    days: 365,
    description: 'Member activity events',
  },
  {
    model: 'workflowDiagnostic',
    dateColumn: 'createdAt',
    days: 90,
    description: 'Workflow/email/cron diagnostic logs',
  },
  {
    model: 'portalWorkflowEvent',
    dateColumn: 'createdAt',
    days: 90,
    description: 'Portal workflow activity events',
  },
];

/** Soft-deleted users are hard-deleted after this many days. */
export const DELETED_ACCOUNT_RETENTION_DAYS = 30;

/** Returns the cutoff Date for a given retention period. */
export function getCutoffDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}
