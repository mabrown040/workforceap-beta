import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyticsOverviewUserWhere,
  trainingDashboardMemberWhere,
  triageDigestAssignmentWhere,
  triageDigestEventWhere,
  triageDigestMemberWhere,
  triageDigestNewApplicantWhere,
  triageDigestStaleTrainingWhere,
} from './overviewOrgFilter';

const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SINCE = new Date('2026-08-01T00:00:00Z');

test('training dashboard member where is pinned to the given org', () => {
  const where = trainingDashboardMemberWhere(ORG_A);
  assert.equal(where.organizationId, ORG_A);
  assert.equal(where.deletedAt, null);
  assert.deepEqual(where.enrolledProgram, { not: null });
  assert.notEqual(where.organizationId, ORG_B);
});

test('triage digest user filters are pinned to the given org', () => {
  assert.equal(triageDigestMemberWhere(ORG_A).organizationId, ORG_A);
  assert.equal(triageDigestNewApplicantWhere(ORG_A, SINCE).organizationId, ORG_A);
  assert.equal(triageDigestStaleTrainingWhere(ORG_B).organizationId, ORG_B);
  assert.deepEqual(triageDigestNewApplicantWhere(ORG_A, SINCE).createdAt, { gte: SINCE });
});

test('triage digest event and assignment filters inherit org via user/member FK', () => {
  assert.deepEqual(triageDigestEventWhere(ORG_A, SINCE), {
    createdAt: { gte: SINCE },
    user: { organizationId: ORG_A },
  });
  assert.deepEqual(triageDigestAssignmentWhere(ORG_B), {
    active: true,
    member: { organizationId: ORG_B },
  });
});

test('analytics overview user where is pinned to the given org', () => {
  const where = analyticsOverviewUserWhere(ORG_A);
  assert.equal(where.organizationId, ORG_A);
  assert.equal(where.deletedAt, null);
});
