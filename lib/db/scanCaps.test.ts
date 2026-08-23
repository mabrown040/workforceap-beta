import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANALYTICS_COHORT_DETAIL_CAP,
  ANALYTICS_SAMPLE_CAP,
  COURSERA_B4B_REPORT_CAP,
  CRON_SCOPED_LOOKUP_CAP,
  LOOKUP_CATALOG_CAP,
  MEMBER_PROGRESS_CAP,
  ONET_SYNC_OCCUPATION_CAP,
  REPORT_SAMPLE_CAP,
  UNBOUNDED_SCAN_TAKE_FLOOR,
  WORK_QUEUE_CAP,
  clampScanTake,
  sqlCount,
} from './scanCaps';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readRepo(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const CLAIMED_FILES = [
  'lib/admin/metrics.ts',
  'lib/admin/boardOutcomes.ts',
  'lib/admin/cohortAnalytics.ts',
  'lib/admin/analyticsOverview.ts',
  'lib/analytics/quarterlyOutcomes.ts',
  'lib/analytics/partnerQuarterlyOutcomes.ts',
  'lib/analytics/aiToolEfficacy.ts',
  'lib/cron/at-risk-alerts.ts',
  'lib/cron/placement-surveys.ts',
  'lib/coursera/b4bSync.ts',
  'lib/coursera/syncUserFromB4B.ts',
  'lib/coursera/seedCanonicalMappingsFromCatalog.ts',
  'lib/coursera/canonicalMapping.ts',
  'lib/coursera/memberSkillsetProgress.ts',
  'lib/onet/sync.ts',
  'lib/onet/recommend.ts',
  'lib/onet/ipMapToPrograms.ts',
  'lib/marketing/publicImpactStats.ts',
  'lib/outcomes/socialProof.ts',
  'lib/seo/activeProgramSlugs.ts',
  'lib/ai/matchStudents.ts',
  'lib/data/applications.ts',
] as const;

test('leftover scan caps stay below the old silent 5k floor', () => {
  assert.ok(ANALYTICS_SAMPLE_CAP < UNBOUNDED_SCAN_TAKE_FLOOR);
  assert.ok(ANALYTICS_COHORT_DETAIL_CAP < UNBOUNDED_SCAN_TAKE_FLOOR);
  assert.ok(REPORT_SAMPLE_CAP < UNBOUNDED_SCAN_TAKE_FLOOR);
  assert.ok(WORK_QUEUE_CAP < UNBOUNDED_SCAN_TAKE_FLOOR);
  assert.ok(LOOKUP_CATALOG_CAP < UNBOUNDED_SCAN_TAKE_FLOOR);
  assert.ok(MEMBER_PROGRESS_CAP < UNBOUNDED_SCAN_TAKE_FLOOR);
  assert.ok(COURSERA_B4B_REPORT_CAP < UNBOUNDED_SCAN_TAKE_FLOOR);
  assert.ok(ONET_SYNC_OCCUPATION_CAP < UNBOUNDED_SCAN_TAKE_FLOOR);
  assert.ok(CRON_SCOPED_LOOKUP_CAP < UNBOUNDED_SCAN_TAKE_FLOOR);
  assert.equal(UNBOUNDED_SCAN_TAKE_FLOOR, 5000);
});

test('clampScanTake and sqlCount handle bad inputs', () => {
  assert.equal(clampScanTake(Number.NaN, 10), 1);
  assert.equal(clampScanTake(0, 10), 1);
  assert.equal(clampScanTake(99, 10), 10);
  assert.equal(sqlCount(BigInt(12)), 12);
  assert.equal(sqlCount(4), 4);
  assert.equal(sqlCount(null), 0);
});

test('claimed leftover files no longer hydrate 5k/10k/20k rows', () => {
  for (const rel of CLAIMED_FILES) {
    const src = readRepo(rel);
    assert.doesNotMatch(src, /take:\s*(5000|10000|20000)\b/, rel);
  }
});

test('board and quarterly leftovers use SQL aggregates for official totals', () => {
  const board = readRepo('lib/admin/boardOutcomes.ts');
  assert.match(board, /prisma\.user\.count/);
  assert.match(board, /prisma\.placementRecord\.count/);
  assert.match(board, /PERCENTILE_CONT/);
  assert.match(board, /COUNT\(DISTINCT/);
  assert.doesNotMatch(board, /take:\s*10000/);

  const quarterly = readRepo('lib/analytics/quarterlyOutcomes.ts');
  assert.match(quarterly, /prisma\.user\.count/);
  assert.match(quarterly, /prisma\.placementRecord\.count/);
  assert.match(quarterly, /summarizeRetentionGroups/);
});

test('Coursera B4B and O*NET sync document a per-run cap plus resume cursor', () => {
  const b4b = readRepo('lib/coursera/b4bSync.ts');
  assert.match(b4b, /COURSERA_B4B_REPORT_CAP/);
  assert.match(b4b, /nextStart/);
  assert.match(b4b, /cron_coursera_b4b_sync/);

  const onet = readRepo('lib/onet/sync.ts');
  assert.match(onet, /ONET_SYNC_OCCUPATION_CAP/);
  assert.match(onet, /updated_at ASC NULLS FIRST/);
});
