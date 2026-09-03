import test from 'node:test';
import assert from 'node:assert/strict';
import { loginCodeFromToken, normalizeLoginCode } from './loginCode';

test('login code is the first 8 hex chars of the token, grouped for reading', () => {
  const token = 'ab12cd34ef56' + '0'.repeat(52);
  assert.equal(loginCodeFromToken(token), 'AB12-CD34');
});

test('normalizeLoginCode tolerates dashes, spaces, and case; rejects junk', () => {
  assert.equal(normalizeLoginCode('AB12-CD34'), 'ab12cd34');
  assert.equal(normalizeLoginCode(' ab12 cd34 '), 'ab12cd34');
  assert.equal(normalizeLoginCode('AB12-CD3'), null);
  assert.equal(normalizeLoginCode('ZZZZ-ZZZZ'), null);
  assert.equal(normalizeLoginCode(42), null);
});
