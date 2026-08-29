import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveInboundProgramSlug } from './resolveInboundProgram';

test('uses the explicitly primary enrollment instead of the newest historical row', () => {
  assert.equal(
    resolveInboundProgramSlug({
      enrollments: [
        { programSlug: 'historical-program', isPrimary: false },
        { programSlug: 'active-program', isPrimary: true },
      ],
      legacyEnrolledProgram: 'historical-program',
    }),
    'active-program',
  );
});

test('supports a matching legacy mirror for rows created before primary markers', () => {
  assert.equal(
    resolveInboundProgramSlug({
      enrollments: [
        { programSlug: 'legacy-program', isPrimary: false },
        { programSlug: 'older-program', isPrimary: false },
      ],
      legacyEnrolledProgram: 'legacy-program',
    }),
    'legacy-program',
  );
});

test('does not revive historical enrollments after the active program is cleared', () => {
  assert.equal(
    resolveInboundProgramSlug({
      enrollments: [{ programSlug: 'historical-program', isPrimary: false }],
      legacyEnrolledProgram: null,
    }),
    null,
  );
});

test('does not trust a stale legacy mirror without a matching enrollment row', () => {
  assert.equal(
    resolveInboundProgramSlug({
      enrollments: [{ programSlug: 'historical-program', isPrimary: false }],
      legacyEnrolledProgram: 'missing-program',
    }),
    null,
  );
});
