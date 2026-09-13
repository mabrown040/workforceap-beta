import type Stripe from 'stripe';
import type { CanonicalSubscription } from './subscriptionState';

export function stripeObjectId(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === 'string') return value || null;
  return value?.id || null;
}

export function canonicalSubscriptionSnapshot(subscription: Stripe.Subscription): CanonicalSubscription {
  const customerId = stripeObjectId(subscription.customer);
  if (!customerId) throw new Error('Stripe subscription has no customer identity');
  return {
    id: subscription.id,
    customerId,
    status: subscription.status,
    organizationId: subscription.metadata?.organizationId,
    employerId: subscription.metadata?.employerId,
    userId: subscription.metadata?.userId,
    tier: subscription.metadata?.tier,
  };
}
