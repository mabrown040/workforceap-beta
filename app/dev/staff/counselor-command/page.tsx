import { notFound } from 'next/navigation';
import {
  CounselorHomeKit,
  type CounselorQueueRow,
  type CounselorSessionRow,
} from '@/components/portal/kit/pages/counselor/CounselorHomeKit';

/**
 * Storybook-lite showcase — CounselorHomeKit "Command Center" (fully
 * populated, every optional prop wired). Preview-only, no auth/DB.
 * See app/dev/member/home/page.tsx for the pattern this mirrors.
 */
export const dynamic = 'force-dynamic';

const QUEUE_ROWS: CounselorQueueRow[] = [
  {
    memberId: 'm1',
    memberName: 'Destiny Ford',
    bucket: 'critical',
    blockerReason: 'No activity 10+ days',
    enrolledProgram: 'Cloud & IT',
    daysSinceLogin: 14,
  },
  {
    memberId: 'm2',
    memberName: 'Marcus DeLeon',
    bucket: 'critical',
    blockerReason: 'Counselor reply overdue (48h+)',
    enrolledProgram: 'Data & AI',
    hoursWaitingReply: 61,
  },
  {
    memberId: 'm3',
    memberName: 'Aaliyah Washington',
    bucket: 'critical',
    blockerReason: 'No activity 10+ days',
    enrolledProgram: 'Healthcare',
    daysSinceLogin: 17,
  },
  {
    memberId: 'm4',
    memberName: 'Hoang Tran',
    bucket: 'warning',
    blockerReason: 'Counselor reply overdue (24h+)',
    enrolledProgram: 'Skilled Trades',
    hoursWaitingReply: 27,
  },
  {
    memberId: 'm5',
    memberName: 'Sofia Reyes-Martinez',
    bucket: 'warning',
    blockerReason: 'Training stalled',
    enrolledProgram: 'Cloud & IT',
    daysSinceLogin: 6,
  },
  {
    memberId: 'm6',
    memberName: 'Priya Natarajan',
    bucket: 'warning',
    blockerReason: 'Needs computer support follow-up',
    enrolledProgram: 'Data & AI',
    daysSinceLogin: 4,
  },
  {
    memberId: 'm7',
    memberName: 'Jordan Alvarez',
    bucket: 'ontrack',
    blockerReason: 'On track',
    enrolledProgram: 'Manufacturing',
    daysSinceLogin: 1,
  },
];

const SESSIONS: CounselorSessionRow[] = [
  { memberId: 'm3', memberName: 'Aaliyah Washington', role: 'Registered Nurse — Ascension Seton', lastRunAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
  { memberId: 'm7', memberName: 'Jordan Alvarez', role: 'CNC Machinist — Tesla Gigafactory', lastRunAt: new Date(Date.now() - 22 * 60 * 60 * 1000) },
  { memberId: 'm5', memberName: 'Sofia Reyes-Martinez', role: 'Cloud Support Associate — Indeed', lastRunAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
];

export default function DevStaffCounselorCommandPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <CounselorHomeKit
      firstName="Alex"
      assignedCount={42}
      atRiskCount={6}
      needsReplyCount={4}
      onTrackCount={32}
      slaBreachCount={2}
      assignedSpark={{ series: [36, 37, 38, 39, 40, 41, 42], delta: '6', direction: 'up' }}
      atRiskSpark={{ series: [3, 4, 4, 5, 5, 6, 6], delta: '3', direction: 'down' }}
      needsReplySpark={{ series: [2, 3, 5, 4, 6, 5, 4], delta: '2', direction: 'down' }}
      onTrackSpark={{ series: [26, 27, 28, 29, 30, 31, 32], delta: '6', direction: 'up' }}
      queueRows={QUEUE_ROWS}
      queueTotal={QUEUE_ROWS.length}
      sessions={SESSIONS}
      activity={[
        { label: 'Mon', value: 18 },
        { label: 'Tue', value: 22 },
        { label: 'Wed', value: 15 },
        { label: 'Thu', value: 27 },
        { label: 'Fri', value: 24 },
        { label: 'Sat', value: 9 },
        { label: 'Sun', value: 12 },
      ]}
      activityDeltaLabel="+19% touchpoints vs last week"
      bucketCounts={{ critical: 3, warning: 3, ontrack: 32 }}
    />
  );
}
