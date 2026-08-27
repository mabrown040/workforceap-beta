import assert from 'node:assert/strict';
import test from 'node:test';

import { hasAdminAccess, hasSuperAdminAccess } from './roleAccess';

test('hasSuperAdminAccess is true for profile super_admin', () => {
  assert.equal(hasSuperAdminAccess('super_admin', []), true);
});

test('hasSuperAdminAccess is true for UserRole super_admin even when profile is member', () => {
  assert.equal(hasSuperAdminAccess('member', ['super_admin']), true);
});

test('hasSuperAdminAccess is false for admin-only access', () => {
  assert.equal(hasSuperAdminAccess('admin', []), false);
  assert.equal(hasSuperAdminAccess('member', ['admin']), false);
  assert.equal(hasSuperAdminAccess('member', []), false);
});

test('hasAdminAccess includes UserRole super_admin so platform owners can open /admin', () => {
  assert.equal(hasAdminAccess('member', ['super_admin']), true);
  assert.equal(hasAdminAccess('super_admin', []), true);
  assert.equal(hasAdminAccess('admin', []), true);
  assert.equal(hasAdminAccess('member', ['admin']), true);
  assert.equal(hasAdminAccess('member', []), false);
});
