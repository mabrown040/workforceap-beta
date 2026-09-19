import test from 'node:test';
import assert from 'node:assert/strict';
import { CRON_REGISTRY } from './cronRegistry';

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) dupes.add(v);
    seen.add(v);
  }
  return [...dupes];
}

test('every cron is registered once: ids are unique (they are React keys on /admin/email-crons)', () => {
  assert.deepEqual(duplicates(CRON_REGISTRY.map((c) => c.id)), []);
});

test('workflow keys are unique so a toggle or activate-all writes one record per cron', () => {
  assert.deepEqual(duplicates(CRON_REGISTRY.map((c) => c.workflowKey)), []);
});

test('at-risk-alerts is still registered exactly once', () => {
  assert.equal(CRON_REGISTRY.filter((c) => c.id === 'at-risk-alerts').length, 1);
});
