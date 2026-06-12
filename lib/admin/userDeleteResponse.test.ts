import test from 'node:test';
import assert from 'node:assert/strict';

import { userAuthDeleteFailedResponse } from './userDeleteResponse';

test('userAuthDeleteFailedResponse surfaces partial delete failure', async () => {
  const response = userAuthDeleteFailedResponse();

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    ok: false,
    partialSuccess: true,
    authCleanupRequired: true,
    error: 'User was soft-deleted, but the auth account could not be deleted.',
  });
});
