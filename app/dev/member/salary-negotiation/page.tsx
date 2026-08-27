import { notFound } from 'next/navigation';
import { SalaryNegotiationKit } from '@/components/portal/kit/pages/member/SalaryNegotiationKit';

/**
 * Credential-free proofs for salary negotiation (toolkit destination).
 *   /dev/member/salary-negotiation              — kit form
 *   /dev/member/salary-negotiation?state=filled — form + phone script
 * Write POSTs skip in preview.
 */
export const dynamic = 'force-dynamic';

const SEED = {
  initialOffer: '52000',
  initialTarget: '58000',
  initialJobTitle: 'Cloud Support Associate',
  initialCompany: 'Ashby',
  initialDelivery: 'phone' as const,
};

const SCRIPT = `Thanks for the offer. I'm interested in the Cloud Support Associate seat.

The posted range and Austin market for hybrid cloud support sit closer to $58,000. I isolate Cost Explorer spikes and write the runbook the on-call rotation uses next.

Can we meet at $58,000? I'm ready to start on the queue.`;

export default async function DevMemberSalaryNegotiationPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';

  return (
    <SalaryNegotiationKit
      preview
      backHref="/dev/member/toolkit"
      {...SEED}
      previewOutput={filled ? SCRIPT : undefined}
    />
  );
}
