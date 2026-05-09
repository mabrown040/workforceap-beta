-- Eligibility gate for self-service Coursera For Business enrollment.
-- See docs/COURSERA-ENROLLMENT-FLOW.md.
--
-- IMPORTANT: default is FALSE. The auto-approve paths set this in code
-- (counselor program-change approval, admin "Approve enrollment" toggle)
-- and write an audit_logs row each time. We do not blanket-default existing
-- members to true on this migration: a stale-flag would let any already-
-- enrolled user click "Enroll" and consume a paid Coursera seat without
-- the explicit funding-confirmed signal that gates the flag.

ALTER TABLE "users"
  ADD COLUMN "coursera_enrollment_approved" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "coursera_enrollment_approved_at" TIMESTAMP(3),
  ADD COLUMN "coursera_enrollment_approved_by" TEXT;

CREATE INDEX "users_coursera_enrollment_approved_idx"
  ON "users" ("coursera_enrollment_approved");
