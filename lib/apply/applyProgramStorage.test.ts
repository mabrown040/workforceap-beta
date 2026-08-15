/**
 * `ApplyFlowDraftV1` back-compat (Phase B4).
 *
 * The apply step-1 draft is JSON in a real applicant's `localStorage` with a
 * 7-day TTL, so at any moment there are live drafts on disk that were written
 * by an older build. `readDraft` in `app/apply/ApplyEligibilityClient.tsx`
 * parses that JSON straight into this type with no migration step, which means
 * every field B4 added has to be optional forever: making one required would
 * silently mistype every draft written before the deploy.
 *
 * These assertions are deliberately paired with the type annotation — `tsc`
 * checks the shape, the runtime checks the values survive the trip.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ApplyFlowDraftV1 } from './applyProgramStorage';
import { APPLY_FLOW_DRAFT_KEY } from './applyProgramStorage';

/** Exactly what `writeDraft` serializes, minus the school fields. */
const LEGACY_DRAFT_JSON = JSON.stringify({
  version: 1,
  updatedAt: '2026-08-01T12:00:00.000Z',
  firstName: 'Sam',
  lastName: 'Student',
  email: 'sam@example.com',
  phone: '(512) 555-0100',
  ageGroup: 'under_18',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  county: 'Travis',
  primaryBarriers: ['none'],
  q1: 'yes',
  q2: 'no',
});

test('the draft storage key is unchanged, so existing drafts are still found', () => {
  assert.equal(APPLY_FLOW_DRAFT_KEY, 'apply_flow_draft_v1');
});

test('a pre-B4 draft still parses, with the new fields simply absent', () => {
  const parsed = JSON.parse(LEGACY_DRAFT_JSON) as ApplyFlowDraftV1;

  assert.equal(parsed.version, 1);
  assert.equal(parsed.firstName, 'Sam');
  assert.equal(parsed.ageGroup, 'under_18');
  assert.equal(parsed.q1, 'yes');
  assert.equal(parsed.q2, 'no');

  // Undefined, not a crash and not a default that would render as an answer.
  assert.equal(parsed.gradeLevel, undefined);
  assert.equal(parsed.expectedGraduationYear, undefined);
  assert.equal(parsed.schoolAttestation, undefined);
  assert.equal(parsed.studentId, undefined);
  assert.equal(parsed.guardianName, undefined);
  assert.equal(parsed.guardianEmail, undefined);
  assert.equal(parsed.guardianPhone, undefined);
});

test('a school-variant draft round-trips every new field', () => {
  const draft: ApplyFlowDraftV1 = {
    version: 1,
    updatedAt: '2026-08-15T12:00:00.000Z',
    firstName: 'Sam',
    lastName: 'Student',
    email: 'sam@example.com',
    phone: '(512) 555-0100',
    ageGroup: 'under_18',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    county: 'Travis',
    primaryBarriers: ['none'],
    q1: null,
    q2: null,
    gradeLevel: '11',
    expectedGraduationYear: '2028',
    schoolAttestation: true,
    studentId: 'CHS-90210',
    guardianName: 'Dana Guardian',
    guardianEmail: 'dana.guardian@example.com',
    guardianPhone: '(512) 555-0123',
  };

  const restored = JSON.parse(JSON.stringify(draft)) as ApplyFlowDraftV1;

  assert.deepEqual(restored, draft);
  assert.equal(restored.gradeLevel, '11');
  assert.equal(restored.expectedGraduationYear, '2028');
  assert.equal(restored.schoolAttestation, true);
  assert.equal(restored.guardianEmail, 'dana.guardian@example.com');
  // The school variant asks neither funding question, so both stay null.
  assert.equal(restored.q1, null);
  assert.equal(restored.q2, null);
});

test('organic/paid drafts serialize without any school keys', () => {
  // `writeDraft` passes the school fields as `undefined` outside the school
  // variant; `JSON.stringify` drops undefined, so the stored bytes are
  // unchanged from before B4.
  const draft: ApplyFlowDraftV1 = {
    version: 1,
    updatedAt: '2026-08-15T12:00:00.000Z',
    firstName: 'Sam',
    lastName: 'Student',
    email: 'sam@example.com',
    phone: '(512) 555-0100',
    q1: 'yes',
    q2: 'no',
    gradeLevel: undefined,
    expectedGraduationYear: undefined,
    schoolAttestation: undefined,
    studentId: undefined,
    guardianName: undefined,
    guardianEmail: undefined,
    guardianPhone: undefined,
  };

  const serialized = JSON.parse(JSON.stringify(draft)) as Record<string, unknown>;

  for (const key of [
    'gradeLevel',
    'expectedGraduationYear',
    'schoolAttestation',
    'studentId',
    'guardianName',
    'guardianEmail',
    'guardianPhone',
  ]) {
    assert.equal(key in serialized, false, `${key} must not be serialized`);
  }
});
