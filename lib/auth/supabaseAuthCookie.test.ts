import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasSupabaseAuthCookies,
  isSupabaseAuthTokenCookieName,
  shouldTalkToGoTrue,
} from './supabaseAuthCookie';

describe('isSupabaseAuthTokenCookieName', () => {
  it('matches the default SSR session cookie and chunked suffixes', () => {
    assert.equal(isSupabaseAuthTokenCookieName('sb-jqddnyuszufndwwezdwp-auth-token'), true);
    assert.equal(isSupabaseAuthTokenCookieName('sb-workforceap-auth-token'), true);
    assert.equal(isSupabaseAuthTokenCookieName('sb-workforceap-auth-token.0'), true);
    assert.equal(isSupabaseAuthTokenCookieName('sb-workforceap-auth-token.12'), true);
  });

  it('rejects PKCE verifier, locale, and unrelated cookies', () => {
    assert.equal(isSupabaseAuthTokenCookieName('sb-workforceap-auth-token-code-verifier'), false);
    assert.equal(isSupabaseAuthTokenCookieName('wa_session_only'), false);
    assert.equal(isSupabaseAuthTokenCookieName('wap_locale'), false);
    assert.equal(isSupabaseAuthTokenCookieName('sb-auth-token'), false);
  });
});

describe('hasSupabaseAuthCookies', () => {
  it('is false when no cookies or only empty auth-token values', () => {
    assert.equal(hasSupabaseAuthCookies([]), false);
    assert.equal(hasSupabaseAuthCookies({ getAll: () => [] }), false);
    assert.equal(
      hasSupabaseAuthCookies([{ name: 'sb-workforceap-auth-token', value: '   ' }]),
      false,
    );
    assert.equal(hasSupabaseAuthCookies([{ name: 'wap_locale', value: 'en' }]), false);
  });

  it('is true when a non-empty session cookie is present', () => {
    assert.equal(
      hasSupabaseAuthCookies([{ name: 'sb-workforceap-auth-token', value: 'base64.jwt' }]),
      true,
    );
    assert.equal(
      hasSupabaseAuthCookies({
        getAll: () => [
          { name: 'wap_locale', value: 'en' },
          { name: 'sb-abc123-auth-token.0', value: 'chunk' },
        ],
      }),
      true,
    );
  });
});

describe('shouldTalkToGoTrue', () => {
  it('skips GoTrue for anonymous public HTML', () => {
    assert.equal(shouldTalkToGoTrue({ needsValidatedUser: false, hasAuthCookie: false }), false);
  });

  it('talks to GoTrue on protected/tenant-api or when a session cookie exists', () => {
    assert.equal(shouldTalkToGoTrue({ needsValidatedUser: true, hasAuthCookie: false }), true);
    assert.equal(shouldTalkToGoTrue({ needsValidatedUser: false, hasAuthCookie: true }), true);
    assert.equal(shouldTalkToGoTrue({ needsValidatedUser: true, hasAuthCookie: true }), true);
  });
});
