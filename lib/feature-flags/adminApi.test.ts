import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchFeatureFlags, validateCreateBody } from './adminApi';
import { prisma } from '@/lib/db/prisma';

test('fetchFeatureFlags returns ordered flags', async (t) => {
  const featureFlagDelegate = (prisma as any).featureFlag;
  const originalFindMany = featureFlagDelegate.findMany;

  t.after(() => {
    featureFlagDelegate.findMany = originalFindMany;
  });

  const mockFlags = [
    { id: '1', key: 'flag-a', name: 'Flag A', enabled: true },
    { id: '2', key: 'flag-b', name: 'Flag B', enabled: false },
  ];

  featureFlagDelegate.findMany = async (args: any) => {
    assert.equal(args.orderBy.createdAt, 'desc');
    return mockFlags;
  };

  const result = await fetchFeatureFlags();
  assert.equal(result.length, 2);
  assert.equal(result[0].key, 'flag-a');
});

test('validateCreateBody requires key and name', () => {
  const empty = validateCreateBody({});
  assert.equal(empty.error, 'key and name are required');

  const noName = validateCreateBody({ key: 'test' });
  assert.equal(noName.error, 'key and name are required');

  const noKey = validateCreateBody({ name: 'Test' });
  assert.equal(noKey.error, 'key and name are required');

  const whitespace = validateCreateBody({ key: '  ', name: '  ' });
  assert.equal(whitespace.error, 'key and name are required');
});

test('validateCreateBody clamps rollout percentage', () => {
  const result = validateCreateBody({ key: 'k', name: 'N', rolloutPercentage: 150 });
  assert.ok(!result.error);
  assert.equal((result.data as any).rolloutPercentage, 100);

  const result2 = validateCreateBody({ key: 'k', name: 'N', rolloutPercentage: -10 });
  assert.equal((result2.data as any).rolloutPercentage, 0);
});

test('validateCreateBody filters non-string roles', () => {
  const result = validateCreateBody({
    key: 'k',
    name: 'N',
    allowedRoles: ['admin', 123, null, 'member'],
  });
  assert.deepEqual((result.data as any).allowedRoles, ['admin', 'member']);
});

test('validateCreateBody trims strings', () => {
  const result = validateCreateBody({
    key: '  my-key  ',
    name: '  My Name  ',
    description: '  desc  ',
  });
  assert.equal((result.data as any).key, 'my-key');
  assert.equal((result.data as any).name, 'My Name');
  assert.equal((result.data as any).description, 'desc');
});
