-- Rolling compatibility: new cursor columns stay nullable. Existing organizations are
-- intentionally not backfilled from status alone; the handler binds only after a current
-- Stripe subscription retrieval is corroborated by EmployerSubscription/Employer state.
-- Old application versions ignore these additive columns during rollout.
-- Persist the Stripe subscription that is authoritative for organization billing
-- and the last applied event so duplicate/out-of-order deliveries cannot regress it.
ALTER TABLE "organizations"
  ADD COLUMN "stripe_subscription_id" TEXT,
  ADD COLUMN "stripe_subscription_event_at" INTEGER,
  ADD COLUMN "stripe_subscription_event_id" TEXT;

CREATE INDEX "organizations_stripe_subscription_id_idx"
  ON "organizations"("stripe_subscription_id");

-- The alternate employer webhook uses the same durable event cursor.
ALTER TABLE "employers"
  ADD COLUMN "stripe_subscription_event_id" TEXT;
