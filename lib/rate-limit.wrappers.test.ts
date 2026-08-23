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

test('leftover abuse-sensitive checkers use the security fail-closed wrapper', () => {
  assert.match(src, /checkInviteAcceptRateLimit[\s\S]*failClosedLimit\(inviteAcceptRateLimiter/);
  assert.match(src, /checkOrgOnboardRateLimit[\s\S]*failClosedLimit\(orgOnboardRateLimiter/);
  assert.match(src, /checkMessageSendRateLimit[\s\S]*failClosedLimit\(messageSendRateLimiter/);
  assert.match(src, /checkEmployerJobImportRateLimit[\s\S]*failClosedLimit\(employerJobImportRateLimiter/);
  assert.match(src, /checkAdminInviteRateLimit[\s\S]*failClosedLimit\(adminInviteRateLimiter/);
  assert.match(src, /checkAdminTokenLinksRateLimit[\s\S]*failClosedLimit\(adminTokenLinksRateLimiter/);
  assert.match(src, /checkCourseraIdentityRateLimit[\s\S]*failClosedLimit\(courseraIdentityRateLimiter/);
});

test('AI-adjacent leftover checkers use the spend fail-closed wrapper', () => {
  assert.match(src, /checkCareersRecommendRateLimit[\s\S]*failClosedSpendLimit\(careersRecommendRateLimiter/);
  assert.match(src, /checkInterestProfilerRateLimit[\s\S]*failClosedSpendLimit\(interestProfilerRateLimiter/);
  assert.match(src, /checkPublicInterestProfilerRateLimit[\s\S]*failClosedSpendLimit\(publicInterestProfilerRateLimiter/);
});

test('cheap public GET caps stay fail-open without Redis', () => {
  assert.match(src, /checkPublicCareersGetRateLimit[\s\S]*if \(!publicCareersGetRateLimiter\) return \{ success: true \}/);
  assert.match(src, /checkPublicHealthRateLimit[\s\S]*if \(!publicHealthRateLimiter\) return \{ success: true \}/);
  assert.match(src, /checkXapiConfigGetRateLimit[\s\S]*if \(!xapiConfigGetRateLimiter\) return \{ success: true \}/);
});

test('webhook limiter stays fail-open so a missing Redis cannot 429 paid events', () => {
  assert.match(src, /checkWebhookRateLimit[\s\S]*if \(!webhookRateLimiter\) return \{ success: true \}/);
  assert.match(src, /Signature\/secret verification is the guard/);
});

test('apply signup limit window stays at the launch bump of 50 / 30 m', () => {
  assert.match(src, /prefix:\s*'ratelimit:apply-signup'/);
  assert.match(src, /Ratelimit\.slidingWindow\(50,\s*'30 m'\)/);
});
