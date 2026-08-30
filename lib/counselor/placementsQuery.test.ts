import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlacementsQuery } from './placementsQuery';

test('buildPlacementsQuery constrains counselor-wide listing to assigned members', () => {
  const { query, params } = buildPlacementsQuery({
    staffUserId: 'staff-1',
    isAdmin: false,
    isSuperAdmin: false,
    organizationId: null,
    memberId: null,
    days: 0,
  });

  assert.match(query, /counselor_assignments ca/);
  assert.match(query, /ca\.member_id = pr\.user_id/);
  assert.match(query, /c\.user_id = \$1/);
  assert.deepEqual(params, ['staff-1']);
});

test('buildPlacementsQuery constrains org-admin listing to the actor organization', () => {
  const { query, params } = buildPlacementsQuery({
    staffUserId: 'admin-1',
    isAdmin: true,
    isSuperAdmin: false,
    organizationId: 'org-1',
    memberId: null,
    days: 0,
  });

  assert.doesNotMatch(query, /counselor_assignments/);
  assert.match(query, /u\.organization_id = \$1/);
  assert.deepEqual(params, ['org-1']);
});

test('buildPlacementsQuery leaves super-admin listing unrestricted for platform support', () => {
  const { query, params } = buildPlacementsQuery({
    staffUserId: 'super-1',
    isAdmin: true,
    isSuperAdmin: true,
    organizationId: null,
    memberId: null,
    days: 0,
  });

  assert.doesNotMatch(query, /counselor_assignments/);
  assert.doesNotMatch(query, /u\.organization_id/);
  assert.deepEqual(params, []);
});
