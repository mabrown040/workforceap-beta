import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const migration = readFileSync(
  path.resolve(__dirname, '../../prisma/migrations/20260912173000_organization_stripe_event_ordering/migration.sql'),
  'utf8',
);
const schema = readFileSync(path.resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');

describe('organization Stripe event-ordering rolling migration', () => {
  it('adds nullable binding and cursor columns without guessing a backfill', () => {
    expect(migration).toContain('ADD COLUMN "stripe_subscription_id" TEXT');
    expect(migration).toContain('ADD COLUMN "stripe_subscription_event_at" INTEGER');
    expect(migration).toContain('ADD COLUMN "stripe_subscription_event_id" TEXT');
    expect(migration).not.toMatch(/UPDATE\s+"organizations"/i);
    expect(migration).not.toMatch(/NOT NULL|DEFAULT/i);
  });

  it('keeps Prisma binding and cursor fields nullable during rolling deployment', () => {
    expect(schema).toContain('stripeSubscriptionId     String?');
    expect(schema).toContain('stripeSubscriptionEventAt   Int?');
    expect(schema).toContain('stripeSubscriptionEventId   String?');
  });
});
