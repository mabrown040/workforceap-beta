import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlacementsQuery } from './placementsQuery';

test('buildPlacementsQuery constrains counselor-wide listing to assigned members', () => {
  const { query, params } = buildPlacementsQuery({
    staffUserId: 'staff-1',
    isAdmin: false,
    memberId: null,
    days: 0,
  });

  assert.match(query, /counselor_assignments ca/);
  assert.match(query, /ca\.member_id = pr\.user_id/);
  assert.match(query, /c\.user_id = \$1/);
  assert.deepEqual(params, ['staff-1']);
});

test('buildPlacementsQuery leaves admin-wide listing unrestricted', () => {
  const { query, params } = buildPlacementsQuery({
    staffUserId: 'admin-1',
    isAdmin: true,
    memberId: null,
    days: 0,
  });

  assert.doesNotMatch(query, /counselor_assignments/);
  assert.deepEqual(params, []);
});
