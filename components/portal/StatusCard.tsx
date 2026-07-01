import type { ApplicationStatus } from '@prisma/client';
import type { AppLocale } from '@/lib/i18n/config';
import { formatLocalizedDate } from '@/lib/i18n/date';

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: 'Under review',
  APPROVED: 'Approved',
  DENIED: 'Not approved',
  NEEDS_INFO: 'More info needed',
};

const STATUS_DESCRIPTIONS: Record<ApplicationStatus, string> = {
  PENDING: 'Your application is being reviewed. We\'ll contact you soon.',
  APPROVED: 'Congratulations! Your application has been approved. Check your email for next steps.',
  DENIED: 'Your application was not approved at this time. Contact us if you have questions.',
  NEEDS_INFO: 'We need additional information. Please check your email for details.',
};

type StatusCardProps = {
  status: ApplicationStatus;
  programInterest: string;
  submittedAt: Date | null;
  /** Active locale (e.g. from `getRequestLocale()`); defaults to English. */
  locale?: AppLocale;
};

export function StatusCard({ status, programInterest, submittedAt, locale }: StatusCardProps) {
  const label = STATUS_LABELS[status];
  const description = STATUS_DESCRIPTIONS[status];

  return (
    <div
      className="status-card"
      style={{
        background: 'var(--color-light)',
        padding: '1.5rem',
        borderRadius: 'var(--radius-md)',
        borderLeft: '4px solid var(--color-accent)',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Application status</h2>
      <p style={{ fontWeight: 700, color: 'var(--color-accent)', marginBottom: '0.5rem' }}>{label}</p>
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '.95rem', marginBottom: '0.75rem' }}>
        {description}
      </p>
      <p style={{ fontSize: '.875rem', color: 'var(--color-on-surface-variant)' }}>
        Program: {programInterest}
        {submittedAt && (
          <> &bull; Submitted {formatLocalizedDate(submittedAt, locale)}</>
        )}
      </p>
    </div>
  );
}
