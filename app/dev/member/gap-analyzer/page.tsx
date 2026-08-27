import { notFound } from 'next/navigation';
import { GapAnalyzerKit } from '@/components/portal/kit/pages/member/GapAnalyzerKit';

/**
 * Credential-free proofs for gap analyzer (toolkit destination).
 *   /dev/member/gap-analyzer              — kit form
 *   /dev/member/gap-analyzer?state=filled — form + analysis
 * Analyze POSTs / file extract are skipped in preview.
 */
export const dynamic = 'force-dynamic';

const SEED = {
  initialResume:
    'Jordan Reyes — Cloud support, Austin TX.\nIT support graduate, 2024–2026.\nVPN triage, runbooks, AWS lab hours.',
};

const FILLED_OUTPUT = `Gaps to address

2022–2024: no paid IT role listed.
Talking point: name the WorkforceAP lab hours and the ticket queue, then the month you start applying.

Next: one line on the resume with dates, tools, and tickets closed.`;

export default async function DevMemberGapAnalyzerPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';

  return (
    <GapAnalyzerKit
      preview
      backHref="/dev/member/toolkit"
      {...SEED}
      previewOutput={filled ? FILLED_OUTPUT : undefined}
    />
  );
}
