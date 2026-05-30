import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('check-i18n-safe-diff fails closed when a touched locked file has no patch', () => {
  const input = {
    lockedPatterns: ['app/page.tsx'],
    changedFiles: ['app/page.tsx', 'messages/en.json'],
    lockedPatches: {},
    messagesPatches: {
      'messages/en.json': '--- a/messages/en.json\n+++ b/messages/en.json\n@@\n+  "hero": "Hello"\n',
    },
    baseEn: {},
    headEn: {
      hero: 'Hello',
    },
  };

  const result = spawnSync('node', ['scripts/locked-stakes/check-i18n-safe-diff.mjs'], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.safe, false);
  assert.match(parsed.reason, /app\/page\.tsx: missing locked file patch/);
});
