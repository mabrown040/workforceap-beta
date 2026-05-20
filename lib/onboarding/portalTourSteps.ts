import type { TourStep } from '@/components/onboarding/PortalTour';

/** Three-step first-visit tour for members created within the last 24 hours. */
export const MEMBER_PORTAL_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-progress-card',
    title: 'Welcome',
    body: 'Your dashboard shows where you are — track application status, training progress, and your next milestone here.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-first-value',
    title: "Pick what's next",
    body: 'These three actions are picked for you right now. Tap any card to jump straight into your highest-impact next step.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-coach',
    title: 'Need help?',
    body: 'Tap Coach anytime for AI guidance on applications, training, interviews, and career questions.',
    placement: 'bottom',
  },
];

export const EMPLOYER_PORTAL_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-overview',
    title: 'Your dashboard',
    body: 'See active job stats, pending work, and alerts at a glance.',
    placement: 'right',
  },
  {
    targetId: 'tour-work-queue',
    title: 'Work queue',
    body: 'Daily action items — candidates to review, interviews to schedule, stale postings.',
    placement: 'right',
  },
  {
    targetId: 'tour-jobs',
    title: 'Job postings',
    body: 'Post new roles, import from your job board or LinkedIn, and manage live postings.',
    placement: 'right',
  },
  {
    targetId: 'tour-applicants',
    title: 'Applicants',
    body: 'Review every candidate who applied. Filter by program, status, or match score.',
    placement: 'right',
  },
  {
    targetId: 'tour-pipeline',
    title: 'Hiring pipeline',
    body: 'Track candidates from reviewed → interviewed → offered on a visual board.',
    placement: 'right',
  },
  {
    targetId: 'tour-matches',
    title: 'AI matches',
    body: 'AI-suggested candidates for your open roles based on skills and program fit.',
    placement: 'right',
  },
  {
    targetId: 'tour-messages',
    title: 'Messages',
    body: 'Chat with the WorkforceAP team about postings, applicants, and hiring.',
    placement: 'right',
  },
  {
    targetId: 'tour-post-job',
    title: 'Post your first job',
    body: "Takes about 2 minutes. We'll match you with qualified candidates automatically.",
    placement: 'bottom',
  },
];

export const PARTNER_PORTAL_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-overview',
    title: 'Partner dashboard',
    body: 'Your referred members and their current status — all in one view.',
    placement: 'right',
  },
  {
    targetId: 'tour-members',
    title: 'Your members',
    body: "Everyone you've referred. Click any member to see their full journey.",
    placement: 'right',
  },
  {
    targetId: 'tour-attention',
    title: 'Needs attention',
    body: 'Members who may need a nudge — stalled applications, inactive, at risk.',
    placement: 'right',
  },
  {
    targetId: 'tour-outcomes',
    title: 'Outcomes',
    body: 'Track placements and employment outcomes for your referrals.',
    placement: 'right',
  },
  {
    targetId: 'tour-messages',
    title: 'Messages',
    body: 'Reach the WorkforceAP team about referrals, milestones, and partner support.',
    placement: 'right',
  },
  {
    targetId: 'tour-referral-link',
    title: 'Your referral link',
    body: 'Share this link with community members to track their journey back to you.',
    placement: 'bottom',
  },
];
