import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkI18nSafeDiff } from '../../scripts/locked-stakes/check-i18n-safe-diff.mjs';

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

  const parsed = checkI18nSafeDiff(input);
  assert.equal(parsed.safe, false);
  if (typeof parsed.reason !== 'string') {
    assert.fail('expected missing-patch failure reason');
  }
  assert.match(parsed.reason, /app\/page\.tsx: missing locked file patch/);
});
