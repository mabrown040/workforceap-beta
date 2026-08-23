import { describe, expect, it } from 'vitest';
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

describe('scanCaps', () => {
  it('keeps leftover scan caps below the old silent 5k floor', () => {
    expect(ANALYTICS_SAMPLE_CAP).toBeLessThan(UNBOUNDED_SCAN_TAKE_FLOOR);
    expect(ANALYTICS_COHORT_DETAIL_CAP).toBeLessThan(UNBOUNDED_SCAN_TAKE_FLOOR);
    expect(REPORT_SAMPLE_CAP).toBeLessThan(UNBOUNDED_SCAN_TAKE_FLOOR);
    expect(WORK_QUEUE_CAP).toBeLessThan(UNBOUNDED_SCAN_TAKE_FLOOR);
    expect(LOOKUP_CATALOG_CAP).toBeLessThan(UNBOUNDED_SCAN_TAKE_FLOOR);
    expect(MEMBER_PROGRESS_CAP).toBeLessThan(UNBOUNDED_SCAN_TAKE_FLOOR);
    expect(COURSERA_B4B_REPORT_CAP).toBeLessThan(UNBOUNDED_SCAN_TAKE_FLOOR);
    expect(ONET_SYNC_OCCUPATION_CAP).toBeLessThan(UNBOUNDED_SCAN_TAKE_FLOOR);
    expect(CRON_SCOPED_LOOKUP_CAP).toBeLessThan(UNBOUNDED_SCAN_TAKE_FLOOR);
    expect(UNBOUNDED_SCAN_TAKE_FLOOR).toBe(5000);
  });

  it('clampScanTake and sqlCount handle bad inputs', () => {
    expect(clampScanTake(Number.NaN, 10)).toBe(1);
    expect(clampScanTake(0, 10)).toBe(1);
    expect(clampScanTake(99, 10)).toBe(10);
    expect(sqlCount(12n)).toBe(12);
    expect(sqlCount(4)).toBe(4);
    expect(sqlCount(null)).toBe(0);
  });

  it('claimed leftover files no longer hydrate 5k/10k/20k rows', () => {
    for (const rel of CLAIMED_FILES) {
      const src = readRepo(rel);
      expect(src, rel).not.toMatch(/take:\s*(5000|10000|20000)\b/);
    }
  });

  it('Coursera B4B and O*NET sync document a per-run cap plus resume cursor', () => {
    const b4b = readRepo('lib/coursera/b4bSync.ts');
    expect(b4b).toMatch(/COURSERA_B4B_REPORT_CAP/);
    expect(b4b).toMatch(/nextStart/);
    expect(b4b).toMatch(/cron_coursera_b4b_sync/);

    const onet = readRepo('lib/onet/sync.ts');
    expect(onet).toMatch(/ONET_SYNC_OCCUPATION_CAP/);
    expect(onet).toMatch(/updated_at ASC NULLS FIRST|updatedAt ASC NULLS FIRST|NULLS FIRST/);
  });
});
