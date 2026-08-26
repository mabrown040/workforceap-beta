import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatGradePercent,
  parseCourseGradeString,
  scoreScaledToDisplayPercent,
} from './courseGradeDisplay';

test('formatGradePercent drops trailing zeros', () => {
  assert.equal(formatGradePercent(87), '87');
  assert.equal(formatGradePercent(21.5), '21.5');
  assert.equal(formatGradePercent(21.25), '21.25');
  assert.equal(formatGradePercent(null), null);
});

test('parseCourseGradeString handles percent strings and scaled values', () => {
  assert.equal(parseCourseGradeString('21%'), 21);
  assert.equal(parseCourseGradeString('77.33%'), 77.33);
  assert.equal(parseCourseGradeString('0.85'), 85);
  assert.equal(parseCourseGradeString('pass'), null);
});

test('scoreScaledToDisplayPercent maps xAPI 0–1 onto 0–100', () => {
  assert.equal(scoreScaledToDisplayPercent(0.41), 41);
  assert.equal(scoreScaledToDisplayPercent(21), 21);
});
