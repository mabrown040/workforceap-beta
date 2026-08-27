import { notFound } from 'next/navigation';
import { ResumeStrengthKit } from '@/components/portal/kit/pages/member/ResumeStrengthKit';
import type { ResumeScorePayload } from '@/components/portal/tools/ResumeScoreBreakdown';

/**
 * Credential-free proofs for resume strength (toolkit destination).
 *   /dev/member/resume-strength              — kit form
 *   /dev/member/resume-strength?state=filled — form + score + analysis
 * Analyze POSTs / resume hydrate / file extract are skipped in preview.
 */
export const dynamic = 'force-dynamic';

const SEED_RESUME = `Jordan Reyes
Austin, TX
IT support graduate. VPN triage, runbooks, AWS lab hours.

Experience
WorkforceAP — Cloud support lab
- Triaged VPN tickets
- Logged AWS lab hours against Cost Explorer

Education
IT Support certificate — CompTIA A+ track`;

const FILLED_OUTPUT = `OVERALL SCORE: 72%

STRENGTHS:
• AWS lab hours named against Cost Explorer.
• VPN triage on a real queue.

PRIORITY IMPROVEMENTS:
• Add dollar or ticket-volume metrics to the Cost Explorer line.
• Name the on-call rotation and hours covered.

QUICK WINS:
• Lead each bullet with an action verb and a number.`;

const FILLED_PAYLOAD: ResumeScorePayload = {
  composite: 72,
  pillars: {
    structural: { score: 74, label: 'Structure & ATS basics' },
    onetCoverage: { score: 68, label: 'O*NET coverage' },
    marketCoverage: { score: 71, label: 'Market keywords' },
  },
  structural: {
    composite: 74,
    breakdown: {
      structure: { score: 80, weight: 0.25, notes: [] },
      quantification: { score: 62, weight: 0.25, notes: ['Add a metric to the Cost Explorer bullet.'] },
      actionVerbs: { score: 78, weight: 0.2, notes: [] },
      bulletLength: { score: 74, weight: 0.15, notes: [] },
      contact: { score: 79, weight: 0.15, notes: [] },
    },
  },
  occupations: [
    { onetCode: '15-1232.00', title: 'Computer User Support Specialists', confidence: 0.81 },
  ],
  onetCoverage: [
    {
      onetCode: '15-1232.00',
      title: 'Computer User Support Specialists',
      coverageScore: 68,
      topGaps: [
        { skill: 'On-call rotation', importance: 82, bestSimilarity: 0.21 },
        { skill: 'Azure Cost Management', importance: 74, bestSimilarity: 0.18 },
      ],
    },
  ],
  marketCoverage: [
    {
      postingCount: 42,
      source: 'cache',
      coverageScore: 71,
      mustHaveMissing: [
        { phrase: 'on-call', frequency: 0.78 },
        { phrase: 'Azure', frequency: 0.71 },
      ],
      mustHavePresent: [
        { phrase: 'AWS', frequency: 0.84 },
        { phrase: 'VPN', frequency: 0.66 },
      ],
    },
  ],
};

export default async function DevMemberResumeStrengthPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';

  return (
    <ResumeStrengthKit
      preview
      backHref="/dev/member/toolkit"
      initialResume={SEED_RESUME}
      previewOutput={filled ? FILLED_OUTPUT : undefined}
      previewPayload={filled ? FILLED_PAYLOAD : undefined}
    />
  );
}
