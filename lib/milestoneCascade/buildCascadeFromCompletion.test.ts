import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCascadeFromMilestone,
  buildCascadeFromCompletion,
  type CompletionMilestoneInput,
} from './buildCascadeFromCompletion';
import { MILESTONE_CASCADE_TTL_HOURS } from './types';

/**
 * Unit tests for the pure cascade decision/builder. No DB, no clock, no
 * Prisma. The DB shim that wraps this lives in detectCompletionMilestone.ts
 * and is tested in production by the existing course-completion fan-out.
 *
 * The job of these tests: lock in the filtering rules + the row shape so
 * the LLM drafting cron (next PR) can rely on a consistent contract.
 */

const FIXED_NOW = new Date('2026-05-12T18:00:00.000Z');

const baseInput: CompletionMilestoneInput = {
  userId: 'user-drew',
  courseSlug: 'project-management-fundamentals-microsoft',
  courseName: 'Project Management Fundamentals',
  programSlug: 'pmp-certificate',
  completedCount: 1,
  source: 'coursera-webhook',
  sourceEventId: 'xapi-stmt-abc-123',
  now: FIXED_NOW,
};

test('happy path: webhook completion produces a cascade row with the canonical idempotency key', () => {
  const result = buildCascadeFromCompletion(baseInput);
  assert.equal(result.shouldCreate, true);
  if (!result.shouldCreate) return;

  assert.equal(result.row.userId, 'user-drew');
  assert.equal(result.row.milestoneType, 'course_completed');
  assert.equal(
    result.row.milestoneRef,
    'pmp-certificate::project-management-fundamentals-microsoft',
  );
  assert.equal(result.row.programSlug, 'pmp-certificate');
  assert.equal(result.row.sourceEventId, 'xapi-stmt-abc-123');
});

test('expires_at = now + TTL hours', () => {
  const result = buildCascadeFromCompletion(baseInput);
  assert.equal(result.shouldCreate, true);
  if (!result.shouldCreate) return;
  const expectedMs =
    FIXED_NOW.getTime() + MILESTONE_CASCADE_TTL_HOURS * 60 * 60 * 1000;
  assert.equal(result.row.expiresAt.getTime(), expectedMs);
});

test('contextSnapshot captures the audit trail (course, program, count, source)', () => {
  const result = buildCascadeFromCompletion(baseInput);
  assert.equal(result.shouldCreate, true);
  if (!result.shouldCreate) return;
  assert.deepEqual(result.row.contextSnapshot, {
    courseSlug: baseInput.courseSlug,
    courseName: baseInput.courseName,
    programSlug: baseInput.programSlug,
    completedCount: 1,
    source: 'coursera-webhook',
    detectedAt: FIXED_NOW.toISOString(),
  });
});

test('enterprise-sync source is filtered out (backfill, not a real-time event)', () => {
  const result = buildCascadeFromCompletion({
    ...baseInput,
    source: 'coursera-enterprise-sync',
  });
  assert.equal(result.shouldCreate, false);
  if (result.shouldCreate) return;
  assert.match(result.reason, /enterprise-sync/);
});

test('member-triggered completions DO produce a cascade (manual self-mark)', () => {
  const result = buildCascadeFromCompletion({ ...baseInput, source: 'member' });
  assert.equal(result.shouldCreate, true);
});

test('missing courseSlug is rejected (defensive — the caller should pre-resolve it)', () => {
  const result = buildCascadeFromCompletion({ ...baseInput, courseSlug: '' });
  assert.equal(result.shouldCreate, false);
  if (result.shouldCreate) return;
  assert.match(result.reason, /courseSlug/);
});

test('null programSlug + null sourceEventId both round-trip cleanly', () => {
  const result = buildCascadeFromCompletion({
    ...baseInput,
    programSlug: null,
    sourceEventId: null,
  });
  assert.equal(result.shouldCreate, true);
  if (!result.shouldCreate) return;
  assert.equal(result.row.programSlug, null);
  assert.equal(result.row.sourceEventId, null);
});

test('idempotency key is stable across calls with the same (userId, programSlug, courseSlug)', () => {
  // Two calls with identical milestone identity must produce the same key,
  // even if surrounding context (completedCount, sourceEventId) differs.
  const first = buildCascadeFromCompletion(baseInput);
  const second = buildCascadeFromCompletion({
    ...baseInput,
    completedCount: 2,
    sourceEventId: 'a-different-event',
  });
  assert.equal(first.shouldCreate, true);
  assert.equal(second.shouldCreate, true);
  if (!first.shouldCreate || !second.shouldCreate) return;
  assert.equal(first.row.userId, second.row.userId);
  assert.equal(first.row.milestoneType, second.row.milestoneType);
  assert.equal(first.row.milestoneRef, second.row.milestoneRef);
});

test('the same course slug in two programs produces two independent idempotency keys', () => {
  const first = buildCascadeFromCompletion(baseInput);
  const second = buildCascadeFromCompletion({
    ...baseInput,
    programSlug: 'another-program',
  });
  assert.equal(first.shouldCreate, true);
  assert.equal(second.shouldCreate, true);
  if (!first.shouldCreate || !second.shouldCreate) return;
  assert.notEqual(first.row.milestoneRef, second.row.milestoneRef);
  assert.equal(
    second.row.milestoneRef,
    'another-program::project-management-fundamentals-microsoft',
  );
});

test('program aliases collapse to the same course-completion idempotency key', () => {
  const alias = buildCascadeFromCompletion({
    ...baseInput,
    programSlug: 'comptia-a-plus',
    courseSlug: 'technical-support-fundamentals',
  });
  const canonical = buildCascadeFromCompletion({
    ...baseInput,
    programSlug: 'comptia-a-professional-certificate',
    courseSlug: 'technical-support-fundamentals',
  });
  assert.equal(alias.shouldCreate, true);
  assert.equal(canonical.shouldCreate, true);
  if (!alias.shouldCreate || !canonical.shouldCreate) return;
  assert.equal(alias.row.milestoneRef, canonical.row.milestoneRef);
});

test('program milestones use the program slug as their stable idempotency reference', () => {
  const result = buildCascadeFromMilestone({
    userId: 'user-drew',
    milestoneType: 'program_halfway',
    milestoneRef: 'pmp-certificate',
    programSlug: 'pmp-certificate',
    completedCount: 2,
    totalCourses: 4,
    source: 'coursera-webhook',
    now: FIXED_NOW,
  });
  assert.equal(result.shouldCreate, true);
  if (!result.shouldCreate) return;
  assert.equal(result.row.milestoneType, 'program_halfway');
  assert.equal(result.row.milestoneRef, 'pmp-certificate');
  assert.equal(result.row.contextSnapshot.totalCourses, 4);
});

test('enterprise sync creates no celebration cascade for program completion', () => {
  const result = buildCascadeFromMilestone({
    userId: 'user-drew',
    milestoneType: 'program_completed',
    milestoneRef: 'pmp-certificate',
    programSlug: 'pmp-certificate',
    completedCount: 4,
    totalCourses: 4,
    source: 'coursera-enterprise-sync',
  });
  assert.equal(result.shouldCreate, false);
  if (result.shouldCreate) return;
  assert.match(result.reason, /enterprise-sync/);
});

test('enterprise sync may create counselor-only halfway tracking without member celebration', () => {
  const result = buildCascadeFromMilestone({
    userId: 'user-drew',
    milestoneType: 'program_halfway',
    milestoneRef: 'pmp-certificate',
    programSlug: 'pmp-certificate',
    completedCount: 2,
    totalCourses: 4,
    source: 'coursera-enterprise-sync',
  });
  assert.equal(result.shouldCreate, true);
  if (!result.shouldCreate) return;
  assert.equal(result.row.milestoneType, 'program_halfway');
});
