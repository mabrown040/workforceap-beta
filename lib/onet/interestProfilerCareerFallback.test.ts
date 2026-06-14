import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { IpCareerRow, IpResultRow } from './interestProfiler';
import {
  applyRiasecCareerFallback,
  isAlphabeticalWithinFitTier,
} from './interestProfilerCareerFallback';

const investigativeResults: IpResultRow[] = [
  { code: 'Investigative', title: 'Investigative', score: 20 },
  { code: 'Realistic', title: 'Realistic', score: 0 },
  { code: 'Artistic', title: 'Artistic', score: 0 },
  { code: 'Social', title: 'Social', score: 0 },
  { code: 'Enterprising', title: 'Enterprising', score: 0 },
  { code: 'Conventional', title: 'Conventional', score: 0 },
];

const alphabeticalBestCareers: IpCareerRow[] = [
  { code: '11-3021.00', title: 'Computer and Information Systems Managers', fit: 'Best' },
  { code: '19-1042.00', title: 'Medical Scientists, Except Epidemiologists', fit: 'Best' },
  { code: '15-1252.00', title: 'Software Developers', fit: 'Best' },
  { code: '15-1253.00', title: 'Software Quality Assurance Analysts and Testers', fit: 'Best' },
  { code: '15-1211.00', title: 'Computer Systems Analysts', fit: 'Great' },
];

describe('isAlphabeticalWithinFitTier', () => {
  it('detects strict alphabetical ordering inside the leading fit tier', () => {
    assert.equal(isAlphabeticalWithinFitTier(alphabeticalBestCareers), true);
  });

  it('does not flag short or relevance-ordered lists', () => {
    assert.equal(
      isAlphabeticalWithinFitTier([
        { code: '15-1252.00', title: 'Software Developers', fit: 'Best' },
        { code: '19-1042.00', title: 'Medical Scientists, Except Epidemiologists', fit: 'Best' },
        { code: '11-3021.00', title: 'Computer and Information Systems Managers', fit: 'Best' },
      ]),
      false
    );
  });
});

describe('applyRiasecCareerFallback', () => {
  it('replaces alphabetized top-tier O*NET careers with curated RIASEC-ranked careers', () => {
    const out = applyRiasecCareerFallback(alphabeticalBestCareers, investigativeResults, { maxCurated: 4 });

    assert.deepEqual(
      out.slice(0, 4).map((c) => c.title),
      [
        'Software Developers',
        'Computer Systems Analysts',
        'Medical Scientists, Except Epidemiologists',
        'Software Quality Assurance Analysts and Testers',
      ]
    );
    assert.equal(out[0].fit, 'Best');
    assert.equal(out[1].fit, 'Best');
    assert.equal(new Set(out.map((c) => c.code)).size, out.length);
  });

  it('leaves non-alphabetical career rows unchanged', () => {
    const ranked = [
      { code: '15-1252.00', title: 'Software Developers', fit: 'Best' },
      { code: '19-1042.00', title: 'Medical Scientists, Except Epidemiologists', fit: 'Best' },
      { code: '11-3021.00', title: 'Computer and Information Systems Managers', fit: 'Best' },
    ];

    assert.deepEqual(applyRiasecCareerFallback(ranked, investigativeResults), ranked);
  });
});
