/**
 * Tests for apply referral capture.
 * The referral code is read from ?ref= query param and stored in session + cookie.
 */
import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLY_REFERRAL_COOKIE,
  APPLY_REFERRAL_SESSION_KEY,
  normalizePartnerRef,
  partnerRefCookieClearOptions,
  partnerRefForApplyLanding,
  partnerRefFromEnrollPath,
  shouldCaptureEnrollRef,
} from './applyReferralCapture';

describe('applyReferralCapture constants', () => {
  it('exports APPLY_REFERRAL_SESSION_KEY', () => {
    assert.equal(typeof APPLY_REFERRAL_SESSION_KEY, 'string');
    assert.ok(APPLY_REFERRAL_SESSION_KEY.length > 0, 'session key should not be empty');
  });

  it('session key is a stable string (not dynamic)', () => {
    // Importing twice should give same value — no randomness
    const { APPLY_REFERRAL_SESSION_KEY: key2 } = require('./applyReferralCapture');
    assert.equal(APPLY_REFERRAL_SESSION_KEY, key2);
  });

  it('shares the cookie name with the sponsorship helper', () => {
    assert.equal(APPLY_REFERRAL_COOKIE, 'wap_partner_ref');
  });
});

/**
 * These three helpers are the entire trust boundary for partner attribution:
 * `normalizePartnerRef` decides what may be written into (and later read out
 * of) a 30-day cookie, `partnerRefFromEnrollPath` decides which URLs carry a
 * partner at all, and `shouldCaptureEnrollRef` decides who is allowed to plant
 * the cookie in the first place. Attribution drives partner-portal PII
 * visibility, sponsored-seat consumption, and the school fields written to a
 * member's profile — so all three get direct coverage.
 */

// --- normalizePartnerRef -----------------------------------------------------

test('normalizePartnerRef: accepts a plain slug unchanged', () => {
  assert.equal(normalizePartnerRef('concordia'), 'concordia');
  assert.equal(normalizePartnerRef('riverside-high-school'), 'riverside-high-school');
  assert.equal(normalizePartnerRef('chs2026'), 'chs2026');
});

test('normalizePartnerRef: lowercases and trims', () => {
  assert.equal(normalizePartnerRef('CONCORDIA'), 'concordia');
  assert.equal(normalizePartnerRef('  Concordia-HS  '), 'concordia-hs');
});

test('normalizePartnerRef: returns null for empty / missing input', () => {
  assert.equal(normalizePartnerRef(''), null);
  assert.equal(normalizePartnerRef('   '), null);
  assert.equal(normalizePartnerRef(null), null);
  assert.equal(normalizePartnerRef(undefined), null);
});

test('normalizePartnerRef: malformed percent-encoding does not throw', () => {
  // `decodeURIComponent` throws URIError on these; middleware runs on every
  // request, so a throw here would be a trivial edge-runtime DoS.
  assert.doesNotThrow(() => normalizePartnerRef('%'));
  assert.equal(normalizePartnerRef('%'), null);
  assert.equal(normalizePartnerRef('%E0%A4%A'), null);
  assert.equal(normalizePartnerRef('%zz'), null);
});

test('normalizePartnerRef: rejects encoded path traversal', () => {
  assert.equal(normalizePartnerRef('%2Fetc%2Fpasswd'), null);
  assert.equal(normalizePartnerRef('..%2Fadmin'), null);
  assert.equal(normalizePartnerRef('%2e%2e%2f%2e%2e%2fadmin'), null);
  assert.equal(normalizePartnerRef('../admin'), null);
});

test('normalizePartnerRef: rejects CRLF header/cookie injection attempts', () => {
  assert.equal(normalizePartnerRef('a%0d%0aSet-Cookie:%20evil=1'), null);
  assert.equal(normalizePartnerRef('a\r\nSet-Cookie: evil=1'), null);
  assert.equal(normalizePartnerRef('a\nb'), null);
});

test('normalizePartnerRef: rejects anything outside [a-z0-9-]', () => {
  assert.equal(normalizePartnerRef('partner ref'), null);
  assert.equal(normalizePartnerRef('partner_ref'), null);
  assert.equal(normalizePartnerRef('partner;ref'), null);
  assert.equal(normalizePartnerRef('<script>'), null);
  assert.equal(normalizePartnerRef('concórdia'), null);
});

test('normalizePartnerRef: enforces the 64-character bound', () => {
  assert.equal(normalizePartnerRef('a'.repeat(64)), 'a'.repeat(64));
  assert.equal(normalizePartnerRef('a'.repeat(65)), null);
});

// --- partnerRefForApplyLanding -----------------------------------------------

test('partnerRefForApplyLanding: uses explicit ?ref= only (ignores cookie leftovers)', () => {
  assert.equal(partnerRefForApplyLanding('chs2026'), 'chs2026');
  assert.equal(partnerRefForApplyLanding('Concordia'), 'concordia');
  // Bare /apply — sticky enroll cookie must not be treated as intent here.
  assert.equal(partnerRefForApplyLanding(null), null);
  assert.equal(partnerRefForApplyLanding(undefined), null);
  assert.equal(partnerRefForApplyLanding(''), null);
  assert.equal(partnerRefForApplyLanding('  '), null);
});

test('partnerRefCookieClearOptions: matches plant attrs so browsers actually expire', () => {
  const opts = partnerRefCookieClearOptions();
  assert.equal(opts.path, '/');
  assert.equal(opts.maxAge, 0);
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.sameSite, 'lax');
  assert.equal(typeof opts.secure, 'boolean');
});

// --- partnerRefFromEnrollPath ------------------------------------------------

test('partnerRefFromEnrollPath: reads the slug straight out of the segment', () => {
  assert.equal(partnerRefFromEnrollPath('/enroll/concordia'), 'concordia');
  // Trailing segments (and trailing slash) do not change the partner.
  assert.equal(partnerRefFromEnrollPath('/enroll/concordia/'), 'concordia');
  assert.equal(partnerRefFromEnrollPath('/enroll/concordia/programs'), 'concordia');
});

test('partnerRefFromEnrollPath: null for non-enroll paths', () => {
  assert.equal(partnerRefFromEnrollPath('/apply'), null);
  assert.equal(partnerRefFromEnrollPath('/'), null);
  assert.equal(partnerRefFromEnrollPath('/enroll'), null);
  assert.equal(partnerRefFromEnrollPath('/enrollment/concordia'), null);
  assert.equal(partnerRefFromEnrollPath('/enroll/'), null);
});

test('partnerRefFromEnrollPath: null for a segment that is not a valid slug', () => {
  assert.equal(partnerRefFromEnrollPath('/enroll/%2e%2e%2fadmin'), null);
  assert.equal(partnerRefFromEnrollPath('/enroll/%'), null);
  assert.equal(partnerRefFromEnrollPath(`/enroll/${'a'.repeat(65)}`), null);
});

// --- shouldCaptureEnrollRef --------------------------------------------------

function headers(init: Record<string, string> = {}): Headers {
  return new Headers(init);
}

test('shouldCaptureEnrollRef: true for a top-level document navigation', () => {
  assert.equal(
    shouldCaptureEnrollRef(
      'GET',
      headers({
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'cross-site',
        accept: 'text/html,application/xhtml+xml',
      })
    ),
    true
  );
  // Header values are case-insensitive in practice.
  assert.equal(shouldCaptureEnrollRef('GET', headers({ 'sec-fetch-dest': 'Document' })), true);
});

test('shouldCaptureEnrollRef: false for subresource loads (the plant attack)', () => {
  // <img src="https://site/enroll/chs"> — silently forces attribution today.
  assert.equal(shouldCaptureEnrollRef('GET', headers({ 'sec-fetch-dest': 'image' })), false);
  // fetch()/XHR from a third-party page.
  assert.equal(
    shouldCaptureEnrollRef('GET', headers({ 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors' })),
    false
  );
  assert.equal(shouldCaptureEnrollRef('GET', headers({ 'sec-fetch-dest': 'script' })), false);
  assert.equal(shouldCaptureEnrollRef('GET', headers({ 'sec-fetch-dest': 'style' })), false);
});

test('shouldCaptureEnrollRef: false for a hidden iframe even though it navigates', () => {
  // An embedded frame sends `sec-fetch-mode: navigate` too, so `dest` has to
  // win when present — otherwise the iframe attack walks straight through.
  assert.equal(
    shouldCaptureEnrollRef(
      'GET',
      headers({ 'sec-fetch-dest': 'iframe', 'sec-fetch-mode': 'navigate' })
    ),
    false
  );
  assert.equal(
    shouldCaptureEnrollRef(
      'GET',
      headers({ 'sec-fetch-dest': 'frame', 'sec-fetch-mode': 'navigate' })
    ),
    false
  );
});

test('shouldCaptureEnrollRef: accepts navigate when the client sends no dest', () => {
  assert.equal(shouldCaptureEnrollRef('GET', headers({ 'sec-fetch-mode': 'navigate' })), true);
  assert.equal(shouldCaptureEnrollRef('GET', headers({ 'sec-fetch-mode': 'cors' })), false);
  assert.equal(shouldCaptureEnrollRef('GET', headers({ 'sec-fetch-mode': 'no-cors' })), false);
});

test('shouldCaptureEnrollRef: falls back to Accept for clients with no Sec-Fetch headers', () => {
  assert.equal(
    shouldCaptureEnrollRef('GET', headers({ accept: 'text/html,application/xhtml+xml,*/*;q=0.8' })),
    true
  );
  assert.equal(shouldCaptureEnrollRef('GET', headers({ accept: 'image/avif,image/webp' })), false);
  assert.equal(shouldCaptureEnrollRef('GET', headers({ accept: '*/*' })), false);
  assert.equal(shouldCaptureEnrollRef('GET', headers()), false);
});

test('shouldCaptureEnrollRef: only GET can capture', () => {
  for (const method of ['POST', 'HEAD', 'OPTIONS', 'PUT', 'DELETE', 'get']) {
    assert.equal(
      shouldCaptureEnrollRef(method, headers({ 'sec-fetch-dest': 'document' })),
      false,
      `${method} must not plant the attribution cookie`
    );
  }
});
