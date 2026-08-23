import test from 'node:test';
import assert from 'node:assert/strict';

import {
  APPLY_FAIL_CLOSED_ENV,
  ALLOW_MISSING_UPSTASH_ENV,
  decideMissingLimiter,
  isAllowMissingUpstashEnabled,
  isApplyFailClosedEnvEnabled,
} from './rate-limit-policy';

test('spend mode fail-closes in production even when allow-missing Upstash is on', () => {
  const decision = decideMissingLimiter({
    isProduction: true,
    allowMissingUpstash: true,
    mode: 'spend',
    applyFailClosedEnv: false,
  });
  assert.equal(decision.success, false);
  assert.equal(decision.remaining, 0);
  assert.equal(decision.reason, 'spend-fail-closed');
});

test('spend mode fail-closes in production without allow-missing', () => {
  const decision = decideMissingLimiter({
    isProduction: true,
    allowMissingUpstash: false,
    mode: 'spend',
    applyFailClosedEnv: false,
  });
  assert.equal(decision.success, false);
  assert.equal(decision.reason, 'spend-fail-closed');
});

test('spend mode fail-opens in development', () => {
  const decision = decideMissingLimiter({
    isProduction: false,
    allowMissingUpstash: false,
    mode: 'spend',
    applyFailClosedEnv: false,
  });
  assert.equal(decision.success, true);
  assert.equal(decision.reason, 'dev-fail-open');
});

test('apply mode fail-closes in production when allow-missing is unset', () => {
  const decision = decideMissingLimiter({
    isProduction: true,
    allowMissingUpstash: false,
    mode: 'apply',
    applyFailClosedEnv: false,
  });
  assert.equal(decision.success, false);
  assert.equal(decision.reason, 'prod-fail-closed');
});

test('apply mode fail-opens in production when RATE_LIMIT_ALLOW_MISSING_UPSTASH=1', () => {
  const decision = decideMissingLimiter({
    isProduction: true,
    allowMissingUpstash: true,
    mode: 'apply',
    applyFailClosedEnv: false,
  });
  assert.equal(decision.success, true);
  assert.equal(decision.reason, 'allow-missing-upstash');
});

test('apply mode fail-closes when WAP_APPLY_RATE_LIMIT_FAIL_CLOSED=1 even with allow-missing', () => {
  const decision = decideMissingLimiter({
    isProduction: true,
    allowMissingUpstash: true,
    mode: 'apply',
    applyFailClosedEnv: true,
  });
  assert.equal(decision.success, false);
  assert.equal(decision.reason, 'apply-env-fail-closed');
});

test('apply mode fail-opens in development', () => {
  const decision = decideMissingLimiter({
    isProduction: false,
    allowMissingUpstash: false,
    mode: 'apply',
    applyFailClosedEnv: true,
  });
  assert.equal(decision.success, true);
  assert.equal(decision.reason, 'dev-fail-open');
});

test('security mode honors allow-missing in production', () => {
  const open = decideMissingLimiter({
    isProduction: true,
    allowMissingUpstash: true,
    mode: 'security',
    applyFailClosedEnv: false,
  });
  assert.equal(open.success, true);
  const closed = decideMissingLimiter({
    isProduction: true,
    allowMissingUpstash: false,
    mode: 'security',
    applyFailClosedEnv: false,
  });
  assert.equal(closed.success, false);
  assert.equal(closed.reason, 'prod-fail-closed');
});

test('env helpers only treat the string 1 as enabled', () => {
  assert.equal(isAllowMissingUpstashEnabled('1'), true);
  assert.equal(isAllowMissingUpstashEnabled('true'), false);
  assert.equal(isAllowMissingUpstashEnabled(undefined), false);
  assert.equal(isApplyFailClosedEnvEnabled('1'), true);
  assert.equal(isApplyFailClosedEnvEnabled('0'), false);
  assert.equal(ALLOW_MISSING_UPSTASH_ENV, 'RATE_LIMIT_ALLOW_MISSING_UPSTASH');
  assert.equal(APPLY_FAIL_CLOSED_ENV, 'WAP_APPLY_RATE_LIMIT_FAIL_CLOSED');
});
