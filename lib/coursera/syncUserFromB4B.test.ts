import test from 'node:test';
import assert from 'node:assert/strict';

import { CourseProgressStatus } from '@prisma/client';

import {
  computeCourseProgressUpdate,
  decideEnrolledProgramSync,
  mergeB4BProgressSignals,
  type ExistingCourseProgress,
} from './b4bSync';

/**
 * Unit tests for the per-user `syncUserFromB4B` gradebook merge logic.
 *
 * `syncUserFromB4B` itself imports `'server-only'` (it pulls the Prisma
 * client + tenant scope helpers), so we can't run it under `node --test`
 * directly. Instead we test the pure helper it now composes:
 *
 *   1. `mergeB4BProgressSignals` — combine gradebook + enrollment rows
 *   2. `computeCourseProgressUpdate` — the existing read-before-write
 *      ladder from #1085 (no-downgrade rules etc.)
 *
 * These two functions are what `syncUserFromB4B` chains for every resolved
 * course; the route handlers then upsert the resulting CourseProgress row.
 *
 * Why these tests can't be "simplified" away:
 *   - The whole point of the gradebook merge is that
 *     `enrollmentReports.overallProgress` rounds 9% engagement down to 0,
 *     and the dashboard ring would otherwise sit at 0 for a learner who
 *     genuinely just finished a quiz. Without these tests we can't catch a
 *     regression that drops the gradebook signal back on the floor.
 *   - The no-downgrade ladder must STILL apply on top of the merged value
 *     (xAPI may have credited 50% before B4B caught up; a 5% gradebook
 *     row from the next sync must not regress that).
 */

test('gradebook 9% beats enrollment 0% → merged input pct=9, status promotes IN_PROGRESS', () => {
  const merged = mergeB4BProgressSignals({
    enrollment: {
      isCompleted: false,
      overallProgress: 0,
      lastActivityAt: null,
    },
    gradebook: {
      overallProgress: 9,
      lastActivityAt: 1_777_559_213_000,
    },
  });
  assert.equal(merged.overallProgress, 9);
  assert.equal(merged.lastActivityAt, 1_777_559_213_000);
  assert.equal(merged.isCompleted, false);

  const update = computeCourseProgressUpdate(null, merged);
  assert.equal(update.status, CourseProgressStatus.IN_PROGRESS);
  assert.equal(update.percentComplete, 9);
  assert.ok(update.lastActivityAt instanceof Date);
});

test('gradebook 5% + enrollment 0% + lastActivity → status IN_PROGRESS, pct=5', () => {
  const merged = mergeB4BProgressSignals({
    enrollment: {
      isCompleted: false,
      overallProgress: 0,
      lastActivityAt: 1_710_000_000_000,
    },
    gradebook: {
      overallProgress: 5,
      lastActivityAt: 1_715_000_000_000,
    },
  });
  // Picks the more recent of the two activity timestamps.
  assert.equal(merged.lastActivityAt, 1_715_000_000_000);

  const update = computeCourseProgressUpdate(null, merged);
  assert.equal(update.status, CourseProgressStatus.IN_PROGRESS);
  assert.equal(update.percentComplete, 5);
});

test('gradebook empty → falls back to enrollmentReports cleanly', () => {
  // Simulates the fail-soft path where the gradebook fetch returned [] but
  // enrollmentReports still has data.
  const merged = mergeB4BProgressSignals({
    enrollment: {
      isCompleted: false,
      overallProgress: 25,
      lastActivityAt: 1_710_000_000_000,
    },
    gradebook: null,
  });
  assert.equal(merged.overallProgress, 25);
  assert.equal(merged.lastActivityAt, 1_710_000_000_000);

  const update = computeCourseProgressUpdate(null, merged);
  assert.equal(update.status, CourseProgressStatus.IN_PROGRESS);
  assert.equal(update.percentComplete, 25);
});

test('gradebook fails (network error) → null gradebook side, sync uses enrollment-only', () => {
  // The route catches the gradebook error and falls back to []; the merge
  // helper sees `gradebook: null` for any course not present in the empty
  // gradebook map. Proves the merge stays sane in that fallback.
  const merged = mergeB4BProgressSignals({
    enrollment: {
      isCompleted: true,
      overallProgress: 100,
      lastActivityAt: 1_710_000_000_000,
    },
    gradebook: null,
  });
  assert.equal(merged.isCompleted, true);
  assert.equal(merged.overallProgress, 100);

  const update = computeCourseProgressUpdate(null, merged);
  assert.equal(update.status, CourseProgressStatus.COMPLETED);
  assert.equal(update.percentComplete, 100);
});

test('gradebook 5% + existing local 50% → keeps 50% (no-downgrade ladder still applies)', () => {
  // The whole point of the read-before-write ladder: gradebook may report 5%
  // because Coursera's per-item rollup hasn't caught up to the xAPI-credited
  // mid-course state. We must NOT downgrade the local 50%.
  const existing: ExistingCourseProgress = {
    status: CourseProgressStatus.IN_PROGRESS,
    percentComplete: 50,
    lastActivityAt: new Date(1_700_000_000_000),
  };
  const merged = mergeB4BProgressSignals({
    enrollment: {
      isCompleted: false,
      overallProgress: 0,
      lastActivityAt: null,
    },
    gradebook: {
      overallProgress: 5,
      lastActivityAt: 1_715_000_000_000,
    },
  });
  const update = computeCourseProgressUpdate(existing, merged);
  assert.equal(update.status, CourseProgressStatus.IN_PROGRESS);
  assert.equal(update.percentComplete, 50);
  // lastActivityAt still advances when gradebook has a more recent timestamp.
  assert.equal(update.lastActivityAt!.getTime(), 1_715_000_000_000);
});

test('gradebook-only row (enrollment side null) → status IN_PROGRESS at gradebook pct', () => {
  // Covers the "course appears in gradebook but not in enrollmentReports"
  // case (Coursera sometimes lags rolling fresh enrollments into the
  // program-wide enrollmentReports view). The per-user sync still writes
  // CourseProgress for these.
  const merged = mergeB4BProgressSignals({
    enrollment: null,
    gradebook: {
      overallProgress: 12,
      lastActivityAt: 1_715_000_000_000,
    },
  });
  assert.equal(merged.isCompleted, false);
  assert.equal(merged.overallProgress, 12);
  assert.equal(merged.lastActivityAt, 1_715_000_000_000);

  const update = computeCourseProgressUpdate(null, merged);
  assert.equal(update.status, CourseProgressStatus.IN_PROGRESS);
  assert.equal(update.percentComplete, 12);
});

test('both sides have lastActivityAt=0 → null (zero is "never engaged" sentinel)', () => {
  // Coursera occasionally returns 0 to mean "never". The merge treats both
  // 0 and null as "no signal" so the ladder doesn't accidentally promote to
  // IN_PROGRESS based on a fake epoch.
  const merged = mergeB4BProgressSignals({
    enrollment: {
      isCompleted: false,
      overallProgress: 0,
      lastActivityAt: 0,
    },
    gradebook: {
      overallProgress: 0,
      lastActivityAt: 0,
    },
  });
  assert.equal(merged.lastActivityAt, null);

  const update = computeCourseProgressUpdate(null, merged);
  assert.equal(update.status, CourseProgressStatus.NOT_STARTED);
});

test('enrollment ahead of gradebook → keeps enrollment pct (max wins)', () => {
  // Rare but possible during gradebook re-aggregation: enrollmentReports
  // briefly leads. The merge should never regress the higher signal.
  const merged = mergeB4BProgressSignals({
    enrollment: {
      isCompleted: false,
      overallProgress: 35,
      lastActivityAt: 1_715_000_000_000,
    },
    gradebook: {
      overallProgress: 12,
      lastActivityAt: 1_710_000_000_000,
    },
  });
  assert.equal(merged.overallProgress, 35);
  assert.equal(merged.lastActivityAt, 1_715_000_000_000);
});

/**
 * Unit tests for `decideEnrolledProgramSync` — the gate that stops
 * auto-sync from silently switching a member's `User.enrolledProgram`.
 *
 * `syncUserFromB4B` itself imports 'server-only' and can't run under
 * `node --test`, so (matching the pattern above) the decision logic is
 * a pure function in `b4bSync.ts` that the sync function composes.
 *
 * Regression this locks in: a counselor enrolls a member in Program A;
 * the member has old Coursera activity only in Program B. Before this fix,
 * the next dashboard auto-sync would silently overwrite
 * `User.enrolledProgram` from "Program A" to "Program B". Now a non-null
 * existing value is never overwritten — the divergence is only reported.
 */

test('existingEnrolledProgram is null → action "set" to the Coursera-suggested program', () => {
  const decision = decideEnrolledProgramSync({
    existingEnrolledProgram: null,
    chosenProgramSlug: 'program-b',
  });
  assert.deepEqual(decision, { action: 'set', programSlug: 'program-b' });
});

test('existingEnrolledProgram matches the Coursera-suggested program → action "none"', () => {
  const decision = decideEnrolledProgramSync({
    existingEnrolledProgram: 'program-a',
    chosenProgramSlug: 'program-a',
  });
  assert.deepEqual(decision, { action: 'none' });
});

test('existingEnrolledProgram is non-null and diverges → action "mismatch", never overwritten', () => {
  // Counselor enrolled the member in Program A; Coursera activity suggests
  // Program B. The non-null enrolledProgram must survive the sync.
  const decision = decideEnrolledProgramSync({
    existingEnrolledProgram: 'program-a',
    chosenProgramSlug: 'program-b',
  });
  assert.deepEqual(decision, {
    action: 'mismatch',
    existingEnrolledProgram: 'program-a',
    suggestedProgramSlug: 'program-b',
  });
  // Explicitly assert the decision is NOT a "set" — this is the load-bearing
  // assertion for the audit fix.
  assert.notEqual(decision.action, 'set');
});
