/** Pure constants and helpers — safe for both server and client components. */

export const POINT_VALUES: Record<string, number> = {
  assessment_completed:    100,
  program_enrolled:        150,
  resume_uploaded:          50,
  course_completed:         75,
  pathway_step_completed:   15,
  certification_earned:    200,
  interview_requested:     100,
  counselor_session:        50,
  job_application:          25,
  placement_recorded:      500,
  counselor_bonus:           0,
  // Member-to-member referral. Both sides rewarded, but only once the referee
  // actually enrolls in a program (not at signup) — see lib/member/referrals.ts.
  referral_referrer_reward: 150,
  referral_referee_reward:  100,
  // Daily-activity streak driver — awarded at most once per UTC calendar day
  // per member (see lib/xapi/inboundStatementPipeline.ts). entityId is the
  // UTC date string, so PointsTransaction's (userId, event, entityId) unique
  // constraint enforces the once-per-day cap.
  daily_study:               5,
};

export const LEVELS = [
  { name: 'starter',  min: 0,    max: 199,      label: 'Starter',  color: '#6b7280' },
  { name: 'builder',  min: 200,  max: 499,      label: 'Builder',  color: '#2563eb' },
  { name: 'achiever', min: 500,  max: 999,      label: 'Achiever', color: '#7c3aed' },
  { name: 'champion', min: 1000, max: Infinity, label: 'Champion', color: '#d97706' },
] as const;

export type LevelName = 'starter' | 'builder' | 'achiever' | 'champion';

export function getLevelForPoints(points: number) {
  return LEVELS.find((l) => points >= l.min && points <= l.max) ?? LEVELS[0];
}

export function getNextLevel(current: LevelName) {
  const idx = LEVELS.findIndex((l) => l.name === current);
  return idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

export const EVENT_LABELS: Record<string, string> = {
  assessment_completed:   'Completed Training Preassessment',
  program_enrolled:       'Enrolled in program',
  resume_uploaded:        'Uploaded resume',
  course_completed:       'Completed a course',
  pathway_step_completed: 'Completed a learning step',
  certification_earned:   'Earned a certification',
  interview_requested:    'Requested interview',
  counselor_session:      'AI Counselor session',
  job_application:        'Added a job application',
  placement_recorded:     'Job placement confirmed',
  counselor_bonus:        'Bonus from counselor',
  referral_referrer_reward: 'A friend you referred enrolled',
  referral_referee_reward:  'Joined through a friend’s referral',
  daily_study:              'Studied today',
};
