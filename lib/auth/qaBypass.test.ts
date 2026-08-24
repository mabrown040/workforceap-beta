import test from 'node:test';
import assert from 'node:assert/strict';
import { isQaBypassEnabled, isQaBypassRequest } from './qaBypass';

function withEnv(
  vars: { WAP_RATE_LIMIT_QA_BYPASS?: string; WAP_RATE_LIMIT_QA_SECRET?: string; VERCEL_ENV?: string },
  fn: () => void,
) {
  const prevBypass = process.env.WAP_RATE_LIMIT_QA_BYPASS;
  const prevSecret = process.env.WAP_RATE_LIMIT_QA_SECRET;
  const prevVercel = process.env.VERCEL_ENV;
  try {
    if (vars.WAP_RATE_LIMIT_QA_BYPASS === undefined) delete process.env.WAP_RATE_LIMIT_QA_BYPASS;
    else process.env.WAP_RATE_LIMIT_QA_BYPASS = vars.WAP_RATE_LIMIT_QA_BYPASS;
    if (vars.WAP_RATE_LIMIT_QA_SECRET === undefined) delete process.env.WAP_RATE_LIMIT_QA_SECRET;
    else process.env.WAP_RATE_LIMIT_QA_SECRET = vars.WAP_RATE_LIMIT_QA_SECRET;
    if (vars.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = vars.VERCEL_ENV;
    fn();
  } finally {
    if (prevBypass === undefined) delete process.env.WAP_RATE_LIMIT_QA_BYPASS;
    else process.env.WAP_RATE_LIMIT_QA_BYPASS = prevBypass;
    if (prevSecret === undefined) delete process.env.WAP_RATE_LIMIT_QA_SECRET;
    else process.env.WAP_RATE_LIMIT_QA_SECRET = prevSecret;
    if (prevVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
}

function requestWithBypass(value: string): Request {
  return new Request('http://localhost/api/auth/login', {
    headers: { 'x-wap-qa-bypass': value },
  });
}

test('QA bypass is off unless the non-production flag is explicitly 1', () => {
  withEnv({ VERCEL_ENV: undefined, WAP_RATE_LIMIT_QA_BYPASS: undefined }, () => {
    assert.equal(isQaBypassEnabled(), false);
  });
  withEnv({ VERCEL_ENV: 'preview', WAP_RATE_LIMIT_QA_BYPASS: '0' }, () => {
    assert.equal(isQaBypassEnabled(), false);
  });
  withEnv({ VERCEL_ENV: 'preview', WAP_RATE_LIMIT_QA_BYPASS: '1' }, () => {
    assert.equal(isQaBypassEnabled(), true);
  });
});

test('QA bypass is never on in VERCEL_ENV=production', () => {
  withEnv(
    {
      VERCEL_ENV: 'production',
      WAP_RATE_LIMIT_QA_BYPASS: '1',
      WAP_RATE_LIMIT_QA_SECRET: 'leaked-secret',
    },
    () => {
      assert.equal(isQaBypassEnabled(), false);
      assert.equal(isQaBypassRequest(requestWithBypass('leaked-secret')), false);
    },
  );
});

test('QA bypass request requires matching secret in non-production', () => {
  withEnv(
    {
      VERCEL_ENV: 'preview',
      WAP_RATE_LIMIT_QA_BYPASS: '1',
      WAP_RATE_LIMIT_QA_SECRET: 'test-secret',
    },
    () => {
      assert.equal(isQaBypassRequest(requestWithBypass('test-secret')), true);
      assert.equal(isQaBypassRequest(requestWithBypass('wrong')), false);
      assert.equal(isQaBypassRequest(undefined), false);
    },
  );
});

test('QA bypass does not honor a default secret when WAP_RATE_LIMIT_QA_SECRET is unset', () => {
  withEnv(
    {
      VERCEL_ENV: 'preview',
      WAP_RATE_LIMIT_QA_BYPASS: '1',
      WAP_RATE_LIMIT_QA_SECRET: undefined,
    },
    () => {
      assert.equal(isQaBypassEnabled(), true);
      assert.equal(
        isQaBypassRequest(requestWithBypass('wap-qa-dev-secret-do-not-use-in-production')),
        false,
      );
    },
  );
});
