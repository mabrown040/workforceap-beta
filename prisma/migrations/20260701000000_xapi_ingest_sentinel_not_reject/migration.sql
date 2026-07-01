-- Fix a regression introduced in 20260616070000_recovery_fix_xapi_org_null_v2:
-- that migration's ingest trigger RAISE EXCEPTIONs when organization_id can't
-- be resolved, permanently rejecting the insert (the row never exists, so it
-- can never be replayed once the identity mapping is fixed). The prior
-- version of this trigger (20260616060000) correctly fell back to a
-- 'unresolved-<id prefix>' sentinel instead of rejecting, matching the
-- backfill's own sentinel convention. This restores that behavior while
-- keeping the corrected resolution logic (actor_email OR actor_account_name
-- lookup against coursera_identity_mappings) from the v2 recovery migration.

CREATE OR REPLACE FUNCTION xapi_statement_ingest_org_check()
RETURNS TRIGGER AS $$
DECLARE
  resolved_org_id TEXT;
BEGIN
  -- Allow if organization_id is already set (e.g., by the ingest pipeline)
  IF NEW.organization_id IS NOT NULL AND NEW.organization_id NOT LIKE 'unresolved-%' THEN
    RETURN NEW;
  END IF;

  -- Resolve from coursera_identity_mappings
  SELECT u.organization_id INTO resolved_org_id
  FROM coursera_identity_mappings cim
  JOIN users u ON u.id = cim.user_id
  WHERE (
    (NEW.actor_email IS NOT NULL AND LOWER(NEW.actor_email) = LOWER(cim.coursera_email))
    OR
    (NEW.actor_account_name IS NOT NULL AND NEW.actor_account_name = cim.actor_identifier)
  )
  LIMIT 1;

  -- Fallback: direct user lookup
  IF resolved_org_id IS NULL AND NEW.actor_email IS NOT NULL THEN
    SELECT u.organization_id INTO resolved_org_id
    FROM users u
    WHERE LOWER(u.email) = LOWER(NEW.actor_email)
    LIMIT 1;
  END IF;

  IF resolved_org_id IS NOT NULL THEN
    NEW.organization_id := resolved_org_id;
    RETURN NEW;
  END IF;

  -- Set sentinel instead of rejecting — keeps the row so it can be replayed
  -- (see lib/coursera/replayPendingXapi.ts) once the identity mapping exists.
  -- The admin health dashboard flags 'unresolved-%' organization_id values.
  NEW.organization_id := 'unresolved-' || LEFT(NEW.id::text, 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
