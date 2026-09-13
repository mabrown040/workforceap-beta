import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileOrganizationSubscription } from './subscriptionPersistence';
import { SubscriptionPersistenceContendedError } from './subscriptionState';

test('composition reads revision, fetches outside CAS, and increments revision on unchanged status', async () => {
  const calls: string[] = [];
  const tx = {
    organization: {
      findUniqueOrThrow: async () => { calls.push('read'); return {
        stripeSubscriptionId: 'sub-1', subscriptionStatus: 'active', stripeSubscriptionEventAt: 99,
        stripeSubscriptionEventId: 'evt-old', stripeSubscriptionRevision: 4,
      }; },
      updateMany: async (args: any) => { calls.push('commit'); assert.equal(args.where.stripeSubscriptionRevision, 4); assert.deepEqual(args.data.stripeSubscriptionRevision, { increment: 1 }); return { count: 1 }; },
    },
  };
  const result = await reconcileOrganizationSubscription(tx as never, { organizationId: 'org-1', customerId: 'cus-1' }, {
    subscriptionId: 'sub-1', eventCreated: 100, eventId: 'evt-new', kind: 'subscription_updated', replacesSubscriptionId: null,
  }, async () => { calls.push('fetch'); return { id: 'sub-1', customerId: 'cus-1', status: 'active' }; });
  assert.equal(result, 'applied');
  assert.deepEqual(calls, ['read', 'fetch', 'commit']);
});

test('CAS loss rereads and refetches; exhaustion throws retryable', async () => {
  let reads = 0; let fetches = 0; let commits = 0;
  const tx = { organization: {
    findUniqueOrThrow: async () => { reads += 1; return { stripeSubscriptionId: 'sub-1', subscriptionStatus: 'active', stripeSubscriptionEventAt: null, stripeSubscriptionEventId: null, stripeSubscriptionRevision: reads }; },
    updateMany: async () => { commits += 1; return { count: 0 }; },
  } };
  await assert.rejects(() => reconcileOrganizationSubscription(tx as never, { organizationId: 'org-1' }, {
    subscriptionId: 'sub-1', eventCreated: 100, eventId: 'evt-1', kind: 'invoice_failed', replacesSubscriptionId: null,
  }, async () => { fetches += 1; return { id: 'sub-1', customerId: 'cus-1', status: 'past_due' }; }), SubscriptionPersistenceContendedError);
  assert.deepEqual({ reads, fetches, commits }, { reads: 3, fetches: 3, commits: 3 });
});

test('employer mirror runs only after successful CAS and failures propagate', async () => {
  let count = 0;
  let mirrored = 0;
  const tx: any = {
    employer: {
      findUniqueOrThrow: async () => ({
        stripeSubscriptionId: 'sub-1', stripeSubscriptionStatus: 'active',
        stripeSubscriptionEventAt: null, stripeSubscriptionEventId: null,
        stripeSubscriptionRevision: 2,
      }),
      updateMany: async () => ({ count }),
    },
    $transaction: async (fn: (inner: any) => Promise<unknown>) => fn(tx),
  };
  const intent = {
    subscriptionId: 'sub-1', eventCreated: 100, eventId: 'evt-mirror',
    kind: 'subscription_updated' as const, replacesSubscriptionId: null,
  };
  const fetchCanonical = async () => ({ id: 'sub-1', customerId: 'cus-1', status: 'active' });

  await assert.rejects(
    () => import('./subscriptionPersistence').then(({ reconcileEmployerSubscription }) =>
      reconcileEmployerSubscription(tx, { employerId: 'emp-1' }, intent, fetchCanonical, async () => { mirrored += 1; })),
    SubscriptionPersistenceContendedError,
  );
  assert.equal(mirrored, 0);

  count = 1;
  await assert.rejects(
    () => import('./subscriptionPersistence').then(({ reconcileEmployerSubscription }) =>
      reconcileEmployerSubscription(tx, { employerId: 'emp-1' }, { ...intent, eventId: 'evt-fail' }, fetchCanonical, async () => {
        mirrored += 1;
        throw new Error('mirror failed');
      })),
    /mirror failed/,
  );
  assert.equal(mirrored, 1);
});
