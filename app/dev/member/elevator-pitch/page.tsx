import { notFound } from 'next/navigation';
import { ElevatorPitchKit } from '@/components/portal/kit/pages/member/ElevatorPitchKit';

/**
 * Credential-free proofs for elevator pitch (toolkit destination).
 *   /dev/member/elevator-pitch                 — kit form
 *   /dev/member/elevator-pitch?state=filled    — pitch review
 *   /dev/member/elevator-pitch?state=rehearse  — camera well, no getUserMedia
 * Write POSTs and camera/mic skip in preview.
 */
export const dynamic = 'force-dynamic';

const SEED = {
  name: 'Jordan Reyes',
  targetRole: 'Cloud Support Associate',
  strengths: 'VPN triage, runbooks, AWS lab hours',
  certifications: 'CompTIA A+ track',
  industry: 'Hybrid cloud support',
};

const PITCH =
  'I am Jordan Reyes, targeting hybrid Austin cloud support. I isolate Cost Explorer spikes and write the runbook the on-call rotation uses next.';

export default async function DevMemberElevatorPitchPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const previewStep = state === 'rehearse' ? 'rehearse' : state === 'filled' ? 'pitch' : 'form';

  return (
    <ElevatorPitchKit
      preview
      backHref="/dev/member/toolkit"
      initialData={SEED}
      previewStep={previewStep}
      previewPitch={PITCH}
    />
  );
}
