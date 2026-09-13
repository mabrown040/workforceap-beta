import type { Prisma } from '@prisma/client';

type BillingPrisma = typeof import('@/lib/db/prisma').prisma;
import {
  reconcileSubscriptionState,
  type CanonicalSubscription,
  type SubscriptionIntent,
  type SubscriptionState,
} from './subscriptionState';

export type SubscriptionOwner = {
  organizationId?: string;
  employerId?: string;
  userId?: string;
  customerId?: string | null;
};

type BillingRow = {
  stripeSubscriptionId: string | null;
  subscriptionStatus?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripeSubscriptionEventAt: number | null;
  stripeSubscriptionEventId: string | null;
  stripeSubscriptionRevision: number;
  subscriptionTier?: string | null;
  tier?: string | null;
};

function stateFromRow(row: BillingRow, statusKey: 'subscriptionStatus' | 'stripeSubscriptionStatus'): SubscriptionState {
  return {
    subscriptionId: row.stripeSubscriptionId,
    status: row[statusKey] ?? null,
    eventCreated: row.stripeSubscriptionEventAt,
    eventId: row.stripeSubscriptionEventId,
    revision: row.stripeSubscriptionRevision,
    tier: row.tier ?? row.subscriptionTier ?? null,
  };
}

async function localOrganizationAuthority(
  tx: Prisma.TransactionClient,
  organizationId: string,
  subscriptionId: string,
  customerId: string,
): Promise<boolean> {
  const [subscriptions, employers] = await Promise.all([
    tx.employerSubscription.count({
      where: {
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        OR: [{ organizationId }, { user: { organizationId } }],
      },
    }),
    tx.employer.count({ where: { organizationId, stripeSubscriptionId: subscriptionId, stripeCustomerId: customerId } }),
  ]);
  return subscriptions + employers > 0;
}

async function localEmployerAuthority(
  tx: Prisma.TransactionClient,
  employerId: string,
  userId: string | undefined,
  subscriptionId: string,
  customerId: string,
): Promise<boolean> {
  const [employer, subscriptions] = await Promise.all([
    tx.employer.count({ where: { id: employerId, stripeSubscriptionId: subscriptionId, stripeCustomerId: customerId } }),
    userId
      ? tx.employerSubscription.count({ where: { userId, stripeSubscriptionId: subscriptionId, stripeCustomerId: customerId } })
      : Promise.resolve(0),
  ]);
  return employer + subscriptions > 0;
}

function customerMatches(expected: string | null | undefined, actual: string): boolean {
  return !expected || expected === actual;
}

export async function reconcileOrganizationSubscription(
  prisma: BillingPrisma,
  owner: SubscriptionOwner & { organizationId: string },
  intent: SubscriptionIntent,
  fetchCanonical: () => Promise<CanonicalSubscription>,
): Promise<'applied' | 'ignored'> {
  return reconcileSubscriptionState({
    read: async () => {
      const row = await prisma.organization.findUniqueOrThrow({
        where: { id: owner.organizationId },
        select: {
          stripeSubscriptionId: true,
          subscriptionStatus: true,
          subscriptionTier: true,
          stripeSubscriptionEventAt: true,
          stripeSubscriptionEventId: true,
          stripeSubscriptionRevision: true,
        },
      });
      return stateFromRow(row, 'subscriptionStatus');
    },
    authorize: async (state, canonical) => {
      if (canonical.organizationId && canonical.organizationId !== owner.organizationId) return { authorized: false };
      if (!customerMatches(owner.customerId, canonical.customerId)) return { authorized: false };
      if (state.subscriptionId === canonical.id) return { authorized: true };
      const providerCreatedForOwner =
        (intent.kind === 'checkout' || intent.kind === 'direct_subscribe') &&
        canonical.organizationId === owner.organizationId &&
        intent.replacesSubscriptionId === state.subscriptionId;
      if (providerCreatedForOwner) return { authorized: true };
      return {
        authorized: await localOrganizationAuthority(prisma, owner.organizationId, canonical.id, canonical.customerId),
      };
    },
    commit: async (expected, next) => {
      const result = await prisma.organization.updateMany({
        where: {
          id: owner.organizationId,
          stripeSubscriptionId: expected.subscriptionId,
          stripeSubscriptionRevision: expected.revision,
        },
        data: {
          stripeSubscriptionId: next.subscriptionId,
          subscriptionStatus: next.status ?? undefined,
          ...(next.tier ? { subscriptionTier: next.tier } : {}),
          stripeSubscriptionEventAt: next.eventCreated,
          stripeSubscriptionEventId: next.eventId,
          stripeSubscriptionRevision: { increment: 1 },
        },
      });
      return result.count === 1;
    },
  }, intent, fetchCanonical);
}

export async function reconcileEmployerSubscription(
  prisma: BillingPrisma,
  owner: SubscriptionOwner & { employerId: string },
  intent: SubscriptionIntent & { tier?: string },
  fetchCanonical: () => Promise<CanonicalSubscription>,
  mirror?: (tx: Prisma.TransactionClient, next: SubscriptionState) => Promise<void>,
): Promise<'applied' | 'ignored'> {
  return reconcileSubscriptionState({
    read: async () => {
      const row = await prisma.employer.findUniqueOrThrow({
        where: { id: owner.employerId },
        select: {
          stripeSubscriptionId: true,
          stripeSubscriptionStatus: true,
          tier: true,
          stripeSubscriptionEventAt: true,
          stripeSubscriptionEventId: true,
          stripeSubscriptionRevision: true,
        },
      });
      return stateFromRow(row, 'stripeSubscriptionStatus');
    },
    authorize: async (state, canonical) => {
      if (canonical.employerId && canonical.employerId !== owner.employerId) return { authorized: false };
      if (canonical.userId && owner.userId && canonical.userId !== owner.userId) return { authorized: false };
      if (!customerMatches(owner.customerId, canonical.customerId)) return { authorized: false };
      if (state.subscriptionId === canonical.id) return { authorized: true };
      const providerCreatedForOwner =
        (intent.kind === 'direct_subscribe' || intent.kind === 'checkout') &&
        canonical.employerId === owner.employerId &&
        (!owner.userId || canonical.userId === owner.userId) &&
        intent.replacesSubscriptionId === state.subscriptionId;
      if (providerCreatedForOwner) return { authorized: true };
      return {
        authorized: await localEmployerAuthority(
          prisma,
          owner.employerId,
          owner.userId,
          canonical.id,
          canonical.customerId,
        ),
      };
    },
    commit: async (expected, next) => prisma.$transaction(async (tx) => {
      const result = await tx.employer.updateMany({
        where: {
          id: owner.employerId,
          stripeSubscriptionId: expected.subscriptionId,
          stripeSubscriptionRevision: expected.revision,
        },
        data: {
          stripeSubscriptionId: next.subscriptionId,
          stripeSubscriptionStatus: next.status,
          stripeSubscriptionEventAt: next.eventCreated,
          stripeSubscriptionEventId: next.eventId,
          stripeSubscriptionRevision: { increment: 1 },
          ...(next.tier ? { tier: next.tier } : {}),
        },
      });
      if (result.count !== 1) return false;
      if (mirror) await mirror(tx, next);
      return true;
    }),
  }, intent, fetchCanonical);
}
