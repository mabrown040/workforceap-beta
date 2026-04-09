/**
 * Central registry of all WorkforceAP email/workflow cron jobs.
 * Single source of truth for schedule, description, audience, and API path.
 *
 * Each entry maps to a route under /api/cron/* and a schedule in vercel.json.
 */

export type CronDef = {
  id: string;
  name: string;
  description: string;
  schedule: string; // cron expression
  scheduleLabel: string; // human-readable
  apiPath: string; // relative, e.g. /api/cron/weekly-recap
  method: 'GET' | 'POST';
  icon: string; // material-symbols name
  category: 'member' | 'admin' | 'partner' | 'employer';
  audienceDescription: string; // who gets the email
  workflowKey: string; // matches WorkflowDiagnostic.workflow prefix for history lookup
};

export const CRON_REGISTRY: CronDef[] = [
  {
    id: 'weekly-recap',
    name: 'Weekly Recap Email',
    description: 'Sends a personalized weekly recap to enrolled members who have not received one this week.',
    schedule: '0 18 * * 0',
    scheduleLabel: 'Sunday 6PM UTC',
    apiPath: '/api/cron/weekly-recap',
    method: 'GET',
    icon: 'event_note',
    category: 'member',
    audienceDescription: 'Enrolled members with no recap this week',
    workflowKey: 'cron_weekly_recap',
  },
  {
    id: 'inactive-nudge',
    name: 'Inactive Nudge (All Members)',
    description: 'Sends re-engagement email to any member (enrolled or not) with 7+ days of inactivity who has reminders enabled.',
    schedule: '0 10 * * *',
    scheduleLabel: 'Daily 10AM UTC',
    apiPath: '/api/cron/inactive-nudge',
    method: 'GET',
    icon: 'person_off',
    category: 'member',
    audienceDescription: 'All members with reminders on, inactive 7+ days',
    workflowKey: 'cron_inactive_nudge',
  },
  {
    id: 'applicant-followup',
    name: 'Applicant Day-3 Follow-up',
    description: 'Day 3 status update to applicants with pending applications, plus admin alert for stale queue.',
    schedule: '0 11 * * *',
    scheduleLabel: 'Daily 11AM UTC',
    apiPath: '/api/cron/applicant-followup',
    method: 'GET',
    icon: 'follow_the_signs',
    category: 'member',
    audienceDescription: 'Applicants with pending status 3+ days old',
    workflowKey: 'cron_applicant_followup',
  },
  {
    id: 'weekly-recap-email',
    name: 'Admin Weekly Recap',
    description: 'Weekly summary to WorkforceAP staff: new applicants, placements, at-risk students, pending applications.',
    schedule: '0 22 * * 5',
    scheduleLabel: 'Friday 10PM UTC (4PM CT)',
    apiPath: '/api/cron/weekly-recap-email',
    method: 'GET',
    icon: 'summarize',
    category: 'admin',
    audienceDescription: 'Internal WorkforceAP admin team',
    workflowKey: 'cron_weekly_recap_email',
  },
  {
    id: 'partner-outcome-digest',
    name: 'Partner Weekly Digest',
    description: 'Weekly referral outcome digest to each active partner — pipeline stage counts + weekly wins.',
    schedule: '0 13 * * 1',
    scheduleLabel: 'Monday 1PM UTC',
    apiPath: '/api/cron/partner-outcome-digest',
    method: 'GET',
    icon: 'handshake',
    category: 'partner',
    audienceDescription: 'Active partners with contact emails',
    workflowKey: 'cron_partner_digest',
  },
];

export const CRON_CATEGORY_COLOR: Record<CronDef['category'], string> = {
  member: 'var(--color-accent)',
  admin: 'var(--color-blue, #2b7bb9)',
  partner: 'var(--color-gold)',
  employer: 'var(--color-green, #4a9b4f)',
};
