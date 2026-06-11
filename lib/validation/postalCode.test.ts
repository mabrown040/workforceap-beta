import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidPostalCode } from './postalCode';

test('isValidPostalCode accepts US ZIP codes', () => {
  assert.equal(isValidPostalCode('78701'), true);
  assert.equal(isValidPostalCode('78701-1234'), true);
});

test('isValidPostalCode accepts international postal codes', () => {
  assert.equal(isValidPostalCode('100001'), true); // Lagos
  assert.equal(isValidPostalCode('SW1A 1AA'), true); // London
  assert.equal(isValidPostalCode('K1A 0B1'), true); // Ottawa
  assert.equal(isValidPostalCode(' 75001 '), true); // trims whitespace
});

test('isValidPostalCode rejects malformed values', () => {
  assert.equal(isValidPostalCode(''), false);
  assert.equal(isValidPostalCode('12'), false);
  assert.equal(isValidPostalCode('-1234'), false);
  assert.equal(isValidPostalCode('78701!'), false);
  assert.equal(isValidPostalCode('12345678901'), false);
});
