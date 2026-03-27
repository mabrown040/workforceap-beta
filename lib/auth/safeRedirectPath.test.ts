import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRedirectPath } from './safeRedirectPath';

test('sanitizeRedirectPath keeps safe relative portal paths', () => {
  assert.equal(sanitizeRedirectPath('/dashboard'), '/dashboard');
  assert.equal(sanitizeRedirectPath('/admin/jobs?filter=pending'), '/admin/jobs?filter=pending');
});

test('sanitizeRedirectPath blocks absolute and protocol-relative redirects', () => {
  assert.equal(sanitizeRedirectPath('https://evil.com', '/dashboard'), '/dashboard');
  assert.equal(sanitizeRedirectPath('//evil.com/path', '/dashboard'), '/dashboard');
  assert.equal(sanitizeRedirectPath('http://evil.com', '/dashboard'), '/dashboard');
});

test('sanitizeRedirectPath blocks malformed or dangerous input', () => {
  assert.equal(sanitizeRedirectPath('/\\evil.com', '/dashboard'), '/dashboard');
  assert.equal(sanitizeRedirectPath('/dashboard\r\nx-test: injected', '/dashboard'), '/dashboard');
  assert.equal(sanitizeRedirectPath('/dashboard\0null', '/dashboard'), '/dashboard');
});
