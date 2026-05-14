import { getStripe } from './client';

export function getStripeConnect() {
  return getStripe();
}

export async function createConnectAccount(partnerId: string, email: string) {
  const stripe = getStripeConnect();
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { partnerId },
  });
  return account;
}

export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
  const stripe = getStripeConnect();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return link;
}

export async function createPayoutTransfer(
  amountCents: number,
  destinationAccountId: string,
  metadata: Record<string, string> = {}
) {
  const stripe = getStripeConnect();
  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: 'usd',
    destination: destinationAccountId,
    metadata,
  });
  return transfer;
}

export async function retrieveConnectAccount(accountId: string) {
  const stripe = getStripeConnect();
  return stripe.accounts.retrieve(accountId);
}
