import test from 'node:test';
import assert from 'node:assert/strict';

import { hashStringToBucket, filterVisibleFlags } from './publicApi';

test('hashStringToBucket is deterministic and within range', () => {
  const b1 = hashStringToBucket('user-1:flag-a', 100);
  const b2 = hashStringToBucket('user-1:flag-a', 100);
  assert.equal(b1, b2);
  assert.ok(b1 >= 0 && b1 < 100);

  const b3 = hashStringToBucket('user-2:flag-a', 100);
  assert.ok(b3 >= 0 && b3 < 100);
});

test('filterVisibleFlags excludes disabled flags', () => {
  const flags = [
    { key: 'on', name: 'On', description: null, enabled: true, rolloutPercentage: 100, allowedRoles: [] },
    { key: 'off', name: 'Off', description: null, enabled: false, rolloutPercentage: 100, allowedRoles: [] },
  ];
  const result = filterVisibleFlags(flags, 'user-1', ['member']);
  assert.equal(result.length, 1);
  assert.equal(result[0].key, 'on');
});

test('filterVisibleFlags allows all roles when allowedRoles empty', () => {
  const flags = [
    { key: 'a', name: 'A', description: null, enabled: true, rolloutPercentage: 100, allowedRoles: [] as string[] },
  ];
  const result = filterVisibleFlags(flags, 'user-1', ['member']);
  assert.equal(result.length, 1);
});

test('filterVisibleFlags filters by role', () => {
  const flags = [
    { key: 'admin-only', name: 'Admin', description: null, enabled: true, rolloutPercentage: 100, allowedRoles: ['admin'] },
    { key: 'member', name: 'Member', description: null, enabled: true, rolloutPercentage: 100, allowedRoles: ['member'] },
  ];
  const result = filterVisibleFlags(flags, 'user-1', ['member']);
  assert.equal(result.length, 1);
  assert.equal(result[0].key, 'member');
});

test('filterVisibleFlags respects rollout percentage deterministically', () => {
  const flags = [
    { key: 'roll', name: 'Roll', description: null, enabled: true, rolloutPercentage: 0, allowedRoles: [] },
  ];
  const result = filterVisibleFlags(flags, 'user-1', ['member']);
  assert.equal(result.length, 0);

  const flags2 = [
    { key: 'roll', name: 'Roll', description: null, enabled: true, rolloutPercentage: 100, allowedRoles: [] },
  ];
  const result2 = filterVisibleFlags(flags2, 'user-1', ['member']);
  assert.equal(result2.length, 1);
});
