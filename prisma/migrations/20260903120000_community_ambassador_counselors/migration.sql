-- Community Ambassadors sign in as counselors (9/2/26 ops change list, issue 10).
-- 1. New counselor affiliation value.
ALTER TYPE "counselor_affiliations" ADD VALUE IF NOT EXISTS 'community_ambassador';

-- 2. Counselor invites carry the affiliation the accept flow should create.
ALTER TABLE "invitations"
  ADD COLUMN IF NOT EXISTS "counselor_affiliation" "counselor_affiliations";
