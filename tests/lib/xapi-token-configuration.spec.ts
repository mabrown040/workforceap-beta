import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { issueXapiAccessToken, verifyXapiAccessToken } from '@/lib/xapi/token';

const secretKeys = ['XAPI_CLIENT_SECRET', 'COURSERA_APP_SECRET', 'COURSERA_WEBHOOK_SECRET'] as const;
const options = { request: new Request('https://wap.example.test/api/xapi/statements') };

describe('xAPI signing configuration', () => {
  beforeEach(() => {
    for (const key of secretKeys) vi.stubEnv(key, undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it.each([undefined, '', ' \t '])('rejects missing or blank secret configuration (%s)', (value) => {
    for (const key of secretKeys) vi.stubEnv(key, value);
    expect(() => issueXapiAccessToken('statements:write', options)).toThrow('xAPI auth is not configured');
    expect(() => verifyXapiAccessToken('untrusted.token.value', options)).toThrow('xAPI auth is not configured');
  });

  it.each(secretKeys)('supports the configured %s secret without changing the token contract', (key) => {
    vi.stubEnv(key, 'synthetic-test-secret');
    const token = issueXapiAccessToken('statements:write', options);
    const payload = verifyXapiAccessToken(token, options);
    expect(payload.aud).toBe('coursera-xapi');
    expect(payload.iss).toBe('https://wap.example.test');
    expect(payload.scope).toBe('statements:write');
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('preserves secret precedence and falls back past whitespace', () => {
    vi.stubEnv('XAPI_CLIENT_SECRET', 'primary-secret');
    vi.stubEnv('COURSERA_APP_SECRET', 'secondary-secret');
    vi.stubEnv('COURSERA_WEBHOOK_SECRET', 'third-secret');
    const primaryToken = issueXapiAccessToken('statements:write', options);
    vi.stubEnv('COURSERA_APP_SECRET', 'different-secondary');
    expect(() => verifyXapiAccessToken(primaryToken, options)).not.toThrow();
    vi.stubEnv('XAPI_CLIENT_SECRET', '  ');
    expect(() => verifyXapiAccessToken(primaryToken, options)).toThrow('Invalid token signature');
    const fallbackToken = issueXapiAccessToken('statements:write', options);
    expect(() => verifyXapiAccessToken(fallbackToken, options)).not.toThrow();
  });

  it('rejects an existing token after all secret configuration is removed', () => {
    vi.stubEnv('XAPI_CLIENT_SECRET', 'synthetic-test-secret');
    const token = issueXapiAccessToken('statements:write', options);
    vi.stubEnv('XAPI_CLIENT_SECRET', undefined);
    expect(() => verifyXapiAccessToken(token, options)).toThrow('xAPI auth is not configured');
  });

  it('still rejects invalid signatures and expired tokens when configured', () => {
    vi.stubEnv('XAPI_CLIENT_SECRET', 'synthetic-test-secret');
    const token = issueXapiAccessToken('statements:write', options);
    const parts = token.split('.');
    parts[2] = 'invalid-signature';
    expect(() => verifyXapiAccessToken(parts.join('.'), options)).toThrow('Invalid token signature');
    vi.advanceTimersByTime(3600 * 1000);
    expect(() => verifyXapiAccessToken(token, options)).toThrow('Access token expired');
  });
});
