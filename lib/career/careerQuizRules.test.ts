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
  areasToTypeSlug,
  typeSlugToLabel,
} from './careerQuizRules';
import { MINI_IP_AREA_ORDER } from './careerQuizAreas';

/** A valid 30-item area order: 5 items per area, in RIASEC order. */
const GROUPED_30 = RIASEC_AREAS.flatMap((a) => Array(5).fill(a));

describe('O*NET item→area order (scoring fix)', () => {
  it('is the interleaved R-I-A-S-E-C cycle ×5, 30 items', () => {
    assert.equal(MINI_IP_AREA_ORDER.length, 30);
    MINI_IP_AREA_ORDER.forEach((a, i) => assert.equal(a, RIASEC_AREAS[i % 6]));
    assert.equal(MINI_IP_AREA_ORDER.filter((a) => a === 'Realistic').length, 5);
  });

  it('synthesizes a DIFFERENTIATED 30-vector (regression: not all-neutral)', () => {
    // R=5,I=5,A=1,S=1,E=1,C=1 → R items high, C items low — proves answers map through.
    const v = areaScoresToOnetAnswers('551111', MINI_IP_AREA_ORDER)!;
    assert.equal(v.length, 30);
    assert.notEqual(v, '3'.repeat(30)); // the old bug produced exactly this
    assert.equal([...v].filter((_, i) => i % 6 === 0).join(''), '55555'); // Realistic
    assert.equal([...v].filter((_, i) => i % 6 === 5).join(''), '11111'); // Conventional
  });
});

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

describe('share type slug round-trip', () => {
  it('encodes top-2 areas to a slug', () => {
    assert.equal(areasToTypeSlug(['Investigative', 'Social']), 'investigative-social');
    assert.equal(areasToTypeSlug(['Realistic', 'Conventional', 'Artistic']), 'realistic-conventional'); // capped at 2
  });

  it('drops unknown areas', () => {
    assert.equal(areasToTypeSlug(['Bogus', 'Social']), 'social');
    assert.equal(areasToTypeSlug([undefined, undefined]), '');
  });

  it('decodes a slug back to a friendly label', () => {
    assert.equal(typeSlugToLabel('investigative-social'), 'Investigative & Social');
    assert.equal(typeSlugToLabel('artistic'), 'Artistic');
  });

  it('rejects junk slugs', () => {
    assert.equal(typeSlugToLabel('foo-bar'), null);
    assert.equal(typeSlugToLabel(''), null);
    assert.equal(typeSlugToLabel(null), null);
  });
});
