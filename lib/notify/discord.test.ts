import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';

const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
});

const durableRouteCallers = [
  'app/api/member/applications/[id]/messages/route.ts',
  'app/api/employer/applications/[id]/messages/route.ts',
  'app/api/employer/signup/route.ts',
  'app/api/admin/employers/[id]/approve/route.ts',
];

test('request-scoped Discord notifications are scheduled with Next after()', () => {
  for (const path of durableRouteCallers) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /import\s*\{[^}]*after[^}]*\}\s*from\s*['\"]next\/server['\"]/, `${path} must import after`);
    assert.doesNotMatch(source, /void\s+notifyDiscord\s*\(/, `${path} still abandons Discord work`);
    assert.match(source, /after\s*\(\s*\(\)\s*=>\s*notifyDiscord\s*\(/, `${path} must retain Discord work with after()`);
  }
});

test('notification helpers await both aggregated Discord paths', () => {
  const source = readFileSync('lib/notifications/create.ts', 'utf8');
  assert.equal((source.match(/await\s+notifyDiscord\s*\(/g) ?? []).length, 2);
  assert.doesNotMatch(source, /void\s+notifyDiscord\s*\(/);
});


test('request-lifetime code never abandons createNotification promises', () => {
  const roots = ['app', 'lib'];
  const { spawnSync } = require('node:child_process') as typeof import('node:child_process');
  const result = spawnSync('grep', ['-RIn', '--exclude=*.test.ts', 'void createNotification', ...roots], { encoding: 'utf8' });
  assert.ok(result.status === 0 || result.status === 1, result.stderr);
  assert.equal(result.stdout.trim(), '', result.stdout);
});
