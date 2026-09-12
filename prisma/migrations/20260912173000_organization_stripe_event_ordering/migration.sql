-- Persist the Stripe subscription that is authoritative for organization billing
-- and the last applied event so duplicate/out-of-order deliveries cannot regress it.
ALTER TABLE "organizations"
  ADD COLUMN "stripe_subscription_id" TEXT,
  ADD COLUMN "stripe_subscription_event_at" INTEGER,
  ADD COLUMN "stripe_subscription_event_id" TEXT;

CREATE INDEX "organizations_stripe_subscription_id_idx"
  ON "organizations"("stripe_subscription_id");
