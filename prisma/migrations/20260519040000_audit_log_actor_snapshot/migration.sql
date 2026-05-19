-- PLAN-2026-Q3 §P4: snapshot actor email + role on the audit row at
-- write time so the trail survives user deletion. The existing
-- `actor_user_id` FK uses ON DELETE SET NULL — without these columns,
-- attribution is lost when a user is purged. WIOA / 20 CFR 677 audits
-- require a continuous 3-year trail.

ALTER TABLE "audit_logs"
  ADD COLUMN "actor_email_snapshot" TEXT NULL,
  ADD COLUMN "actor_role_snapshot"  TEXT NULL;

-- Best-effort backfill for existing rows whose actor user still exists.
-- Picks the user's first role by name; deterministic enough for an
-- audit attribution column (the live `actor` relation remains the
-- source of truth while the user is alive).
UPDATE "audit_logs" al
SET "actor_email_snapshot" = u."email"
FROM "users" u
WHERE u."id" = al."actor_user_id"
  AND al."actor_email_snapshot" IS NULL;

UPDATE "audit_logs" al
SET "actor_role_snapshot" = sub.role_name
FROM (
  SELECT ur."user_id" AS user_id, MIN(r."name") AS role_name
  FROM "user_roles" ur
  JOIN "roles" r ON r."id" = ur."role_id"
  GROUP BY ur."user_id"
) sub
WHERE sub.user_id = al."actor_user_id"
  AND al."actor_role_snapshot" IS NULL;
