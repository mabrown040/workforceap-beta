-- Sprint 2 compliance — P0: xapi_statements organization_id NOT NULL + backfill
--
-- Makes xapi_statements.organization_id non-nullable with backfill from the
-- matched user's organization. This is a hard blocker for FORCE RLS flip and
-- multi-tenant safety.
--
-- Backfill strategy: join via actor_email -> users.email to get the user's org.
-- For rows where actor_email doesn't match any user, fall back to the default
-- org (workforceap). In practice, all xAPI statements should have a resolvable
-- actor since they come from Coursera learners who are portal members.

-- 1. Add the column if it doesn't exist (idempotent for pre-prod environments)
ALTER TABLE IF EXISTS xapi_statements
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- 2. Backfill from matched users via actor_email
UPDATE xapi_statements xs
SET organization_id = u.organization_id
FROM users u
WHERE xs.actor_email IS NOT NULL
  AND LOWER(xs.actor_email) = LOWER(u.email)
  AND xs.organization_id IS NULL;

-- 3. Backfill remaining rows from actor_account_name -> users.id (enterprise SSO bridge)
UPDATE xapi_statements xs
SET organization_id = u.organization_id
FROM users u
WHERE xs.actor_account_name IS NOT NULL
  AND xs.actor_account_name = u.id
  AND xs.organization_id IS NULL;

-- 4. Any remaining NULLs get the default org so the NOT NULL constraint succeeds.
-- This should be a very small number (ideally zero) — unmatched webhook deliveries
-- or test data that never resolved to a user.
UPDATE xapi_statements
SET organization_id = (
  SELECT id FROM organizations WHERE slug = 'workforceap' LIMIT 1
)
WHERE organization_id IS NULL;

-- 5. Add index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS xapi_statements_organization_id_idx
  ON xapi_statements (organization_id);

-- 6. Make NOT NULL — this is the safety gate
ALTER TABLE xapi_statements
  ALTER COLUMN organization_id SET NOT NULL;
