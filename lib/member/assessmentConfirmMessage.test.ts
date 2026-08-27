import assert from 'node:assert/strict';
import test from 'node:test';

import { assessmentConfirmMessage } from './assessmentConfirmMessage';

test('high scores stay quiet, not a ready-to-start mosaic', () => {
  assert.equal(assessmentConfirmMessage(82), 'Ready for training. Your counselor will follow up.');
  assert.doesNotMatch(assessmentConfirmMessage(100), /You're ready to start training/);
});

test('mid and low scores skip Great job / Thanks for completing', () => {
  assert.equal(
    assessmentConfirmMessage(50),
    'Counselor may add foundational resources alongside training.',
  );
  assert.equal(assessmentConfirmMessage(49), 'Counselor will follow up from your answers.');
  assert.doesNotMatch(assessmentConfirmMessage(50), /Great job!/);
});
