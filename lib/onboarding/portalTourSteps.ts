import type { TourStep } from '@/components/onboarding/PortalTour';

export const MEMBER_PORTAL_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-dashboard',
    title: 'Dashboard',
    body: 'Your home base. Track your application status, program progress, and next steps all in one place.',
    placement: 'right',
  },
  {
    targetId: 'tour-ai-tools',
    title: 'AI Tools',
    body: 'Power up your job search with AI — resume help, cover letters, interview practice, and more.',
    placement: 'right',
  },
  {
    targetId: 'tour-learning',
    title: 'Learning',
    body: 'Access your courses, training materials, and skill-building resources.',
    placement: 'right',
  },
  {
    targetId: 'tour-messages',
    title: 'Messages',
    body: 'Stay connected with your counselor and the WorkforceAP team.',
    placement: 'right',
  },
  {
    targetId: 'tour-profile',
    title: 'Profile',
    body: 'Keep your profile up to date so we can match you with the best opportunities.',
    placement: 'right',
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
