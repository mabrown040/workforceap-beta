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
    id: 'inactivity-nudge',
    name: 'Inactivity Nudge (14-Day)',
    description: 'Sends re-engagement email to enrolled members with 14+ days of inactivity.',
    schedule: '0 10 * * 3',
    scheduleLabel: 'Wednesday 10AM UTC',
    apiPath: '/api/cron/inactivity-nudge',
    method: 'GET',
    icon: 'schedule_send',
    category: 'member',
    audienceDescription: 'Enrolled members inactive 14+ days',
    workflowKey: 'cron_inactivity_nudge',
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
  {
    id: 'milestone-celebration',
    name: 'Milestone Celebration',
    description: 'Sends celebration emails for newly completed programs.',
    schedule: '0 11 * * *',
    scheduleLabel: 'Daily 11AM UTC',
    apiPath: '/api/cron/milestone-celebration',
    method: 'GET',
    icon: 'celebration',
    category: 'member',
    audienceDescription: 'Members who completed a program since yesterday',
    workflowKey: 'cron_milestone_celebration',
  },
  {
    id: 'smoke-test',
    name: 'Endpoint Smoke Test',
    description: 'HTTP checks on critical public paths to catch 500s/404s from bad deploys.',
    schedule: '0 * * * *',
    scheduleLabel: 'Hourly',
    apiPath: '/api/cron/smoke-test',
    method: 'GET',
    icon: 'wifi_tethering',
    category: 'admin',
    audienceDescription: 'Internal monitoring — no emails sent',
    workflowKey: 'cron_smoke_test',
  },
  {
    id: 'deploy-health',
    name: 'Vercel Deploy Health',
    description: 'Queries Vercel API to verify latest production deployment is READY, not ERROR.',
    schedule: '0 * * * *',
    scheduleLabel: 'Hourly',
    apiPath: '/api/cron/deploy-health',
    method: 'GET',
    icon: 'cloud_done',
    category: 'admin',
    audienceDescription: 'Internal monitoring — no emails sent',
    workflowKey: 'cron_deploy_health',
  },
  {
    id: 'verification',
    name: 'Cron Run Verification',
    description: 'Daily verification that all member-facing cron jobs actually executed in the last 24h.',
    schedule: '0 11 * * *',
    scheduleLabel: 'Daily 11AM UTC',
    apiPath: '/api/cron/verification',
    method: 'GET',
    icon: 'fact_check',
    category: 'admin',
    audienceDescription: 'Internal monitoring — no emails sent',
    workflowKey: 'cron_verification',
  },
];

export const CRON_CATEGORY_COLOR: Record<CronDef['category'], string> = {
  member: 'var(--color-accent)',
  admin: 'var(--color-blue, #2b7bb9)',
  partner: 'var(--color-gold)',
  employer: 'var(--color-green, #4a9b4f)',
};
