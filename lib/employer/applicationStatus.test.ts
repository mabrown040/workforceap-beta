import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionJobApplicationStatus } from './applicationStatus';

describe('canTransitionJobApplicationStatus', () => {
  it('allows pending to reviewing', () => {
    assert.equal(canTransitionJobApplicationStatus('pending', 'reviewing'), true);
  });
  it('blocks pending to hired', () => {
    assert.equal(canTransitionJobApplicationStatus('pending', 'hired'), false);
  });
  it('allows rejected to reopen as pending', () => {
    assert.equal(canTransitionJobApplicationStatus('rejected', 'pending'), true);
  });
  it('blocks hired to anything', () => {
    assert.equal(canTransitionJobApplicationStatus('hired', 'reviewing'), false);
  });
});
