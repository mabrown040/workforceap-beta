import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ADMIN_SSR_LIST_CAP,
  EMPLOYER_LIST_CAP,
  PARTNER_DIGEST_REFERRAL_CAP,
  TRAINING_PROGRESS_LEARNER_CAP,
  TRAINING_PROGRESS_PROGRESS_CAP,
  UNBOUNDED_LIST_TAKE_FLOOR,
  clampTake,
  isListTruncated,
  partnerDigestReferralTake,
  showingFirstLabel,
} from './queryCaps';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readRepo(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

test('caps stay below the old silent 5k/20k floor', () => {
  assert.ok(ADMIN_SSR_LIST_CAP < UNBOUNDED_LIST_TAKE_FLOOR);
  assert.ok(EMPLOYER_LIST_CAP < UNBOUNDED_LIST_TAKE_FLOOR);
  assert.ok(TRAINING_PROGRESS_LEARNER_CAP < UNBOUNDED_LIST_TAKE_FLOOR);
  assert.ok(TRAINING_PROGRESS_PROGRESS_CAP < UNBOUNDED_LIST_TAKE_FLOOR);
  assert.ok(PARTNER_DIGEST_REFERRAL_CAP < UNBOUNDED_LIST_TAKE_FLOOR);
  assert.equal(TRAINING_PROGRESS_LEARNER_CAP, 200);
  assert.equal(EMPLOYER_LIST_CAP, 200);
  assert.equal(PARTNER_DIGEST_REFERRAL_CAP, 2000);
});

test('partner digest take is a hard cap and does not scale with partner count', () => {
  assert.equal(partnerDigestReferralTake(1), PARTNER_DIGEST_REFERRAL_CAP);
  assert.equal(partnerDigestReferralTake(50), PARTNER_DIGEST_REFERRAL_CAP);
  assert.equal(partnerDigestReferralTake(0), PARTNER_DIGEST_REFERRAL_CAP);
  assert.ok(partnerDigestReferralTake(50) < 2000 * 50);
});

test('clampTake and showingFirstLabel', () => {
  assert.equal(clampTake(9999, 200), 200);
  assert.equal(clampTake(0, 200), 1);
  assert.equal(showingFirstLabel(200, 200, 'learners'), 'Showing 200 learners');
  assert.equal(showingFirstLabel(200, 812, 'learners'), 'Showing first 200 of 812 learners');
  assert.equal(isListTruncated(200, 200, 812), true);
  assert.equal(isListTruncated(40, 200, 40), false);
});

test('training-progress page honors learner/progress caps and drops 20k scans', () => {
  const src = readRepo('app/admin/training-progress/page.tsx');
  assert.doesNotMatch(src, /take:\s*20000/);
  assert.doesNotMatch(src, /take:\s*5000/);
  assert.match(src, /TRAINING_PROGRESS_LEARNER_CAP/);
  assert.match(src, /TRAINING_PROGRESS_PROGRESS_CAP/);
});

test('counselors page no longer hydrates 20k assignment rows', () => {
  const src = readRepo('app/admin/counselors/page.tsx');
  assert.doesNotMatch(src, /take:\s*20000/);
  assert.match(src, /loadCounselorAssignmentAggregates/);
});

test('employer list pages cap take at EMPLOYER_LIST_CAP', () => {
  for (const rel of [
    'app/(portal)/employer/jobs/page.tsx',
    'app/(portal)/employer/pipeline/page.tsx',
    'app/(portal)/employer/matches/page.tsx',
    'app/(portal)/employer/page.tsx',
  ]) {
    const src = readRepo(rel);
    assert.doesNotMatch(src, /take:\s*5000/, rel);
    assert.match(src, /EMPLOYER_LIST_CAP/, rel);
  }
});

test('partner digest uses partnerDigestReferralTake instead of 2000 * n', () => {
  const src = readRepo('app/api/cron/partner-outcome-digest/route.ts');
  assert.doesNotMatch(src, /2000\s*\*\s*partnerIds\.length/);
  assert.match(src, /partnerDigestReferralTake\(partnerIds\.length\)/);
});
