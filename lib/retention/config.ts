/**
 * Data retention policy configuration.
 *
 * Defines how long each category of log/telemetry data is kept before
 * automated cleanup hard-deletes it. Member data (users, profiles,
 * enrollments, etc.) is NEVER auto-deleted by the cleanup job — only
 * log-like tables are in scope.
 *
 * GDPR right-to-erasure is handled separately via the admin erase endpoint.
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

export const RETENTION_TABLES: RetentionTableConfig[] = [
  {
    model: 'auditLog',
    dateColumn: 'createdAt',
    days: 90,
    description: 'Admin action audit trail',
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
