import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompletionDriftQuery, buildCourseProgramIndex, courseMatchesAssignedProgram, deriveCourseraOverviewHealth } from './courseraDiagnostics';
import { deriveEnrollmentSignal } from './courseraEnrollmentEvidence';
import { buildSyncDriftQuery } from './courseraSyncDrift';

const now = new Date('2026-09-19T12:00:00Z');

test('a shared course matches every assigned program, independent of provider order', () => {
  const programs = [
    { slug: 'first-program', name: 'First', courses: [{ slug: 'shared' }] },
    { slug: 'second-program', name: 'Second', courses: [{ slug: 'shared' }] },
  ];
  for (const source of [programs, [...programs].reverse()]) {
    const memberships = buildCourseProgramIndex(source).get('shared')!;
    assert.equal(memberships.length, 2);
    assert.equal(courseMatchesAssignedProgram(memberships, ['second-program']), true);
    assert.equal(courseMatchesAssignedProgram(memberships, ['other', 'first-program']), true);
    assert.equal(courseMatchesAssignedProgram(memberships, ['unrelated']), false);
  }
  assert.equal(courseMatchesAssignedProgram([{ slug: null, name: 'First Program' }], ['first-program']), false);
  assert.equal(courseMatchesAssignedProgram([{ slug: 'comptia-a-plus', name: 'CompTIA' }], ['comptia-a-professional-certificate']), true);
});

test('completion diagnostics compare explicit status and retain tenant/version identity boundaries', () => {
  const query = buildCompletionDriftQuery('org-A');
  assert.doesNotMatch(query.sql, /overall_progress|percent_complete/);
  assert.match(query.sql, /ccp\.is_completed <> \(cp\.status = 'COMPLETED'\)/);
  assert.match(query.sql, /cm\.canonical_course_slug = cp\.course_slug/);
  assert.match(query.sql, /ce\.curriculum_version = cm\.curriculum_version/);
  assert.match(query.sql, /ce\.organization_id = ccp\.organization_id/);
  assert.match(query.sql, /ccp\.organization_id = u\.organization_id/);
  assert.match(query.sql, /SELECT DISTINCT ON \(organization_id, user_id, coursera_course_id\)/);
  assert.match(query.sql, /last_synced_at DESC, id/);
  assert.deepEqual(query.values, ['org-A', 'org-A']);
});

test('activity gap ignores write time and requires comparable timestamps for the scoped organization', () => {
  const query = buildSyncDriftQuery(24, 20, 'org-A');
  assert.doesNotMatch(query.sql, /last_updated_at|created_at/);
  assert.match(query.sql, /cp\.last_activity_at IS NOT NULL/);
  assert.match(query.sql, /ccp\.last_activity_time IS NOT NULL/);
  assert.deepEqual(query.values, ['org-A', 'org-A', 24, 20]);
});

test('failed overview reads stay unavailable; hidden test accounts do not enter the actionable total', () => {
  const base = { loaded: true, unmatchedTotal: 0, attentionStatements: 0, lastXapiReceivedAt: now, now };
  assert.equal(deriveCourseraOverviewHealth(base), 'healthy');
  assert.equal(deriveCourseraOverviewHealth({ ...base, loaded: false }), 'unavailable');
  assert.equal(deriveCourseraOverviewHealth({ ...base, unmatchedTotal: null }), 'unavailable');
  assert.equal(deriveCourseraOverviewHealth({ ...base, unmatchedTotal: 2 }), 'attention');
  assert.equal(deriveCourseraOverviewHealth({ ...base, lastXapiReceivedAt: null }), 'idle');
  assert.equal(deriveCourseraOverviewHealth({ ...base, lastXapiReceivedAt: new Date('2026-08-01') }), 'attention');
});

test('observed learning is independent of approval and undated evidence does not mean stalled', () => {
  const base = { approved: false, completed: false, observedActivity: true, lastActivityAt: now, now };
  assert.equal(deriveEnrollmentSignal(base), 'active');
  assert.equal(deriveEnrollmentSignal({ ...base, lastActivityAt: null }), 'activity_unknown');
  assert.equal(deriveEnrollmentSignal({ ...base, lastActivityAt: new Date('2027-01-01') }), 'activity_unknown');
  assert.equal(deriveEnrollmentSignal({ ...base, lastActivityAt: new Date('2026-01-01') }), 'stalled');
  assert.equal(deriveEnrollmentSignal({ ...base, observedActivity: false }), 'not_approved');
  assert.equal(deriveEnrollmentSignal({ ...base, approved: true, observedActivity: false }), 'approved_not_started');
  assert.equal(deriveEnrollmentSignal({ ...base, completed: true }), 'completed');
});
