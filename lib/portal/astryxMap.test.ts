import test from 'node:test';
import assert from 'node:assert/strict';
import { toneToBadgeVariant, toneToTokenColor } from '@/components/portal/kit/astryxMap';

test('toneToTokenColor keeps alert distinct from danger', () => {
  assert.equal(toneToTokenColor('alert'), 'pink');
  assert.equal(toneToTokenColor('danger'), 'red');
  assert.notEqual(toneToTokenColor('alert'), toneToTokenColor('danger'));
});

test('toneToBadgeVariant keeps alert distinct from danger', () => {
  assert.equal(toneToBadgeVariant('alert'), 'info');
  assert.equal(toneToBadgeVariant('danger'), 'error');
  assert.notEqual(toneToBadgeVariant('alert'), toneToBadgeVariant('danger'));
});
