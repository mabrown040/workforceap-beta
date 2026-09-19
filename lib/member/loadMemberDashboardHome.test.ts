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
  mapWeeklyStudyActivity,
  pointsLedgerColor,
} from './loadMemberDashboardHome';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Alex Rivera',
    enrolledProgram: null,
    assessmentCompleted: false,
    organization: { courses: [] },
    courseEnrollments: [{ programSlug: 'it-support-professional-certificate-ibm' }],
    courseProgress: [],
    memberProgramProgress: [],
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
  missFirst?: boolean;
}) {
  let findUniqueCalls = 0;
  let txCalls = 0;
  const findUnique = async () => {
    findUniqueCalls += 1;
    if (opts.missFirst && findUniqueCalls === 1) return null;
    return opts.row === undefined ? makeRow() : opts.row;
  };
  const db = {
    $transaction: async <T,>(fn: (tx: { user: { findUnique: typeof findUnique } }) => Promise<T>) => {
      txCalls += 1;
      return fn({ user: { findUnique } });
    },
  };
  return {
    db,
    counts: () => ({ findUniqueCalls, txCalls }),
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
  assert.equal(view.firstName, 'Alex');
  assert.equal(view.coursePercent, 0);
  assert.equal(view.doThisNext?.id, 'nba-1');
});

test('loadMemberDashboardHome combines enrollment + progress into kit props', async () => {
  const { db, counts } = mockDb({
    row: makeRow({
      courseProgress: [
        {
          programSlug: 'it-support-professional-certificate-ibm',
          courseSlug: 'introduction-to-technical-support',
          courseId: 'rNyuLa-pEeytqw64hz8ZCw',
          percentComplete: 100,
          status: 'COMPLETED',
        },
        {
          programSlug: 'it-support-professional-certificate-ibm',
          courseSlug: 'introduction-to-hardware-and-operating-systems',
          courseId: 'wtYRSE1kEeyLIRLL9niz0w',
          percentComplete: 100,
          status: 'COMPLETED',
        },
      ],
    }),
  });
  const view = await loadMemberDashboardHome(
    { userId: 'member-1', fallbackDisplayName: 'Pat' },
    db,
  );
  assert.equal(view.prismaOpCount, 1);
  assert.ok(view.prismaOpCount <= MEMBER_DASHBOARD_HOME_PRISMA_BUDGET);
  assert.equal(counts().txCalls, 1);
  assert.equal(counts().findUniqueCalls, 1);
  assert.equal(view.certs, 1);
  assert.equal(view.activeJobs, 2);
  assert.equal(view.points, 250);
  assert.equal(view.currentStreak, 4);
  assert.equal(view.certModulesDone, 2);
  assert.ok((view.certModulesTotal ?? 0) >= 2);
  assert.equal(view.pipeline[0].stage, 'Interviewing');
  assert.equal(view.pointsLedger[0].color, 'accent');
  assert.ok((view.pointsThisWeek ?? 0) >= 80);
  assert.equal(view.resumeHref, '/dashboard/program');
  assert.equal(view.resumeHref, view.programHref);
  assert.notEqual(view.resumeHref, '/dashboard/training');
  assert.equal(view.programHref, '/dashboard/program');
  assert.equal(view.coursesHref, '/dashboard/learning');
  assert.equal(view.doThisNext?.href, '/dashboard/program');
  assert.notEqual(view.doThisNext?.href, '/dashboard/training');
  assert.equal(view.doThisNext?.variant, 'urgent');
  assert.equal(view.nextLesson, 'Finish Hardware module');
  assert.equal(view.toolkitHref, '/dashboard/ai-tools');
});

test('loadMemberDashboardHome shows saved progress when the member has no assigned program', async () => {
  const { db, counts } = mockDb({
    row: makeRow({
      courseEnrollments: [],
      enrolledProgram: null,
      courseProgress: [{
        programSlug: 'comptia-a-plus',
        courseSlug: 'technical-support-fundamentals',
        courseId: '7sBiclFIEeetjQ5ppGVTyA',
        percentComplete: 93,
        status: 'IN_PROGRESS',
      }],
      memberProgramProgress: [
        {
          programSlug: 'comptia-a-plus',
          averagePercent: 93,
          coursesCompleted: 0,
        },
      ],
    }),
  });
  const view = await loadMemberDashboardHome(
    { userId: 'member-progress-only', fallbackDisplayName: 'Pat' },
    db,
  );

  assert.equal(view.prismaOpCount, 1);
  assert.equal(view.noProgram, true);
  assert.ok(view.coursePercent > 0 && view.coursePercent < 100);
  assert.equal(view.certModulesDone, 0);
  assert.equal(view.programStatus, 'In progress');
  assert.match(view.programTitle ?? '', /CompTIA A\+/i);
  assert.equal(view.programHref, '/dashboard/program');
  assert.equal(view.coursesHref, '/dashboard/learning');
});

test('loadMemberDashboardHome never reports 100% from one completed alias row in a multi-course program', async () => {
  const { db } = mockDb({
    row: makeRow({
      courseEnrollments: [{ programSlug: 'comptia-a-professional-certificate' }],
      enrolledProgram: null,
      memberProgramProgress: [{
        programSlug: 'comptia-a-plus',
        averagePercent: 100,
        coursesCompleted: 1,
      }],
      courseProgress: [{
        programSlug: 'comptia-a-plus',
        courseSlug: 'technical-support-fundamentals',
        courseId: '7sBiclFIEeetjQ5ppGVTyA',
        percentComplete: 100,
        status: 'COMPLETED',
      }],
    }),
  });

  const view = await loadMemberDashboardHome(
    { userId: 'member-alias-progress', fallbackDisplayName: 'Pat' },
    db,
  );

  assert.equal(view.certModulesDone, 1);
  assert.ok(view.certModulesTotal > 1);
  assert.ok(view.coursePercent > 0 && view.coursePercent < 100);
  assert.equal(view.programStatus, 'In progress');
});

test('loadMemberDashboardHome provisions an orphan then re-reads once', async () => {
  const { db, counts } = mockDb({ missFirst: true });
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
  assert.equal(view.weeklyActivity.length, 7);
  assert.equal(view.weeklyActivity.every((day) => day.minutes === 0), true);
  assert.equal(view.doThisNext?.id, 'choose_program');
  assert.equal(view.doThisNext?.href, '/dashboard/program');
  assert.equal(view.programHref, '/dashboard/program');
  assert.equal(view.coursesHref, '/dashboard/learning');
  assert.equal(view.toolkitHref, '/dashboard/ai-tools');
  assert.equal(view.nextLesson, 'Choose your program');
  assert.equal(view.programTitle, undefined);
  assert.equal(view.programStatus, undefined);
});

test('loadMemberDashboardHome falls back to buildNextBestActions when no persisted rows exist', async () => {
  const { db } = mockDb({
    row: makeRow({
      nextBestActions: [],
      enrolledProgram: null,
      courseEnrollments: [],
      assessmentCompleted: false,
    }),
  });
  const view = await loadMemberDashboardHome(
    { userId: 'fresh-1', fallbackDisplayName: 'fresh@example.com' },
    db,
  );
  assert.equal(view.doThisNext?.id, 'choose_program');
  assert.equal(view.doThisNext?.href, '/dashboard/program');
  assert.equal(view.doThisNext?.cta, 'Choose program');
  assert.match(view.ungatedDigitalBasicsHref, /digital-literacy-empowerment-class-course-1/);
});

test('loader module imports only pure Coursera reconciliation, never providers or member-state fanout', () => {
  const src = readFileSync(path.join(ROOT, 'lib/member/loadMemberDashboardHome.ts'), 'utf8');
  const imports = src.split('\n').filter((line) => line.startsWith('import')).join('\n');
  assert.doesNotMatch(imports, /b4b|programCourseList|learnerProgress/i);
  assert.doesNotMatch(imports, /b4b/i);
  assert.doesNotMatch(imports, /getMemberState/);
  assert.match(src, /buildNextBestActions/);
  assert.match(src, /assessmentCompleted: true/);
  assert.doesNotMatch(imports, /maybeAutoSync/);
  assert.doesNotMatch(imports, /getCache/);
  assert.match(src, /from '@\/lib\/coursera\/progressReconciliation/);
  assert.doesNotMatch(src, /nextLesson: 'Continue your training'/);
  assert.doesNotMatch(src, /'Up next'/);
  assert.doesNotMatch(src, /\?\? 'there'/);
});

test('loadMemberDashboardHome falls back to buildNextBestActions when NBA rows are empty', async () => {
  const { db, counts } = mockDb({
    row: makeRow({
      nextBestActions: [],
      courseEnrollments: [],
      enrolledProgram: null,
      assessmentCompleted: false,
    }),
  });
  const view = await loadMemberDashboardHome(
    { userId: 'fresh-member', fallbackDisplayName: 'Sam' },
    db,
  );

  assert.equal(view.prismaOpCount, 1);
  assert.equal(counts().findUniqueCalls, 1);
  assert.equal(view.doThisNext?.id, 'choose_program');
  assert.equal(view.doThisNext?.href, '/dashboard/program');
  assert.equal(view.doThisNext?.cta, 'Choose program');
  assert.equal(view.nextLesson, 'Choose your program');
  assert.notEqual(view.nextLesson, undefined);
});

test('loadMemberDashboardHome surfaces preassessment when enrolled and NBA rows are empty', async () => {
  const { db } = mockDb({
    row: makeRow({
      nextBestActions: [],
      assessmentCompleted: false,
    }),
  });
  const view = await loadMemberDashboardHome(
    { userId: 'enrolled-unassessed', fallbackDisplayName: 'Sam' },
    db,
  );

  assert.equal(view.prismaOpCount, 1);
  assert.equal(view.doThisNext?.id, 'skills_assessment');
  assert.equal(view.doThisNext?.href, '/dashboard/assessment');
  assert.equal(view.nextLesson, 'Complete your Training Preassessment');
});

test('loadMemberDashboardHome keeps a persisted NBA ahead of the heuristic fallback', async () => {
  const { db } = mockDb({
    row: makeRow({
      assessmentCompleted: false,
      nextBestActions: [{
        id: 'nba-persisted',
        title: 'Finish Hardware module',
        description: 'Resume where you left off',
        ctaHref: '/dashboard/program',
        ctaLabel: 'Continue',
        priority: 5,
      }],
    }),
  });
  const view = await loadMemberDashboardHome(
    { userId: 'persisted-nba', fallbackDisplayName: 'Sam' },
    db,
  );

  assert.equal(view.doThisNext?.id, 'nba-persisted');
  assert.equal(view.nextLesson, 'Finish Hardware module');
});

test('loadMemberDashboardHome names the next incomplete course when NBA rows are empty', async () => {
  const { db } = mockDb({
    row: makeRow({
      nextBestActions: [],
      assessmentCompleted: true,
    }),
  });
  const view = await loadMemberDashboardHome(
    { userId: 'in-training', fallbackDisplayName: 'Sam' },
    db,
  );

  assert.equal(view.prismaOpCount, 1);
  assert.ok(view.doThisNext);
  assert.ok(
    view.doThisNext.id === 'continue_training' || view.doThisNext.id === 'launch_first_course',
    `expected a training next step, got ${view.doThisNext.id}`,
  );
  assert.notEqual(view.doThisNext.href, '/dashboard');
  assert.ok(view.nextLesson && view.nextLesson.length > 0);
});

test('mapWeeklyStudyActivity buckets recent course activity into seven local days', () => {
  const now = new Date('2026-09-19T15:00:00');
  const twoDaysAgo = new Date('2026-09-17T18:00:00');
  const today = new Date('2026-09-19T09:00:00');
  const series = mapWeeklyStudyActivity(
    [
      { lastActivityAt: twoDaysAgo, status: 'COMPLETED' },
      { lastActivityAt: today, status: 'IN_PROGRESS' },
    ],
    now,
  );
  assert.equal(series.length, 7);
  assert.equal(series[4]?.minutes, 45);
  assert.equal(series[6]?.minutes, 25);
  assert.equal(series.reduce((sum, day) => sum + day.minutes, 0), 70);
});

test('kit-default dashboard page calls the loader and has no prisma. on that branch', () => {
  const src = readFileSync(path.join(ROOT, 'app/(portal)/dashboard/page.tsx'), 'utf8');
  const kitStart = src.indexOf("if (args.requestedUi !== 'legacy')");
  const legacyStart = src.indexOf('await loadMemberCareerBriefBundleSafe');
  assert.ok(kitStart > 0, 'kit branch missing');
  assert.ok(legacyStart > kitStart, 'legacy branch missing');
  const kitBlock = src.slice(kitStart, legacyStart);
  assert.match(kitBlock, /loadMemberDashboardHome/);
  assert.match(kitBlock, /weeklyActivity=\{home\.weeklyActivity\}/);
  assert.doesNotMatch(kitBlock, /prisma\./);
  assert.doesNotMatch(kitBlock, /maybeAutoSyncCourseraOnDashboard/);
  assert.doesNotMatch(kitBlock, /fetchLearnerProgressFromB4B/);
  assert.doesNotMatch(kitBlock, /getMemberState/);
});
