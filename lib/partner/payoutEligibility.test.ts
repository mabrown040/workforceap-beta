import test from 'node:test';
import assert from 'node:assert/strict';

import { getPlacementPayoutRejection } from './payoutEligibility';

test('getPlacementPayoutRejection rejects missing or unrelated placements', () => {
  assert.deepEqual(getPlacementPayoutRejection(null), {
    error: 'Placement not found for this partner',
    status: 404,
  });
});

test('getPlacementPayoutRejection rejects unverified placements', () => {
  const rejection = getPlacementPayoutRejection({
    id: 'placement-1',
    userId: 'user-1',
    placedAt: new Date('2026-01-01T00:00:00.000Z'),
    startDateVerified: false,
    paidEvent: null,
  });

  assert.deepEqual(rejection, {
    error: 'Placement is not eligible for payout until verified',
    status: 400,
  });
});

test('getPlacementPayoutRejection rejects already paid placements', () => {
  const rejection = getPlacementPayoutRejection({
    id: 'placement-1',
    userId: 'user-1',
    placedAt: new Date('2026-01-01T00:00:00.000Z'),
    startDateVerified: true,
    paidEvent: { id: 'event-1' },
  });

  assert.deepEqual(rejection, {
    error: 'Placement has already been paid out',
    status: 400,
  });
});

test('getPlacementPayoutRejection allows verified unpaid placements', () => {
  const rejection = getPlacementPayoutRejection({
    id: 'placement-1',
    userId: 'user-1',
    placedAt: new Date('2026-01-01T00:00:00.000Z'),
    startDateVerified: true,
    paidEvent: null,
  });

  assert.equal(rejection, null);
});
