export type SubscriptionTransitionKind =
  | 'checkout'
  | 'subscription_reconciled'
  | 'subscription_deleted'
  | 'invoice_succeeded'
  | 'invoice_failed';

export type SubscriptionState = {
  subscriptionId: string | null;
  status: string | null;
  eventCreated: number | null;
  eventId: string | null;
};

export type SubscriptionTransition = {
  subscriptionId: string;
  status: string;
  eventCreated: number;
  eventId: string;
  kind: SubscriptionTransitionKind;
  bindingAuthorized: boolean;
  replacesSubscriptionId: string | null;
};

export type SubscriptionStateStore = {
  read(): Promise<SubscriptionState>;
  write(expected: SubscriptionState, next: SubscriptionState): Promise<boolean>;
};

function nextState(current: SubscriptionState, transition: SubscriptionTransition): SubscriptionState | null {
  if (current.eventId === transition.eventId) return null;

  if (!current.subscriptionId) {
    if (!transition.bindingAuthorized) return null;
  } else if (current.subscriptionId !== transition.subscriptionId) {
    const legitimateReplacement =
      transition.kind === 'checkout' &&
      transition.bindingAuthorized &&
      transition.replacesSubscriptionId === current.subscriptionId;
    if (!legitimateReplacement) return null;
  }

  if (current.subscriptionId === transition.subscriptionId && current.status === 'canceled') {
    // A terminal subscription can only be corrected by a fresh authoritative
    // subscription retrieval, never by an invoice or checkout replay.
    if (transition.kind !== 'subscription_reconciled') return null;
  }

  if (current.eventCreated != null) {
    if (transition.eventCreated < current.eventCreated) return null;
    if (transition.eventCreated === current.eventCreated) {
      if (current.status === transition.status) return null;
      // Deletion is terminal for this binding regardless of delivery order.
      if (current.status === 'canceled') return null;
      if (transition.kind !== 'subscription_deleted' && transition.kind !== 'subscription_reconciled') {
        return null;
      }
    }
  }

  return {
    subscriptionId: transition.subscriptionId,
    status: transition.status,
    eventCreated: transition.eventCreated,
    eventId: transition.eventId,
  };
}

export async function applySubscriptionTransition(
  store: SubscriptionStateStore,
  transition: SubscriptionTransition,
): Promise<'applied' | 'ignored' | 'contended'> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await store.read();
    const next = nextState(current, transition);
    if (!next) return 'ignored';
    if (await store.write(current, next)) return 'applied';
  }
  return 'contended';
}
