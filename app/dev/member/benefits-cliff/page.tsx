import { notFound } from 'next/navigation';
import { BenefitsCliffKit } from '@/components/portal/kit/pages/member/BenefitsCliffKit';

/**
 * Credential-free proof for benefits cliff calculator.
 *   /dev/member/benefits-cliff — kit form + disclaimer
 */
export const dynamic = 'force-dynamic';

export default function DevMemberBenefitsCliffPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <BenefitsCliffKit
      title="Will this offer leave you better off?"
      lede="Enter a job offer and see how it could change your SNAP, Medicaid, or TANF benefits each month."
      betaLabel="Beta"
      backHref="/dev/member/toolkit"
    />
  );
}
