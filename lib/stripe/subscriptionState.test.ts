import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySubscriptionTransition,
  type SubscriptionState,
  type SubscriptionTransition,
} from './subscriptionState';

function store(initial: SubscriptionState) {
  let state = { ...initial };
  let failNext = false;
  return {
    read: async () => ({ ...state }),
    write: async (expected: SubscriptionState, next: SubscriptionState) => {
      if (failNext) { failNext = false; throw new Error('transient write failure'); }
      if (JSON.stringify(state) !== JSON.stringify(expected)) return false;
      state = { ...next };
      return true;
    },
    failOnce: () => { failNext = true; },
    state: () => ({ ...state }),
  };
}

const empty: SubscriptionState = {
  subscriptionId: null, status: null, eventCreated: null, eventId: null,
};

const event = (patch: Partial<SubscriptionTransition>): SubscriptionTransition => ({
  subscriptionId: 'sub-1', status: 'active', eventCreated: 100, eventId: 'evt-1',
  kind: 'invoice_succeeded', bindingAuthorized: false, replacesSubscriptionId: null, ...patch,
});

test('same-second updated snapshots converge to the authoritative current status in either order', async () => {
  for (const order of [
    ['active', 'past_due'],
    ['past_due', 'active'],
  ] as const) {
    const s = store({ ...empty, subscriptionId: 'sub-1' });
    for (const deliveredStatus of order) {
      // The handler retrieves Stripe's current object; both deliveries therefore
      // apply the same authoritative snapshot rather than their embedded status.
      await applySubscriptionTransition(s, event({
        kind: 'subscription_reconciled',
        status: 'past_due',
        eventCreated: 100,
        eventId: `evt-${deliveredStatus}`,
        bindingAuthorized: true,
      }));
    }
    assert.equal(s.state().status, 'past_due');
  }
});

test('same-second deletion dominates active invoice regardless delivery order', async () => {
  for (const order of [
    [event({ kind: 'invoice_succeeded', eventId: 'evt-z', status: 'active' }), event({ kind: 'subscription_deleted', eventId: 'evt-a', status: 'canceled' })],
    [event({ kind: 'subscription_deleted', eventId: 'evt-a', status: 'canceled' }), event({ kind: 'invoice_succeeded', eventId: 'evt-z', status: 'active' })],
  ]) {
    const s = store({ ...empty, subscriptionId: 'sub-1' });
    for (const transition of order) await applySubscriptionTransition(s, transition);
    assert.equal(s.state().status, 'canceled');
    assert.equal(s.state().eventId, 'evt-a');
  }
});

test('later invoice success cannot revive a deleted subscription', async () => {
  const s = store({ ...empty, subscriptionId: 'sub-1' });
  await applySubscriptionTransition(s, event({ kind: 'subscription_deleted', status: 'canceled', eventCreated: 100 }));
  const result = await applySubscriptionTransition(s, event({ kind: 'invoice_succeeded', status: 'active', eventCreated: 200, eventId: 'evt-later' }));
  assert.equal(result, 'ignored');
  assert.equal(s.state().status, 'canceled');
});

test('authoritative subscription update can reconcile terminal state', async () => {
  const s = store({ ...empty, subscriptionId: 'sub-1', status: 'canceled', eventCreated: 100, eventId: 'evt-delete' });
  const result = await applySubscriptionTransition(s, event({ kind: 'subscription_reconciled', status: 'active', eventCreated: 200 }));
  assert.equal(result, 'applied');
  assert.equal(s.state().status, 'active');
});

test('checkout cannot revive the same terminal subscription', async () => {
  const s = store({ ...empty, subscriptionId: 'sub-1', status: 'canceled', eventCreated: 100, eventId: 'evt-delete' });
  const result = await applySubscriptionTransition(s, event({
    kind: 'checkout', status: 'active', eventCreated: 100, eventId: 'evt-checkout',
    bindingAuthorized: true, replacesSubscriptionId: 'sub-1',
  }));
  assert.equal(result, 'ignored');
  assert.equal(s.state().status, 'canceled');
});

test('checkout replacement requires the currently bound subscription identity', async () => {
  const s = store({ ...empty, subscriptionId: 'sub-old', status: 'active' });
  assert.equal(await applySubscriptionTransition(s, event({ kind: 'checkout', subscriptionId: 'sub-new', replacesSubscriptionId: null, bindingAuthorized: true })), 'ignored');
  assert.equal(await applySubscriptionTransition(s, event({ kind: 'checkout', subscriptionId: 'sub-new', replacesSubscriptionId: 'sub-other', bindingAuthorized: true })), 'ignored');
  assert.equal(await applySubscriptionTransition(s, event({ kind: 'checkout', subscriptionId: 'sub-new', replacesSubscriptionId: 'sub-old', bindingAuthorized: true })), 'applied');
  assert.equal(s.state().subscriptionId, 'sub-new');
});

test('NULL migrated row binds only after authoritative reconciliation', async () => {
  const s = store(empty);
  assert.equal(await applySubscriptionTransition(s, event({ bindingAuthorized: false })), 'ignored');
  assert.equal(await applySubscriptionTransition(s, event({ bindingAuthorized: true })), 'applied');
  assert.equal(s.state().subscriptionId, 'sub-1');
});

test('duplicate remains ignored after process restart', async () => {
  const durable = store({ ...empty, subscriptionId: 'sub-1' });
  assert.equal(await applySubscriptionTransition(durable, event({ eventId: 'evt-durable' })), 'applied');
  assert.equal(await applySubscriptionTransition(durable, event({ eventId: 'evt-durable' })), 'ignored');
});

test('compare-and-set retries race losers and converges on the newer event', async () => {
  const s = store({ ...empty, subscriptionId: 'sub-1' });
  const results = await Promise.all([
    applySubscriptionTransition(s, event({ eventId: 'evt-a', eventCreated: 100 })),
    applySubscriptionTransition(s, event({ eventId: 'evt-b', eventCreated: 101, kind: 'invoice_failed', status: 'past_due' })),
  ]);
  assert.ok(results.includes('applied'));
  assert.equal(s.state().status, 'past_due');
  assert.equal(s.state().eventCreated, 101);
});

test('three failed compare-and-set attempts are retryable contention', async () => {
  const state = { ...empty, subscriptionId: 'sub-1' };
  const result = await applySubscriptionTransition({
    read: async () => ({ ...state }),
    write: async () => false,
  }, event({ eventId: 'evt-contended' }));
  assert.equal(result, 'contended');
});

test('transient write failure reports failure and retry applies once', async () => {
  const s = store({ ...empty, subscriptionId: 'sub-1' });
  s.failOnce();
  await assert.rejects(() => applySubscriptionTransition(s, event({ eventId: 'evt-retry' })), /transient/);
  assert.equal(s.state().eventId, null);
  assert.equal(await applySubscriptionTransition(s, event({ eventId: 'evt-retry' })), 'applied');
});
