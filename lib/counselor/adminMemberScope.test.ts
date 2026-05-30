import test from 'node:test';
import assert from 'node:assert/strict';
import { enrolledMembersInOrganizationWhere } from './adminMemberScope';

test('enrolledMembersInOrganizationWhere scopes admin fallback to actor organization', () => {
  assert.deepEqual(enrolledMembersInOrganizationWhere('org-a'), {
    organizationId: 'org-a',
    deletedAt: null,
    enrolledProgram: { not: null },
  });
});
