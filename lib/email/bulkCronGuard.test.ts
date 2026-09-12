import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const bulkEmailCronRoutes = [
  'app/api/cron/applicant-followup/route.ts',
  'app/api/cron/at-risk-alerts/route.ts',
  'app/api/cron/course-accountability/route.ts',
  'app/api/cron/employer-pending-applicants/route.ts',
  'app/api/cron/inactive-nudge/route.ts',
  'app/api/cron/inactivity-nudge/route.ts',
  'app/api/cron/interview-reminders/route.ts',
  'app/api/cron/job-alerts/route.ts',
  'app/api/cron/job-expiry/route.ts',
  'app/api/cron/milestone-celebration/route.ts',
  'app/api/cron/partner-outcome-digest/route.ts',
  'app/api/cron/placement-survey/route.ts',
  'app/api/cron/weekly-recap/route.ts',
];

test('every actual bulk email cron uses the shared bounded pacer', () => {
  for (const path of bulkEmailCronRoutes) {
    const source = readFileSync(path, 'utf8');
    const pacingSource = path.endsWith('/placement-survey/route.ts')
      ? source + readFileSync('lib/cron/placement-surveys.ts', 'utf8')
      : path.endsWith('/at-risk-alerts/route.ts')
        ? source + readFileSync('lib/cron/at-risk-alerts.ts', 'utf8')
        : source;
    assert.match(pacingSource, /createBulkEmailCronPacer/, `${path} must use the shared bulk email pacer`);
    assert.doesNotMatch(source, /setTimeout\s*\(/, `${path} must not carry a local pacing loop`);
  }
});

test('all Vercel bulk email cron schedules run off the top of the hour', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as { crons: Array<{ path: string; schedule: string }> };
  const bulkPaths = new Set(bulkEmailCronRoutes.map((path) => `/${path.replace(/^app\//, '').replace(/\/route\.ts$/, '')}`));
  for (const cron of config.crons.filter((entry) => bulkPaths.has(entry.path))) {
    assert.notEqual(cron.schedule.split(/\s+/)[0], '0', `${cron.path} remains scheduled at :00`);
  }
});

test('inactive nudge reports fixture/deadline pacing skips separately from failures', () => {
  const source = readFileSync('app/api/cron/inactive-nudge/route.ts', 'utf8');
  assert.match(source, /skipped/);
  assert.match(source, /result\.skipped/);
  assert.match(source, /inactiveEmailsSkipped/);
});
