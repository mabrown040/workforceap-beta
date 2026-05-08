import test from 'node:test';
import assert from 'node:assert/strict';
import { isCanonicalHost, normalizeHost } from './hostMatch';

// normalizeHost ---------------------------------------------------------

test('normalizeHost: lowercases', () => {
  assert.equal(normalizeHost('AAUL.WorkforceAP.org'), 'aaul.workforceap.org');
});

test('normalizeHost: strips port', () => {
  assert.equal(normalizeHost('aaul.workforceap.org:3000'), 'aaul.workforceap.org');
});

test('normalizeHost: strips port from localhost', () => {
  assert.equal(normalizeHost('localhost:3000'), 'localhost');
});

test('normalizeHost: trims whitespace', () => {
  assert.equal(normalizeHost('  example.com  '), 'example.com');
});

test('normalizeHost: returns null for empty', () => {
  assert.equal(normalizeHost(''), null);
  assert.equal(normalizeHost('   '), null);
  assert.equal(normalizeHost(null), null);
  assert.equal(normalizeHost(undefined), null);
});

test('normalizeHost: handles IPv6 in brackets', () => {
  assert.equal(normalizeHost('[::1]:3000'), '::1');
  assert.equal(normalizeHost('[::1]'), '::1');
});

test('normalizeHost: strips trailing dot', () => {
  assert.equal(normalizeHost('aaul.workforceap.org.'), 'aaul.workforceap.org');
});

// isCanonicalHost -------------------------------------------------------

test('isCanonicalHost: workforceap.org apex is canonical', () => {
  assert.equal(isCanonicalHost('workforceap.org'), true);
});

test('isCanonicalHost: www.workforceap.org is canonical', () => {
  assert.equal(isCanonicalHost('www.workforceap.org'), true);
});

test('isCanonicalHost: tenant subdomain is NOT canonical', () => {
  assert.equal(isCanonicalHost('aaul.workforceap.org'), false);
});

test('isCanonicalHost: vercel preview is canonical', () => {
  assert.equal(isCanonicalHost('workforceap-beta-abc123.vercel.app'), true);
});

test('isCanonicalHost: localhost is canonical', () => {
  assert.equal(isCanonicalHost('localhost'), true);
  assert.equal(isCanonicalHost('127.0.0.1'), true);
  assert.equal(isCanonicalHost('::1'), true);
});

test('isCanonicalHost: external custom domain is NOT canonical', () => {
  assert.equal(isCanonicalHost('portal.aaul.org'), false);
});

test('isCanonicalHost: null is canonical (default tenant)', () => {
  assert.equal(isCanonicalHost(null), true);
});
