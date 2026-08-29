-- Make raw Coursera idempotency keys tenant-local.
--
-- This migration intentionally does not assign historical NULL-organization
-- rows: an email address alone is not tenant evidence. Runtime B4B/CSV writers
-- may adopt an exact matching legacy identity only while holding the global
-- raw-email transaction lock and only after the authenticated organization and
-- any linked users pass tenant validation. Reviewed admin attachment uses the
-- same lock and ownership checks.
--
-- Zero-downtime note: the old global indexes intentionally remain in place in
-- this additive migration so the currently serving deployment keeps its
-- conflict target while Vercel builds the new release. A later, separately
-- deployed cleanup migration may drop them after every writer uses the
-- tenant-local key. Until then, non-NULL foreign-organization identities fail
-- closed instead of being cross-linked.

CREATE UNIQUE INDEX IF NOT EXISTS "coursera_course_progress_org_email_course_exact_key"
  ON "coursera_course_progress" (
    "organization_id",
    "external_email",
    "coursera_course_id"
  );

CREATE UNIQUE INDEX IF NOT EXISTS "coursera_course_progress_org_email_course_key"
  ON "coursera_course_progress" (
    "organization_id",
    LOWER("external_email"),
    "coursera_course_id"
  )
  WHERE "organization_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "coursera_badge_progress_org_email_badge_exact_key"
  ON "coursera_badge_progress" (
    "organization_id",
    "external_email",
    "badge_slug"
  );

CREATE UNIQUE INDEX IF NOT EXISTS "coursera_badge_progress_org_email_badge_key"
  ON "coursera_badge_progress" (
    "organization_id",
    LOWER("external_email"),
    "badge_slug"
  )
  WHERE "organization_id" IS NOT NULL;
