import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
  assert.equal(result.row.milestoneRef, baseInput.courseSlug);
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

test('idempotency key is stable across calls with the same (userId, courseSlug)', () => {
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
