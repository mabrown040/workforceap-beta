import type { ApplicationStatus } from '@prisma/client';

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
};

export function StatusCard({ status, programInterest, submittedAt }: StatusCardProps) {
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
      <p style={{ color: 'var(--color-gray-600)', fontSize: '.95rem', marginBottom: '0.75rem' }}>
        {description}
      </p>
      <p style={{ fontSize: '.875rem', color: 'var(--color-gray-500)' }}>
        Program: {programInterest}
        {submittedAt && (
          <> &bull; Submitted {new Date(submittedAt).toLocaleDateString()}</>
        )}
      </p>
    </div>
  );
}
