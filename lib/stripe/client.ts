import Stripe from 'stripe';

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key, {
    typescript: true,
  });
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

export function getStripeConnectWebhookSecret(): string {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

export const EMPLOYER_TIERS = {
  basic: {
    priceId: process.env.STRIPE_BASIC_PRICE_ID || '',
    name: 'Basic',
    amount: 19900, // $199.00 in cents
    jobLimit: 1,
    features: ['Standard listing'],
  },
  growth: {
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || '',
    name: 'Growth',
    amount: 49900,
    jobLimit: 5,
    features: ['Featured listings', 'Analytics dashboard'],
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    name: 'Enterprise',
    amount: 99900,
    jobLimit: Infinity,
    features: ['Priority placement', 'Dedicated support'],
  },
} as const;

export type EmployerTierKey = keyof typeof EMPLOYER_TIERS;

export function isValidTier(tier: string): tier is EmployerTierKey {
  return tier in EMPLOYER_TIERS;
}
