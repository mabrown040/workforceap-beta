import test from 'node:test';
import assert from 'node:assert/strict';

import { parsePrefillTargetSalary } from './salaryNegotiationSalary';

test('parsePrefillTargetSalary uses first salary token from a formatted range', () => {
  assert.equal(parsePrefillTargetSalary('$60,000 - $80,000'), 60000);
});

test('parsePrefillTargetSalary returns undefined when no numeric token exists', () => {
  assert.equal(parsePrefillTargetSalary('market rate TBD'), undefined);
});
