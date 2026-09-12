import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOrganizationSubscriptionTransition,
  SubscriptionPersistenceContendedError,
} from './subscriptionPersistence';

test('three failed database CAS writes surface retryable contention', async () => {
  let writes = 0;
  const tx = {
    organization: {
      findUniqueOrThrow: async () => ({
        stripeSubscriptionId: 'sub-1',
        subscriptionStatus: 'active',
        stripeSubscriptionEventAt: null,
        stripeSubscriptionEventId: null,
      }),
      updateMany: async () => { writes += 1; return { count: 0 }; },
    },
  };

  await assert.rejects(
    () => applyOrganizationSubscriptionTransition(tx as never, 'org-1', {
      subscriptionId: 'sub-1', status: 'past_due', eventCreated: 100, eventId: 'evt-1',
      kind: 'invoice_failed', bindingAuthorized: false, replacesSubscriptionId: null,
    }),
    SubscriptionPersistenceContendedError,
  );
  assert.equal(writes, 3);
});
