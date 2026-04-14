import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPortalSwitcherRoles } from './portalRoleSwitcher';

test('does not invent member access for employer-only users', () => {
  const roles = buildPortalSwitcherRoles({
    userRoleNames: ['employer'],
    hasEmployer: true,
    hasPartner: false,
    hasCounselor: false,
    hasAdmin: false,
  });

  assert.deepEqual(roles, [{ role: 'employer', roleLabel: 'Employer', homeHref: '/employer' }]);
});

test('keeps explicitly granted member access for true multi-role users', () => {
  const roles = buildPortalSwitcherRoles({
    userRoleNames: ['member', 'employer'],
    hasEmployer: true,
    hasPartner: false,
    hasCounselor: false,
    hasAdmin: false,
  });

  assert.deepEqual(roles, [
    { role: 'member', roleLabel: 'Student', homeHref: '/dashboard' },
    { role: 'employer', roleLabel: 'Employer', homeHref: '/employer' },
  ]);
});

test('does not infer counselor from admin access alone', () => {
  const roles = buildPortalSwitcherRoles({
    userRoleNames: ['admin'],
    hasEmployer: false,
    hasPartner: false,
    hasCounselor: false,
    hasAdmin: true,
  });

  assert.deepEqual(roles, [{ role: 'admin', roleLabel: 'Admin', homeHref: '/admin' }]);
});

test('includes counselor only when the user truly has counselor access', () => {
  const roles = buildPortalSwitcherRoles({
    userRoleNames: ['admin'],
    hasEmployer: false,
    hasPartner: false,
    hasCounselor: true,
    hasAdmin: true,
  });

  assert.deepEqual(roles, [
    { role: 'counselor', roleLabel: 'Counselor', homeHref: '/counselor' },
    { role: 'admin', roleLabel: 'Admin', homeHref: '/admin' },
  ]);
});

test('ignores member-like profile defaults when member is not truly granted', () => {
  const roles = buildPortalSwitcherRoles({
    userRoleNames: ['employer', 'admin'],
    hasEmployer: true,
    hasPartner: false,
    hasCounselor: false,
    hasAdmin: true,
  });

  assert.deepEqual(roles, [
    { role: 'employer', roleLabel: 'Employer', homeHref: '/employer' },
    { role: 'admin', roleLabel: 'Admin', homeHref: '/admin' },
  ]);
});
