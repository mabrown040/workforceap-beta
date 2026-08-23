import test from 'node:test';
import assert from 'node:assert/strict';

import {
  inheritJobOrg,
  inheritMemberOrg,
  inheritUserOrg,
} from './adminPageScopeFilters';

const orgAdminScope = { ok: true as const, orgId: 'org-a', superAdmin: false };
const superAdminScope = { ok: true as const, orgId: 'org-a', superAdmin: true };

test('inheritUserOrg is empty for super-admin and filters for org admin', () => {
  assert.deepEqual(inheritUserOrg(superAdminScope), {});
  assert.deepEqual(inheritUserOrg(orgAdminScope), { user: { organizationId: 'org-a' } });
});

test('inheritMemberOrg is empty for super-admin and filters for org admin', () => {
  assert.deepEqual(inheritMemberOrg(superAdminScope), {});
  assert.deepEqual(inheritMemberOrg(orgAdminScope), { member: { organizationId: 'org-a' } });
});

test('inheritJobOrg is empty for super-admin and filters for org admin', () => {
  assert.deepEqual(inheritJobOrg(superAdminScope), {});
  assert.deepEqual(inheritJobOrg(orgAdminScope), { job: { organizationId: 'org-a' } });
});
