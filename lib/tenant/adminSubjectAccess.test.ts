import test from 'node:test';
import assert from 'node:assert/strict';

import { canAdminActInSubjectOrganization } from './adminSubjectAccess';

test('org admin may act on a member in the same organization', () => {
  assert.equal(
    canAdminActInSubjectOrganization({
      actorOrgId: 'org-a',
      subjectOrgId: 'org-a',
      superAdmin: false,
    }),
    true,
  );
});

test('org admin may not act on a member in another organization', () => {
  assert.equal(
    canAdminActInSubjectOrganization({
      actorOrgId: 'org-a',
      subjectOrgId: 'org-b',
      superAdmin: false,
    }),
    false,
  );
});

test('super-admin may act across organizations for support', () => {
  assert.equal(
    canAdminActInSubjectOrganization({
      actorOrgId: null,
      subjectOrgId: 'org-b',
      superAdmin: true,
    }),
    true,
  );
});

test('missing subject organization is never authorized', () => {
  assert.equal(
    canAdminActInSubjectOrganization({
      actorOrgId: 'org-a',
      subjectOrgId: null,
      superAdmin: true,
    }),
    false,
  );
});
