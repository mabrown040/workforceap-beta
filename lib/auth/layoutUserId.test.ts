import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLayoutUserId } from './layoutUserId';

describe('resolveLayoutUserId', () => {
  it('returns null when the forwarded header is absent (no getUser fallback)', () => {
    assert.equal(resolveLayoutUserId(null), null);
    assert.equal(resolveLayoutUserId(undefined), null);
    assert.equal(resolveLayoutUserId(''), null);
    assert.equal(resolveLayoutUserId('   '), null);
  });

  it('returns the trimmed header value when middleware forwarded a user id', () => {
    assert.equal(resolveLayoutUserId('user-123'), 'user-123');
    assert.equal(resolveLayoutUserId('  user-123  '), 'user-123');
  });
});
