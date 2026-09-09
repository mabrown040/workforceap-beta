import Link from 'next/link';
import type { FundingSource } from '@prisma/client';

const FUNDING_LABELS: Record<FundingSource, string> = {
  GRANT: 'Grant',
  EMPLOYER: 'Employer',
  PARTNER_ORG: 'Partner organization',
  SELF: 'Self-pay',
  OTHER: 'Other',
};

export type CounselorTrainingEnrollment = {
  programSlug: string;
  programTitle: string;
  isPrimary: boolean;
  fundingSource: FundingSource | null;
};

/** Read-only assignment facts. A funding source is not proof of payment, and
 * the member-level enrollment permission is not a per-program funding award. */
export default function CounselorTrainingHandoff({
  memberId,
  enrollments,
  courseraEnrollmentApproved,
}: {
  memberId: string;
  enrollments: CounselorTrainingEnrollment[];
  courseraEnrollmentApproved: boolean;
}) {
  const missingFunding = enrollments.some((enrollment) => enrollment.fundingSource === null);
  const nextStep = enrollments.length === 0
    ? 'Confirm the intended program with the enrollment team.'
    : !courseraEnrollmentApproved
      ? 'Ask the enrollment team to confirm funding and enrollment approval before advising the member to begin.'
      : missingFunding
        ? 'Ask the enrollment team to complete the missing funding record; confirm course access with the member.'
        : 'Confirm course access with the member and agree on the next study step.';

  return (
    <section className="wa-kit-card" aria-label="Funding and training access" style={{ color: 'var(--wa-text)', fontSize: 'var(--wa-type-body)' }}>
      <h2 className="wa-font-bold wa-text-lg wa-mb-3">Funding and training access</h2>
      {enrollments.length > 0 ? (
        <ul className="wa-flex wa-flex-col wa-gap-3 wa-mb-4" style={{ listStyle: 'none', padding: 0 }}>
          {enrollments.map((enrollment) => (
            <li key={enrollment.programSlug} style={{ overflowWrap: 'anywhere' }}>
              <p className="wa-font-semibold">{enrollment.programTitle}</p>
              <p style={{ color: 'var(--wa-muted)', fontSize: 'var(--wa-type-meta)' }}>
                {enrollment.isPrimary ? 'Primary program' : 'Secondary program'} · {enrollment.fundingSource ? `Funding source: ${FUNDING_LABELS[enrollment.fundingSource]}` : 'No funding source recorded'}
              </p>
            </li>
          ))}
        </ul>
      ) : <p className="wa-mb-3" style={{ color: 'var(--wa-muted)' }}>No course enrollment record is available.</p>}
      <p className="wa-mb-2"><strong>Coursera enrollment permission:</strong> {courseraEnrollmentApproved ? 'Approved' : 'Not approved'}</p>
      <p style={{ color: 'var(--wa-muted)', fontSize: 'var(--wa-type-meta)', maxWidth: '75ch' }}>
        This permission is recorded for the member. Funding sources do not confirm an award or payment for any program.
      </p>
      <p className="wa-mt-3 wa-mb-3" style={{ maxWidth: '75ch' }}><strong>Next step:</strong> {nextStep}</p>
      <Link className="btn btn-outline" href={`/counselor/messages?memberId=${encodeURIComponent(memberId)}`}>
        Message member
      </Link>
    </section>
  );
}
