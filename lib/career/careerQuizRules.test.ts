/**
 * Tests for the short career-quiz → O*NET answer-vector expansion (pure logic).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RIASEC_AREAS,
  QUIZ_QUESTIONS,
  isValidQuizAnswers,
  areaScoresToOnetAnswers,
} from './careerQuizRules';

/** A valid 30-item area order: 5 items per area, in RIASEC order. */
const GROUPED_30 = RIASEC_AREAS.flatMap((a) => Array(5).fill(a));

describe('quiz config', () => {
  it('asks exactly one question per RIASEC area', () => {
    assert.equal(QUIZ_QUESTIONS.length, RIASEC_AREAS.length);
    assert.deepEqual(QUIZ_QUESTIONS.map((q) => q.id), [...RIASEC_AREAS]);
  });
});

describe('isValidQuizAnswers', () => {
  it('accepts exactly 6 digits 1-5', () => {
    assert.equal(isValidQuizAnswers('531241'), true);
  });
  it('rejects wrong length or out-of-range', () => {
    assert.equal(isValidQuizAnswers('53124'), false);
    assert.equal(isValidQuizAnswers('5312416'), false);
    assert.equal(isValidQuizAnswers('531246'), false); // 6 is out of range
    assert.equal(isValidQuizAnswers(null), false);
  });
});

describe('areaScoresToOnetAnswers', () => {
  it('broadcasts each area rating across its 5 grouped items', () => {
    // R=5, I=4, A=3, S=2, E=1, C=5
    const out = areaScoresToOnetAnswers('543215', GROUPED_30);
    assert.equal(out, '5'.repeat(5) + '4'.repeat(5) + '3'.repeat(5) + '2'.repeat(5) + '1'.repeat(5) + '5'.repeat(5));
  });

  it('handles interleaved area order, not just grouped', () => {
    const interleaved = Array.from({ length: 5 }, () => [...RIASEC_AREAS]).flat(); // R,I,A,S,E,C ×5
    const out = areaScoresToOnetAnswers('543215', interleaved);
    assert.equal(out, '543215'.repeat(5));
  });

  it('defaults unknown areas to neutral 3 but stays well-formed', () => {
    const withGap = [...GROUPED_30];
    withGap[0] = undefined; // unknown area at position 0
    const out = areaScoresToOnetAnswers('543215', withGap);
    assert.ok(out && /^[1-5]{30}$/.test(out));
    assert.equal(out![0], '3');
  });

  it('rejects bad answer strings and wrong-length area arrays', () => {
    assert.equal(areaScoresToOnetAnswers('bad', GROUPED_30), null);
    assert.equal(areaScoresToOnetAnswers('543215', GROUPED_30.slice(0, 29)), null);
  });
});
