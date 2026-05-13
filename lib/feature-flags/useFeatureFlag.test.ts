import test from 'node:test';
import assert from 'node:assert/strict';

// Simple unit tests for the pure logic behind useFeatureFlag
// The hook itself depends on React and fetch; we test the filtering behavior
// via the publicApi tests. Here we verify the deterministic hashing used
// by the hook's underlying flag resolution.

import { hashStringToBucket } from './publicApi';

test('hashStringToBucket is stable for user-flag pairs', () => {
  const bucket1 = hashStringToBucket('user-123:coursera-v2', 100);
  const bucket2 = hashStringToBucket('user-123:coursera-v2', 100);
  const bucket3 = hashStringToBucket('user-456:coursera-v2', 100);

  assert.equal(bucket1, bucket2);
  assert.ok(bucket1 >= 0 && bucket1 < 100);
  assert.ok(bucket3 >= 0 && bucket3 < 100);
});

test('hashStringToBucket distributes across buckets', () => {
  const buckets = new Set<number>();
  for (let i = 0; i < 100; i++) {
    buckets.add(hashStringToBucket(`user-${i}:flag-x`, 100));
  }
  // With 100 different users we should see a reasonable spread
  assert.ok(buckets.size >= 10, `Expected at least 10 unique buckets, got ${buckets.size}`);
});
