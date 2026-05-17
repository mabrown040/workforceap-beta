import assert from 'node:assert/strict';
import test from 'node:test';

import { scoreMarketCoverage, type MarketSignal } from './marketScrape';

function fakeSignal(must: string[], nice: string[] = []): MarketSignal {
  const keywords = [
    ...must.map((phrase) => ({ phrase, frequency: 0.85, category: 'must-have' as const })),
    ...nice.map((phrase) => ({ phrase, frequency: 0.45, category: 'nice-to-have' as const })),
  ];
  return {
    onetCode: '41-3091.00',
    postingCount: 10,
    keywords,
    generatedAtMs: Date.now(),
    source: 'firecrawl',
  };
}

test('scoreMarketCoverage 100% when all must-haves present', () => {
  const sig = fakeSignal(['Salesforce', 'MEDDPICC']);
  const r = scoreMarketCoverage('I used Salesforce and MEDDPICC daily', sig);
  assert.equal(r.coverageScore, 100);
  assert.equal(r.mustHavePresent.length, 2);
  assert.equal(r.mustHaveMissing.length, 0);
});

test('scoreMarketCoverage 50% when half present', () => {
  const sig = fakeSignal(['Salesforce', 'MEDDPICC', 'Outreach', 'Gong']);
  const r = scoreMarketCoverage('I used Salesforce and MEDDPICC', sig);
  assert.equal(r.coverageScore, 50);
  assert.equal(r.mustHavePresent.length, 2);
  assert.equal(r.mustHaveMissing.length, 2);
});

test('scoreMarketCoverage neutral 70 when no must-haves in signal', () => {
  const sig = fakeSignal([]);
  const r = scoreMarketCoverage('any resume', sig);
  assert.equal(r.coverageScore, 70);
});

test('scoreMarketCoverage tracks nice-to-have present', () => {
  const sig = fakeSignal(['Salesforce'], ['Apollo', 'Clay']);
  const r = scoreMarketCoverage('Used Salesforce and Apollo', sig);
  assert.equal(r.niceToHavePresent.length, 1);
  assert.equal(r.niceToHavePresent[0].phrase, 'Apollo');
});

test('scoreMarketCoverage case-insensitive substring match', () => {
  const sig = fakeSignal(['Salesforce']);
  const r = scoreMarketCoverage('worked on SALESFORCE deployments', sig);
  assert.equal(r.coverageScore, 100);
});
