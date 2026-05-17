-- Adds a two-tier partner taxonomy column to gate payout-related UI + APIs.
--
-- Values used today:
--   - 'community': default; partner does NOT receive payouts. Examples include
--     training centers, public agencies, philanthropic funders, and the long
--     tail of organizations who refer members but don't have a financial
--     relationship.
--   - 'referral':  partner is on the placement-payout track and may see
--     earnings UI, connect Stripe Connect, and receive a payout per verified
--     placement (currently $500, configured via PARTNER_PLACEMENT_PAYOUT_USD).
--
-- All existing rows default to 'community' so payouts cannot be triggered by
-- accident. An admin must explicitly upgrade a partner to 'referral' to
-- unlock the earnings flow.
--
-- IF NOT EXISTS guards keep this safe to re-apply locally / against branch
-- databases that may already carry the column from a prior attempt.

ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "partner_type" TEXT NOT NULL DEFAULT 'community';

-- Index keeps admin filters and the per-type payout endpoints fast; the
-- column has low cardinality (2-5 distinct values) so a simple B-tree is fine.
CREATE INDEX IF NOT EXISTS "partners_partner_type_idx"
  ON "partners" ("partner_type");
