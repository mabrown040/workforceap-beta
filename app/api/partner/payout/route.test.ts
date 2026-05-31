import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPartnerPayoutIdempotencyKey } from '@/lib/partner/partnerPayout';

test('buildPartnerPayoutIdempotencyKey is stable across minute buckets', () => {
  const partnerId = '11111111-1111-4111-8111-111111111111';
  const placementId = '22222222-2222-4222-8222-222222222222';

  const originalNow = Date.now;
  try {
    Date.now = () => new Date('2026-05-30T14:53:00.000Z').getTime();
    const firstKey = buildPartnerPayoutIdempotencyKey(partnerId, placementId);

    Date.now = () => new Date('2026-05-30T14:55:00.000Z').getTime();
    const secondKey = buildPartnerPayoutIdempotencyKey(partnerId, placementId);

    assert.equal(firstKey, 'partner-payout:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222');
    assert.equal(secondKey, firstKey);
  } finally {
    Date.now = originalNow;
  }
});
