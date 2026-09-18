-- Additive rolling-deployment CAS revisions. Existing rows begin at revision 0;
-- no subscription binding or status is inferred during migration.
ALTER TABLE "organizations"
  ADD COLUMN "stripe_subscription_revision" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "employers"
  ADD COLUMN "stripe_subscription_revision" INTEGER NOT NULL DEFAULT 0;
