import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  MEMBER_DASHBOARD_HOME_PRISMA_BUDGET,
  deriveNextBadge,
  loadMemberDashboardHome,
  mapGoalSummaries,
  mapPipelineRows,
  mapPointsLedger,
  pointsLedgerColor,
} from './loadMemberDashboardHome';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Alex Rivera',
    enrolledProgram: null,
    courseEnrollments: [{ programSlug: 'it-support-professional-certificate-ibm' }],
    memberPoints: { totalPoints: 250, currentStreak: 4, longestStreak: 9 },
    nextBestActions: [
      {
        id: 'nba-1',
        title: 'Finish Hardware module',
        description: 'Resume where you left off',
        ctaHref: '/dashboard/training',
        ctaLabel: 'Continue',
        priority: 5,
      },
    ],
    jobApplications: [
      {
        role: 'Help Desk Tech',
        company: 'Acme',
        status: 'INTERVIEWING',
        updatedAt: new Date('2026-08-20T12:00:00.000Z'),
      },
    ],
    goals: [
      {
        title: 'Complete first course',
        description: null,
        targetMetricValue: 1,
        currentMetricValue: 0,
      },
    ],
    pointsTransactions: [
      { event: 'course_completed', points: 75, createdAt: new Date() },
      { event: 'daily_study', points: 5, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { event: 'job_application', points: 25, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    ],
    _count: { userCertifications: 1, jobApplications: 2 },
    ...overrides,
  };
}

function mockDb(opts: {
  row?: ReturnType<typeof makeRow> | null;
  completed?: number;
  missFirst?: boolean;
}) {
  let findUniqueCalls = 0;
  let countCalls = 0;
  let txCalls = 0;
  const findUnique = async () => {
    findUniqueCalls += 1;
    if (opts.missFirst && findUniqueCalls === 1) return null;
    return opts.row === undefined ? makeRow() : opts.row;
  };
  const count = async () => {
    countCalls += 1;
    return opts.completed ?? 2;
  };
  const db = {
    $transaction: async <T,>(fn: (tx: { user: { findUnique: typeof findUnique }; courseProgress: { count: typeof count } }) => Promise<T>) => {
      txCalls += 1;
      return fn({ user: { findUnique }, courseProgress: { count } });
    },
  };
  return {
    db,
    counts: () => ({ findUniqueCalls, countCalls, txCalls }),
  };
}

test('mapPipelineRows maps JobApplicationStatus to kit stage + tone', () => {
  const rows = mapPipelineRows([
    { role: 'Admin', company: 'Co', status: 'SAVED', updatedAt: new Date('2026-06-18T00:00:00.000Z') },
    { role: 'SE', company: 'Inc', status: 'PHONE_SCREEN', updatedAt: new Date('2026-06-24T00:00:00.000Z') },
    { role: 'Cloud', company: 'Ltd', status: 'UNKNOWN', updatedAt: new Date('2026-06-29T00:00:00.000Z') },
  ]);
  assert.equal(rows[0].stage, 'Saved');
  assert.equal(rows[0].tone, 'muted');
  assert.equal(rows[1].stage, 'Screening');
  assert.equal(rows[1].tone, 'info');
  assert.equal(rows[2].stage, 'Applied');
  assert.equal(rows[2].tone, 'muted');
});

test('mapPointsLedger uses EVENT_LABELS and semantic colors', () => {
  assert.equal(pointsLedgerColor('job_application'), 'info');
  assert.equal(pointsLedgerColor('daily_study'), 'gold');
  assert.equal(pointsLedgerColor('course_completed'), 'accent');
  const ledger = mapPointsLedger([{ event: 'course_completed', points: 75 }]);
  assert.equal(ledger[0].label, 'Completed a course');
  assert.equal(ledger[0].amount, 75);
  assert.equal(ledger[0].color, 'accent');
});

test('mapGoalSummaries prefers metric ratio then step ratio', () => {
  const byMetric = mapGoalSummaries([
    { title: 'Apps', description: null, targetMetricValue: 10, currentMetricValue: 4 },
  ]);
  assert.equal(byMetric[0].percent, 40);

  const bySteps = mapGoalSummaries([
    {
      title: 'Steps',
      description: `@@WAP_GOAL_V1@@${JSON.stringify({
        note: '',
        steps: [
          { id: 'a', text: 'one', done: true },
          { id: 'b', text: 'two', done: false },
        ],
      })}`,
      targetMetricValue: null,
      currentMetricValue: 0,
    },
  ]);
  assert.equal(bySteps[0].percent, 50);
});

test('deriveNextBadge uses the points ladder then cert fallback', () => {
  const builder = deriveNextBadge({ totalPoints: 250, certCount: 0 });
  assert.equal(builder.nextBadgeName, 'Achiever');
  assert.ok(builder.nextBadgePercent > 0);
  assert.match(builder.nextBadgeRemaining, /points?$/);

  const champion = deriveNextBadge({ totalPoints: 1500, certCount: 0 });
  assert.equal(champion.nextBadgeName, 'First certification');
  assert.equal(champion.nextBadgePercent, 0);
});

test('loadMemberDashboardHome issues ≤ 2 Prisma ops and skips progress count without a slug', async () => {
  const { db, counts } = mockDb({
    row: makeRow({ courseEnrollments: [], enrolledProgram: null }),
  });
  const view = await loadMemberDashboardHome(
    { userId: 'member-1', fallbackDisplayName: 'member@example.com' },
    db,
  );
  assert.equal(view.prismaOpCount, 1);
  assert.ok(view.prismaOpCount <= MEMBER_DASHBOARD_HOME_PRISMA_BUDGET);
  assert.equal(counts().txCalls, 1);
  assert.equal(counts().findUniqueCalls, 1);
  assert.equal(counts().countCalls, 0);
  assert.equal(view.firstName, 'Alex');
  assert.equal(view.coursePercent, 0);
  assert.equal(view.doThisNext?.id, 'nba-1');
});

test('loadMemberDashboardHome combines enrollment + progress into kit props', async () => {
  const { db, counts } = mockDb({ completed: 2 });
  const view = await loadMemberDashboardHome(
    { userId: 'member-1', fallbackDisplayName: 'Pat' },
    db,
  );
  assert.equal(view.prismaOpCount, 2);
  assert.ok(view.prismaOpCount <= MEMBER_DASHBOARD_HOME_PRISMA_BUDGET);
  assert.equal(counts().txCalls, 1);
  assert.equal(counts().findUniqueCalls, 1);
  assert.equal(counts().countCalls, 1);
  assert.equal(view.certs, 1);
  assert.equal(view.activeJobs, 2);
  assert.equal(view.points, 250);
  assert.equal(view.currentStreak, 4);
  assert.equal(view.certModulesDone, 2);
  assert.ok((view.certModulesTotal ?? 0) >= 2);
  assert.equal(view.pipeline[0].stage, 'Interviewing');
  assert.equal(view.pointsLedger[0].color, 'accent');
  assert.ok((view.pointsThisWeek ?? 0) >= 80);
  assert.equal(view.resumeHref, '/dashboard/training');
  assert.equal(view.doThisNext?.variant, 'urgent');
  assert.equal(view.nextLesson, 'Finish Hardware module');
});

test('loadMemberDashboardHome provisions an orphan then re-reads once', async () => {
  const { db, counts } = mockDb({ missFirst: true, completed: 0 });
  let provisioned = 0;
  const view = await loadMemberDashboardHome(
    {
      userId: 'orphan-1',
      fallbackDisplayName: 'orphan@example.com',
      provisionIfMissing: async () => {
        provisioned += 1;
      },
    },
    db,
  );
  assert.equal(provisioned, 1);
  assert.equal(counts().txCalls, 2);
  assert.equal(view.firstName, 'Alex');
});

test('loadMemberDashboardHome returns a zeroed view when the user row is still missing', async () => {
  const { db } = mockDb({ row: null });
  const view = await loadMemberDashboardHome(
    { userId: 'gone', fallbackDisplayName: 'Jamie Lee' },
    db,
  );
  assert.equal(view.firstName, 'Jamie');
  assert.equal(view.points, 0);
  assert.equal(view.doThisNext, null);
  assert.equal(view.coursesHref, '/dashboard/program');
});

test('loader module does not import Coursera, B4B, or getMemberState', () => {
  const src = readFileSync(path.join(ROOT, 'lib/member/loadMemberDashboardHome.ts'), 'utf8');
  const imports = src.split('\n').filter((line) => line.startsWith('import')).join('\n');
  assert.doesNotMatch(imports, /coursera/i);
  assert.doesNotMatch(imports, /b4b/i);
  assert.doesNotMatch(imports, /getMemberState/);
  assert.doesNotMatch(imports, /maybeAutoSync/);
  assert.doesNotMatch(imports, /getCache/);
  assert.doesNotMatch(src, /from '@\/lib\/coursera/);
});

test('kit-default dashboard page calls the loader and has no prisma. on that branch', () => {
  const src = readFileSync(path.join(ROOT, 'app/(portal)/dashboard/page.tsx'), 'utf8');
  const kitStart = src.indexOf("if (args.requestedUi !== 'legacy')");
  const legacyStart = src.indexOf('await loadMemberCareerBriefBundleSafe');
  assert.ok(kitStart > 0, 'kit branch missing');
  assert.ok(legacyStart > kitStart, 'legacy branch missing');
  const kitBlock = src.slice(kitStart, legacyStart);
  assert.match(kitBlock, /loadMemberDashboardHome/);
  assert.doesNotMatch(kitBlock, /prisma\./);
  assert.doesNotMatch(kitBlock, /maybeAutoSyncCourseraOnDashboard/);
  assert.doesNotMatch(kitBlock, /fetchLearnerProgressFromB4B/);
  assert.doesNotMatch(kitBlock, /getMemberState/);
});
