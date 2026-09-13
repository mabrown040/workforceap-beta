import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileSubscriptionState,
  SubscriptionOwnershipUnresolvedError,
  SubscriptionPersistenceContendedError,
  type CanonicalSubscription,
  type SubscriptionIntent,
  type SubscriptionState,
} from './subscriptionState';

const empty: SubscriptionState = { subscriptionId: null, status: null, eventCreated: null, eventId: null, revision: 0 };
const canonical = (status = 'active', id = 'sub-1'): CanonicalSubscription => ({ id, status, customerId: 'cus-1' });
const intent = (patch: Partial<SubscriptionIntent> = {}): SubscriptionIntent => ({
  subscriptionId: 'sub-1', eventCreated: 100, eventId: 'evt-1', kind: 'subscription_updated', replacesSubscriptionId: null, ...patch,
});

function stateful(initial: SubscriptionState, options: { authorize?: boolean; failCommits?: number } = {}) {
  let state = { ...initial };
  let failures = options.failCommits ?? 0;
  return {
    store: {
      read: async () => ({ ...state }),
      authorize: async () => ({ authorized: options.authorize ?? true }),
      commit: async (expected: SubscriptionState, next: SubscriptionState) => {
        const revision = expected.revision;
        if (failures > 0) { failures -= 1; return false; }
        if (state.revision !== revision) return false;
        state = { ...next };
        return true;
      },
    },
    state: () => ({ ...state }),
    mutate: (next: SubscriptionState) => { state = { ...next }; },
  };
}

async function apply(s: ReturnType<typeof stateful>, i: SubscriptionIntent, status = 'active', id = i.subscriptionId) {
  return reconcileSubscriptionState(s.store, i, async () => canonical(status, id));
}

test('tied subscription updates converge to canonical status in both delivery orders and increment revision unchanged', async () => {
  for (const order of ['active-first', 'past-due-first']) {
    const s = stateful({ ...empty, subscriptionId: 'sub-1', status: 'active' });
    for (const id of order === 'active-first' ? ['evt-active', 'evt-past'] : ['evt-past', 'evt-active']) {
      await apply(s, intent({ eventId: id }), 'past_due');
    }
    assert.equal(s.state().status, 'past_due');
    assert.equal(s.state().revision, 2);
  }
});

test('deletion is terminal against later or earlier invoice delivery', async () => {
  for (const deletionFirst of [true, false]) {
    const s = stateful({ ...empty, subscriptionId: 'sub-1', status: 'active' });
    const deletion = () => apply(s, intent({ kind: 'subscription_deleted', eventId: 'evt-delete' }), 'active');
    const invoice = () => apply(s, intent({ kind: 'invoice_succeeded', eventId: 'evt-invoice', eventCreated: 200 }), 'active');
    if (deletionFirst) { await deletion(); await invoice(); } else { await invoice(); await deletion(); }
    assert.equal(s.state().status, 'canceled');
  }
});

test('NULL binding requires authority and deletion is never discarded', async () => {
  const denied = stateful(empty, { authorize: false });
  await assert.rejects(() => apply(denied, intent({ kind: 'subscription_deleted' }), 'canceled'), SubscriptionOwnershipUnresolvedError);
  const accepted = stateful(empty);
  await apply(accepted, intent({ kind: 'subscription_deleted' }), 'active');
  assert.equal(accepted.state().status, 'canceled');
});

test('checkout cannot revive canonical canceled same subscription', async () => {
  const s = stateful({ ...empty, subscriptionId: 'sub-1', status: 'canceled', revision: 4 });
  await apply(s, intent({ kind: 'checkout', replacesSubscriptionId: 'sub-1' }), 'active');
  assert.equal(s.state().status, 'canceled');
  assert.equal(s.state().revision, 5);
});

test('authorized replacement requires a different subscription and exact predecessor regardless old cursor/status', async () => {
  for (const status of ['active', 'canceled']) {
    const s = stateful({ subscriptionId: 'sub-old', status, eventCreated: 999, eventId: 'evt-old', revision: 7 });
    await apply(s, intent({ kind: 'checkout', subscriptionId: 'sub-new', replacesSubscriptionId: 'sub-old', eventCreated: 1 }), 'active', 'sub-new');
    assert.equal(s.state().subscriptionId, 'sub-new');
    assert.equal(s.state().revision, 8);
  }
});

test('wrong predecessor and competing replacement are denied', async () => {
  const wrong = stateful({ ...empty, subscriptionId: 'sub-old', status: 'active' });
  assert.equal(await apply(wrong, intent({ kind: 'checkout', subscriptionId: 'sub-new', replacesSubscriptionId: 'wrong' }), 'active', 'sub-new'), 'ignored');
  const race = stateful({ ...empty, subscriptionId: 'sub-old', status: 'active' });
  await apply(race, intent({ kind: 'checkout', subscriptionId: 'sub-a', replacesSubscriptionId: 'sub-old', eventId: 'evt-a' }), 'active', 'sub-a');
  assert.equal(await apply(race, intent({ kind: 'checkout', subscriptionId: 'sub-b', replacesSubscriptionId: 'sub-old', eventId: 'evt-b' }), 'active', 'sub-b'), 'ignored');
});

test('old subscription events cannot mutate a replacement binding', async () => {
  const s = stateful({ ...empty, subscriptionId: 'sub-new', status: 'active', revision: 3 });
  assert.equal(await apply(s, intent({ subscriptionId: 'sub-old', kind: 'invoice_failed' }), 'past_due', 'sub-old'), 'ignored');
  assert.equal(s.state().subscriptionId, 'sub-new');
});

test('duplicate survives restart and does not increment revision', async () => {
  const persisted = { subscriptionId: 'sub-1', status: 'active', eventCreated: 100, eventId: 'evt-1', revision: 9 };
  const restarted = stateful(persisted);
  assert.equal(await apply(restarted, intent()), 'ignored');
  assert.equal(restarted.state().revision, 9);
});

test('delayed provider snapshot loses CAS, is discarded, and refetches from new revision', async () => {
  let state: SubscriptionState = { ...empty, subscriptionId: 'sub-1', status: 'active', revision: 1 };
  let fetches = 0;
  const result = await reconcileSubscriptionState({
    read: async () => ({ ...state }),
    authorize: async () => ({ authorized: true }),
    commit: async (expected, next) => {
      const revision = expected.revision;
      if (revision === 1) { state = { ...state, status: 'past_due', revision: 2, eventId: 'evt-concurrent' }; return false; }
      if (revision !== state.revision) return false;
      state = { ...next }; return true;
    },
  }, intent({ eventId: 'evt-retry' }), async () => {
    fetches += 1;
    return canonical(fetches === 1 ? 'active' : 'past_due');
  });
  assert.equal(result, 'applied');
  assert.equal(fetches, 2);
  assert.equal(state.status, 'past_due');
  assert.equal(state.revision, 3);
});

test('revision blocks ABA even when binding/status return to prior values', async () => {
  const s = stateful({ ...empty, subscriptionId: 'sub-1', status: 'active', revision: 5 }, { failCommits: 1 });
  await apply(s, intent({ eventId: 'evt-aba' }), 'active');
  assert.equal(s.state().revision, 6);
});

test('provider failure propagates and three CAS losses are retryable', async () => {
  const s = stateful({ ...empty, subscriptionId: 'sub-1', status: 'active' });
  await assert.rejects(() => reconcileSubscriptionState(s.store, intent(), async () => { throw new Error('provider down'); }), /provider down/);
  const contended = stateful({ ...empty, subscriptionId: 'sub-1', status: 'active' }, { failCommits: 3 });
  await assert.rejects(() => apply(contended, intent({ eventId: 'evt-contention' })), SubscriptionPersistenceContendedError);
});


test('terminal deletion sets basic tier and later same-ID invoice cannot restore tier', async () => {
  const s = stateful({ ...empty, subscriptionId: 'sub-1', status: 'active', tier: 'growth' });
  await apply(s, intent({ kind: 'subscription_deleted', eventId: 'evt-delete' }), 'active');
  assert.deepEqual({ status: s.state().status, tier: s.state().tier }, { status: 'canceled', tier: 'basic' });
  await apply(s, intent({ kind: 'invoice_succeeded', eventId: 'evt-late', eventCreated: 200 }), 'active');
  assert.deepEqual({ status: s.state().status, tier: s.state().tier }, { status: 'canceled', tier: 'basic' });
});
