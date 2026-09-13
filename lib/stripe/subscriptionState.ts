export type SubscriptionIntentKind =
  | 'checkout'
  | 'subscription_updated'
  | 'subscription_deleted'
  | 'invoice_succeeded'
  | 'invoice_failed'
  | 'direct_subscribe';

export type SubscriptionState = {
  subscriptionId: string | null;
  status: string | null;
  eventCreated: number | null;
  eventId: string | null;
  revision: number;
  tier?: string | null;
};

export type SubscriptionIntent = {
  subscriptionId: string;
  eventCreated: number;
  eventId: string;
  kind: SubscriptionIntentKind;
  replacesSubscriptionId: string | null;
  tier?: string;
};

export type CanonicalSubscription = {
  id: string;
  customerId: string;
  status: string;
  organizationId?: string;
  employerId?: string;
  userId?: string;
  tier?: string;
};

export type SubscriptionAuthority = {
  authorized: boolean;
};

export type SubscriptionReconciliationStore = {
  read(): Promise<SubscriptionState>;
  authorize(
    state: SubscriptionState,
    canonical: CanonicalSubscription,
    intent: SubscriptionIntent,
  ): Promise<SubscriptionAuthority>;
  commit(expected: SubscriptionState, next: SubscriptionState): Promise<boolean>;
};

export class SubscriptionOwnershipUnresolvedError extends Error {
  constructor() {
    super('Subscription ownership could not be established; retry the Stripe event');
    this.name = 'SubscriptionOwnershipUnresolvedError';
  }
}

export class SubscriptionPersistenceContendedError extends Error {
  constructor() {
    super('Subscription state changed concurrently; retry the Stripe event');
    this.name = 'SubscriptionPersistenceContendedError';
  }
}

function canonicalStatus(status: string): string {
  if (status === 'canceled') return 'canceled';
  if (status === 'active' || status === 'trialing') return 'active';
  return 'past_due';
}

export async function reconcileSubscriptionState(
  store: SubscriptionReconciliationStore,
  intent: SubscriptionIntent,
  fetchCanonical: () => Promise<CanonicalSubscription>,
): Promise<'applied' | 'ignored'> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await store.read();
    if (current.eventId === intent.eventId) return 'ignored';

    // Provider I/O deliberately occurs after the revision read and outside the
    // short CAS transaction. A lost CAS discards this snapshot and refetches.
    const canonical = await fetchCanonical();
    if (canonical.id !== intent.subscriptionId) {
      throw new SubscriptionOwnershipUnresolvedError();
    }
    const authority = await store.authorize(current, canonical, intent);
    if (!authority.authorized) throw new SubscriptionOwnershipUnresolvedError();

    const isReplacement = current.subscriptionId !== null && current.subscriptionId !== canonical.id;
    if (isReplacement) {
      const validReplacement =
        (intent.kind === 'checkout' || intent.kind === 'direct_subscribe') &&
        intent.replacesSubscriptionId === current.subscriptionId;
      if (!validReplacement) return 'ignored';
    } else if (
      current.subscriptionId !== null &&
      intent.replacesSubscriptionId !== null &&
      intent.replacesSubscriptionId !== current.subscriptionId
    ) {
      return 'ignored';
    }

    let status = canonicalStatus(canonical.status);
    const sameBinding = current.subscriptionId === canonical.id;
    if (intent.kind === 'subscription_deleted') {
      status = 'canceled';
    } else if (sameBinding && current.status === 'canceled') {
      // A completed deletion is terminal for this binding. Neither invoices,
      // checkout replays, nor contradictory provider snapshots revive it.
      status = 'canceled';
    }

    const next: SubscriptionState = {
      subscriptionId: canonical.id,
      status,
      eventCreated: intent.eventCreated,
      eventId: intent.eventId,
      revision: current.revision + 1,
      // Canceled is terminal entitlement for every accepted binding state:
      // active, NULL/new, or legacy canceled/growth. Intent/canonical paid tier
      // is never persisted unless an authorized different binding is active.
      tier: status === 'canceled'
        ? 'basic'
        : canonical.tier ?? intent.tier ?? current.tier,
    };
    if (await store.commit(current, next)) return 'applied';
  }
  throw new SubscriptionPersistenceContendedError();
}
