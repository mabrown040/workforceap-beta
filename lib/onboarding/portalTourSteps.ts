import type { TourStep } from '@/components/onboarding/PortalTour';

export const MEMBER_PORTAL_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-dashboard',
    title: 'Your home base',
    body: 'Track your application status, program progress, and next steps.',
    placement: 'right',
  },
  {
    targetId: 'tour-profile',
    title: 'Complete your profile',
    body: 'A complete profile helps us match you to jobs faster.',
    placement: 'right',
  },
  {
    targetId: 'tour-programs',
    title: 'Your program',
    body: 'Course materials, progress tracking, and certification milestones.',
    placement: 'right',
  },
  {
    targetId: 'tour-jobs',
    title: 'Job board',
    body: 'Curated jobs matched to your program and skills. Apply directly.',
    placement: 'right',
  },
  {
    targetId: 'tour-resources',
    title: 'Resources',
    body: 'Resume templates, interview prep, and career guides.',
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
    body: 'Post new roles, import from your ATS or LinkedIn, and manage live postings.',
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
    body: 'Track candidates from reviewed → interviewed → offered. Kanban-style.',
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
