import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveActiveDashboardProgram,
  type DashboardEnrollment,
} from './resolveActiveDashboardProgram';

function enrollment(
  slug: string,
  opts: { isPrimary?: boolean; id?: string } = {},
): DashboardEnrollment {
  return {
    id: opts.id ?? `enr-${slug}`,
    programSlug: slug,
    isPrimary: opts.isPrimary ?? false,
    enrolledAt: new Date('2026-04-01T00:00:00Z'),
  };
}

test('returns null active slug when the user has no enrollments and no legacy field', () => {
  const result = resolveActiveDashboardProgram({
    enrollments: [],
    legacyEnrolledProgram: null,
  });
  assert.equal(result.activeProgramSlug, null);
  assert.equal(result.primaryProgramSlug, null);
  assert.equal(result.legacyEnrolledProgramMismatch, false);
});

test('falls back to legacy User.enrolledProgram when no CourseEnrollment rows exist', () => {
  const result = resolveActiveDashboardProgram({
    enrollments: [],
    legacyEnrolledProgram: 'comptia-a-plus',
  });
  assert.equal(result.activeProgramSlug, 'comptia-a-plus');
  assert.equal(result.primaryProgramSlug, 'comptia-a-plus');
  assert.equal(result.legacyEnrolledProgramMismatch, false);
});

test('uses the primary enrollment when legacy field disagrees (the mabrown040 bug)', () => {
  const result = resolveActiveDashboardProgram({
    enrollments: [
      enrollment('comptia-a-plus', { isPrimary: true }),
      enrollment('it-support'),
      enrollment('pmp'),
    ],
    legacyEnrolledProgram: 'ai-professional-practitioner-certificate',
  });
  // Hero must show the primary enrollment, not the stale legacy field.
  assert.equal(result.activeProgramSlug, 'comptia-a-plus');
  assert.equal(result.primaryProgramSlug, 'comptia-a-plus');
  assert.equal(result.legacyEnrolledProgramMismatch, true);
});

test('honors ?program=<slug> when it matches one of the user\'s enrollments', () => {
  const result = resolveActiveDashboardProgram({
    enrollments: [
      enrollment('comptia-a-plus', { isPrimary: true }),
      enrollment('it-support'),
      enrollment('pmp'),
    ],
    legacyEnrolledProgram: 'comptia-a-plus',
    requestedProgramSlug: 'pmp',
  });
  assert.equal(result.activeProgramSlug, 'pmp');
  // Primary tracking is unaffected by a tab switch.
  assert.equal(result.primaryProgramSlug, 'comptia-a-plus');
});

test('ignores ?program=<slug> when it is not one of the user\'s enrollments', () => {
  const result = resolveActiveDashboardProgram({
    enrollments: [
      enrollment('comptia-a-plus', { isPrimary: true }),
      enrollment('it-support'),
    ],
    legacyEnrolledProgram: 'comptia-a-plus',
    requestedProgramSlug: 'something-else',
  });
  assert.equal(result.activeProgramSlug, 'comptia-a-plus');
});

test('treats unmarked enrollment rows as history after the active program is cleared', () => {
  const result = resolveActiveDashboardProgram({
    enrollments: [enrollment('it-support'), enrollment('pmp')],
    legacyEnrolledProgram: null,
  });
  assert.equal(result.activeProgramSlug, null);
  assert.equal(result.primaryProgramSlug, null);
});

test('uses a matching legacy mirror when older enrollment rows have no primary marker', () => {
  const result = resolveActiveDashboardProgram({
    enrollments: [enrollment('it-support'), enrollment('pmp')],
    legacyEnrolledProgram: 'pmp',
  });
  assert.equal(result.activeProgramSlug, 'pmp');
  assert.equal(result.primaryProgramSlug, 'pmp');
});

test('does not flag a mismatch when there is no primary enrollment yet', () => {
  // Brand-new users may have a legacy enrolledProgram but no enrollment
  // rows yet (xAPI seeds the first one). We don't want to log a mismatch
  // until the migration has populated CourseEnrollment.
  const result = resolveActiveDashboardProgram({
    enrollments: [],
    legacyEnrolledProgram: 'comptia-a-plus',
  });
  assert.equal(result.legacyEnrolledProgramMismatch, false);
});

test('does not flag a mismatch when legacy field equals primary slug', () => {
  const result = resolveActiveDashboardProgram({
    enrollments: [enrollment('comptia-a-plus', { isPrimary: true })],
    legacyEnrolledProgram: 'comptia-a-plus',
  });
  assert.equal(result.legacyEnrolledProgramMismatch, false);
});
