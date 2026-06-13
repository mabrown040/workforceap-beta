import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchPlacementAnalytics } from './_placementsAnalytics';
import { prisma } from '@/lib/db/prisma';

test('fetchPlacementAnalytics uses count for total beyond returned sample', async (t) => {
  const placementDelegate = (prisma as any).placementRecord;
  const originalFindMany = placementDelegate.findMany;
  const originalCount = placementDelegate.count;
  const originalQueryRaw = prisma.$queryRaw;

  t.after(() => {
    placementDelegate.findMany = originalFindMany;
    placementDelegate.count = originalCount;
    (prisma as any).$queryRaw = originalQueryRaw;
  });

  const placements = Array.from({ length: 500 }, (_, index) => ({ id: `placement-${index}` }));
  let findManyArgs: any;
  let countArgs: any;

  placementDelegate.findMany = async (args: any) => {
    findManyArgs = args;
    return placements;
  };
  placementDelegate.count = async (args: any) => {
    countArgs = args;
    return 501;
  };
  (prisma as any).$queryRaw = async () => [{ avg: 100, median: 90, min: 80, max: 120 }];

  const result = await fetchPlacementAnalytics('org-1');

  assert.equal(result.placements.length, 500);
  assert.equal(result.outcomes.total, 501);
  assert.equal(findManyArgs.take, 500);
  assert.deepEqual(countArgs.where, findManyArgs.where);
});
