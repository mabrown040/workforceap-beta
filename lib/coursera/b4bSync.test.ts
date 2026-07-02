import test from 'node:test';
import assert from 'node:assert/strict';

import { CourseProgressStatus } from '@prisma/client';

import {
  computeCourseProgressUpdate,
  nextEnrollmentReportStart,
  type B4BProgressInput,
  type ExistingCourseProgress,
} from './b4bSync';

/**
 * Unit tests for the pure `computeCourseProgressUpdate` merge helper —
 * this is the read-before-write guard for B4B → CourseProgress sync.
 *
 * Why these tests matter (i.e. why you can't "simplify" them away):
 *   - Coursera B4B `overallProgress` is course-level and rounds to 0 when
 *     only a single quiz is done. We need the `lastActivityAt` promotion.
 *   - xAPI may credit COMPLETED before B4B's enrollmentReports reflects it.
 *     The downgrade guard prevents the next sync from "uncompleting" a row.
 */

const baseReport: B4BProgressInput = {
  isCompleted: false,
  overallProgress: 0,
  lastActivityAt: null,
};

test('B4B returns lastActivity but overallProgress=0 → status: IN_PROGRESS', () => {
  const result = computeCourseProgressUpdate(null, {
    isCompleted: false,
    overallProgress: 0,
    lastActivityAt: 1_715_000_000_000, // some epoch ms
  });
  assert.equal(result.status, CourseProgressStatus.IN_PROGRESS);
  assert.equal(result.percentComplete, 0);
  assert.ok(result.lastActivityAt instanceof Date);
  assert.equal(result.lastActivityAt!.getTime(), 1_715_000_000_000);
});

test('Existing row COMPLETED + B4B says NOT_STARTED → kept COMPLETED (and 100%)', () => {
  const existing: ExistingCourseProgress = {
    status: CourseProgressStatus.COMPLETED,
    percentComplete: 100,
    lastActivityAt: new Date(1_700_000_000_000),
  };
  const result = computeCourseProgressUpdate(existing, baseReport);
  assert.equal(result.status, CourseProgressStatus.COMPLETED);
  assert.equal(result.percentComplete, 100);
  // existing lastActivityAt preserved (B4B has none to offer)
  assert.equal(result.lastActivityAt!.getTime(), 1_700_000_000_000);
});

test('Existing row 50% + B4B says 30% → kept 50%, status stays IN_PROGRESS', () => {
  const existing: ExistingCourseProgress = {
    status: CourseProgressStatus.IN_PROGRESS,
    percentComplete: 50,
    lastActivityAt: new Date(1_700_000_000_000),
  };
  const result = computeCourseProgressUpdate(existing, {
    isCompleted: false,
    overallProgress: 30,
    lastActivityAt: 1_710_000_000_000,
  });
  assert.equal(result.status, CourseProgressStatus.IN_PROGRESS);
  assert.equal(result.percentComplete, 50);
  // takes the more recent lastActivityAt
  assert.equal(result.lastActivityAt!.getTime(), 1_710_000_000_000);
});

test('lastActivityAt persisted from epoch ms', () => {
  const epochMs = 1_714_500_000_000;
  const result = computeCourseProgressUpdate(null, {
    isCompleted: false,
    overallProgress: 5,
    lastActivityAt: epochMs,
  });
  assert.ok(result.lastActivityAt instanceof Date);
  assert.equal(result.lastActivityAt!.getTime(), epochMs);
});

test('Both null → NOT_STARTED (existing behavior preserved)', () => {
  const result = computeCourseProgressUpdate(null, baseReport);
  assert.equal(result.status, CourseProgressStatus.NOT_STARTED);
  assert.equal(result.percentComplete, 0);
  assert.equal(result.lastActivityAt, null);
});

test('Existing IN_PROGRESS + B4B has no signal → kept IN_PROGRESS (no demotion)', () => {
  const existing: ExistingCourseProgress = {
    status: CourseProgressStatus.IN_PROGRESS,
    percentComplete: 25,
    lastActivityAt: new Date(1_700_000_000_000),
  };
  const result = computeCourseProgressUpdate(existing, baseReport);
  assert.equal(result.status, CourseProgressStatus.IN_PROGRESS);
  assert.equal(result.percentComplete, 25);
});

test('B4B isCompleted true → status COMPLETED + percentComplete forced to 100', () => {
  const existing: ExistingCourseProgress = {
    status: CourseProgressStatus.IN_PROGRESS,
    percentComplete: 60,
    lastActivityAt: new Date(1_700_000_000_000),
  };
  const result = computeCourseProgressUpdate(existing, {
    isCompleted: true,
    // B4B's overallProgress sometimes lags behind isCompleted, hence forcing 100.
    overallProgress: 92,
    lastActivityAt: 1_710_000_000_000,
  });
  assert.equal(result.status, CourseProgressStatus.COMPLETED);
  assert.equal(result.percentComplete, 100);
});

test('Existing percent higher than new percent on already-COMPLETED row stays 100', () => {
  const existing: ExistingCourseProgress = {
    status: CourseProgressStatus.COMPLETED,
    percentComplete: 100,
    lastActivityAt: new Date(1_700_000_000_000),
  };
  const result = computeCourseProgressUpdate(existing, {
    isCompleted: false,
    overallProgress: 30,
    lastActivityAt: 1_710_000_000_000,
  });
  assert.equal(result.status, CourseProgressStatus.COMPLETED);
  assert.equal(result.percentComplete, 100);
  // lastActivityAt still advances
  assert.equal(result.lastActivityAt!.getTime(), 1_710_000_000_000);
});

test('Existing lastActivityAt newer than B4B → keeps existing', () => {
  const existing: ExistingCourseProgress = {
    status: CourseProgressStatus.IN_PROGRESS,
    percentComplete: 10,
    lastActivityAt: new Date(1_715_000_000_000),
  };
  const result = computeCourseProgressUpdate(existing, {
    isCompleted: false,
    overallProgress: 12,
    lastActivityAt: 1_710_000_000_000, // older than existing
  });
  assert.equal(result.lastActivityAt!.getTime(), 1_715_000_000_000);
});

test('overallProgress = 0 and lastActivityAt = 0 → NOT_STARTED (zero is not "engagement")', () => {
  // Coursera occasionally returns lastActivity: 0 to mean "never".
  const result = computeCourseProgressUpdate(null, {
    isCompleted: false,
    overallProgress: 0,
    lastActivityAt: 0,
  });
  assert.equal(result.status, CourseProgressStatus.NOT_STARTED);
});

test('nextEnrollmentReportStart: full page with no total keeps paging (no one-page truncation)', () => {
  assert.equal(
    nextEnrollmentReportStart({ start: 0, batchLength: 1000, limit: 1000, total: undefined }),
    1000,
  );
});

test('nextEnrollmentReportStart: short page with no total ends', () => {
  assert.equal(
    nextEnrollmentReportStart({ start: 1000, batchLength: 137, limit: 1000, total: undefined }),
    null,
  );
});

test('nextEnrollmentReportStart: advances by what arrived, not by limit', () => {
  // A short page with more remaining (total says so) must not skip records.
  assert.equal(
    nextEnrollmentReportStart({ start: 0, batchLength: 400, limit: 1000, total: 900 }),
    400,
  );
});

test('nextEnrollmentReportStart: stops at total and on empty pages', () => {
  assert.equal(nextEnrollmentReportStart({ start: 400, batchLength: 500, limit: 1000, total: 900 }), null);
  assert.equal(nextEnrollmentReportStart({ start: 0, batchLength: 0, limit: 1000, total: undefined }), null);
});
