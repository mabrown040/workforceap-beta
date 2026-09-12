import type { Prisma } from '@prisma/client';
import {
  applySubscriptionTransition,
  type SubscriptionState,
  type SubscriptionTransition,
} from './subscriptionState';


export class SubscriptionPersistenceContendedError extends Error {
  constructor() {
    super('Subscription state changed concurrently; retry the Stripe event');
    this.name = 'SubscriptionPersistenceContendedError';
  }
}

function requirePersisted(result: 'applied' | 'ignored' | 'contended'): 'applied' | 'ignored' {
  if (result === 'contended') throw new SubscriptionPersistenceContendedError();
  return result;
}

type BillingRow = {
  stripeSubscriptionId: string | null;
  subscriptionStatus?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripeSubscriptionEventAt: number | null;
  stripeSubscriptionEventId: string | null;
};

function stateFromRow(row: BillingRow, statusKey: 'subscriptionStatus' | 'stripeSubscriptionStatus'): SubscriptionState {
  return {
    subscriptionId: row.stripeSubscriptionId,
    status: row[statusKey] ?? null,
    eventCreated: row.stripeSubscriptionEventAt,
    eventId: row.stripeSubscriptionEventId,
  };
}


export async function organizationSubscriptionIsAuthoritative(
  tx: Prisma.TransactionClient,
  organizationId: string,
  subscriptionId: string,
): Promise<boolean> {
  const [subscriptionRows, employerRows] = await Promise.all([
    tx.employerSubscription.count({
      where: {
        stripeSubscriptionId: subscriptionId,
        OR: [
          { organizationId },
          { user: { organizationId } },
        ],
      },
    }),
    tx.employer.count({ where: { organizationId, stripeSubscriptionId: subscriptionId } }),
  ]);
  return subscriptionRows + employerRows > 0;
}

export async function userSubscriptionIsAuthoritative(
  tx: Prisma.TransactionClient,
  userId: string,
  subscriptionId: string,
): Promise<boolean> {
  return (await tx.employerSubscription.count({
    where: { userId, stripeSubscriptionId: subscriptionId },
  })) > 0;
}

export async function applyOrganizationSubscriptionTransition(
  tx: Prisma.TransactionClient,
  organizationId: string,
  transition: SubscriptionTransition,
): Promise<'applied' | 'ignored'> {
  return requirePersisted(await applySubscriptionTransition({
    read: async () => {
      const row = await tx.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: {
          stripeSubscriptionId: true,
          subscriptionStatus: true,
          stripeSubscriptionEventAt: true,
          stripeSubscriptionEventId: true,
        },
      });
      return stateFromRow(row, 'subscriptionStatus');
    },
    write: async (expected, next) => {
      const result = await tx.organization.updateMany({
        where: {
          id: organizationId,
          stripeSubscriptionId: expected.subscriptionId,
          subscriptionStatus: expected.status ?? undefined,
          stripeSubscriptionEventAt: expected.eventCreated,
          stripeSubscriptionEventId: expected.eventId,
        },
        data: {
          stripeSubscriptionId: next.subscriptionId,
          subscriptionStatus: next.status ?? undefined,
          stripeSubscriptionEventAt: next.eventCreated,
          stripeSubscriptionEventId: next.eventId,
        },
      });
      return result.count === 1;
    },
  }, transition));
}

export async function applyEmployerSubscriptionTransition(
  tx: Prisma.TransactionClient,
  employerId: string,
  transition: SubscriptionTransition & { tier?: string },
): Promise<'applied' | 'ignored'> {
  const result = await applySubscriptionTransition({
    read: async () => {
      const row = await tx.employer.findUniqueOrThrow({
        where: { id: employerId },
        select: {
          stripeSubscriptionId: true,
          stripeSubscriptionStatus: true,
          stripeSubscriptionEventAt: true,
          stripeSubscriptionEventId: true,
        },
      });
      return stateFromRow(row, 'stripeSubscriptionStatus');
    },
    write: async (expected, next) => {
      const updated = await tx.employer.updateMany({
        where: {
          id: employerId,
          stripeSubscriptionId: expected.subscriptionId,
          stripeSubscriptionStatus: expected.status,
          stripeSubscriptionEventAt: expected.eventCreated,
          stripeSubscriptionEventId: expected.eventId,
        },
        data: {
          stripeSubscriptionId: next.subscriptionId,
          stripeSubscriptionStatus: next.status,
          stripeSubscriptionEventAt: next.eventCreated,
          stripeSubscriptionEventId: next.eventId,
          ...(transition.tier ? { tier: transition.tier } : {}),
        },
      });
      return updated.count === 1;
    },
  }, transition);
  return requirePersisted(result);
}
