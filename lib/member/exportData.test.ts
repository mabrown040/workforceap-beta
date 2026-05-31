import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'exportData.ts'), 'utf8');

test('GDPR member export does not cap relation queries', () => {
  assert.doesNotMatch(source, /take:\s*500/);
});

test('GDPR member export does not filter personal-data history by recency', () => {
  assert.doesNotMatch(source, /createdAt:\s*\{\s*gte:/);
  assert.doesNotMatch(source, /ninetyDaysAgo|oneYearAgo/);
});
