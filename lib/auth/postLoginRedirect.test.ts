import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePostLoginRedirect, resolveRoleAwarePostLoginRedirect } from './postLoginRedirect';

test('normalizePostLoginRedirect keeps safe portal destinations', () => {
  assert.equal(normalizePostLoginRedirect('/dashboard'), '/dashboard');
  assert.equal(normalizePostLoginRedirect('/admin/jobs?filter=pending'), '/admin/jobs?filter=pending');
});

test('normalizePostLoginRedirect falls back when redirect target is /login', () => {
  assert.equal(normalizePostLoginRedirect('/login'), '/dashboard');
  assert.equal(normalizePostLoginRedirect('/login?redirectTo=%2Fpartner'), '/dashboard');
  assert.equal(normalizePostLoginRedirect('/login#member'), '/dashboard');
  assert.equal(normalizePostLoginRedirect('/es/login?redirectTo=%2Fpartner'), '/es/dashboard');
});

test('normalizePostLoginRedirect still blocks malformed redirects', () => {
  assert.equal(normalizePostLoginRedirect('https://evil.com', '/dashboard'), '/dashboard');
  assert.equal(normalizePostLoginRedirect('/\\evil.com', '/dashboard'), '/dashboard');
});

test('resolveRoleAwarePostLoginRedirect sends counselors to /counselor when destination is member home', () => {
  assert.equal(resolveRoleAwarePostLoginRedirect('/dashboard', 'counselor'), '/counselor');
  assert.equal(resolveRoleAwarePostLoginRedirect('/dashboard?x=1', 'counselor'), '/counselor');
  assert.equal(resolveRoleAwarePostLoginRedirect('/es/dashboard', 'counselor'), '/es/counselor');
});

test('resolveRoleAwarePostLoginRedirect leaves /counselor and nested /dashboard paths unchanged', () => {
  assert.equal(resolveRoleAwarePostLoginRedirect('/counselor', 'counselor'), '/counselor');
  assert.equal(resolveRoleAwarePostLoginRedirect('/dashboard/messages', 'counselor'), '/dashboard/messages');
  assert.equal(resolveRoleAwarePostLoginRedirect('/employer', 'counselor'), '/employer');
});

test('resolveRoleAwarePostLoginRedirect keeps member and employer on /dashboard', () => {
  assert.equal(resolveRoleAwarePostLoginRedirect('/dashboard', 'member'), '/dashboard');
  assert.equal(resolveRoleAwarePostLoginRedirect('/dashboard', 'employer'), '/dashboard');
  assert.equal(resolveRoleAwarePostLoginRedirect('/dashboard', undefined), '/dashboard');
});

test('resolveRoleAwarePostLoginRedirect keeps super_admin on /admin', () => {
  assert.equal(resolveRoleAwarePostLoginRedirect('/dashboard', 'super_admin'), '/admin');
  assert.equal(resolveRoleAwarePostLoginRedirect('/employer', 'super_admin'), '/admin');
  assert.equal(resolveRoleAwarePostLoginRedirect('/es/dashboard', 'super_admin'), '/es/admin');
});

test('resolveRoleAwarePostLoginRedirect sends admins to /admin from member home only', () => {
  assert.equal(resolveRoleAwarePostLoginRedirect('/dashboard', 'admin'), '/admin');
  assert.equal(resolveRoleAwarePostLoginRedirect('/employer', 'admin'), '/employer');
});
