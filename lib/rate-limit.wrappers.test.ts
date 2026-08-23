import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'rate-limit.ts'), 'utf8');

test('apply/signup checkers use the apply fail-closed wrapper', () => {
  assert.match(src, /checkApplySignupRateLimit[\s\S]*failClosedApplyLimit\(applySignupRateLimiter/);
  assert.match(src, /checkSignupRateLimit[\s\S]*failClosedApplyLimit\(signupRateLimiter/);
  assert.match(src, /checkSignupEmailRateLimit[\s\S]*failClosedApplyLimit\(signupEmailRateLimiter/);
});

test('voice and AI checkers use the spend fail-closed wrapper', () => {
  assert.match(src, /checkVoiceSessionRateLimit[\s\S]*failClosedSpendLimit\(voiceSessionRateLimiter/);
  assert.match(src, /checkAIToolRateLimit[\s\S]*failClosedSpendLimit\(aiToolRateLimiter/);
  assert.match(src, /checkPublicVoiceSessionRateLimit[\s\S]*failClosedSpendLimit\(publicVoiceSessionRateLimiter/);
});

test('apply signup limit window stays at the launch bump of 50 / 30 m', () => {
  assert.match(src, /prefix:\s*'ratelimit:apply-signup'/);
  assert.match(src, /Ratelimit\.slidingWindow\(50,\s*'30 m'\)/);
});
