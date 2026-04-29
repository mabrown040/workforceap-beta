import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePostLoginRedirect } from './postLoginRedirect';

test('normalizePostLoginRedirect keeps safe portal destinations', () => {
  assert.equal(normalizePostLoginRedirect('/dashboard'), '/dashboard');
  assert.equal(normalizePostLoginRedirect('/admin/jobs?filter=pending'), '/admin/jobs?filter=pending');
});

test('normalizePostLoginRedirect falls back when redirect target is /login', () => {
  assert.equal(normalizePostLoginRedirect('/login'), '/dashboard');
  assert.equal(normalizePostLoginRedirect('/login?redirectTo=%2Fpartner'), '/dashboard');
  assert.equal(normalizePostLoginRedirect('/login#member'), '/dashboard');
});

test('normalizePostLoginRedirect still blocks malformed redirects', () => {
  assert.equal(normalizePostLoginRedirect('https://evil.com', '/dashboard'), '/dashboard');
  assert.equal(normalizePostLoginRedirect('/\\evil.com', '/dashboard'), '/dashboard');
});
