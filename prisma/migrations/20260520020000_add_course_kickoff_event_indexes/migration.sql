-- Sprint R3 (PLAN-2026-Q3.md) — Coursera completion engine.
--
-- Adds a covering partial index that accelerates the three idempotency
-- lookups introduced by this sprint:
--   1. `course_kickoff_email_sent`         (lib/coursera/courseKickoff.ts)
--   2. `course_accountability_sent`        (app/api/cron/course-accountability)
--   3. `counselor_followup_needed`         (app/api/cron/course-accountability)
--   4. `certification_celebration_sent`    (app/api/cron/milestone-celebration)
--
-- All four queries filter MemberEvent by (event_name, entity_type, entity_id),
-- so a single index on those columns covers every dedupe check. Scoped with
-- a WHERE filter so we don't bloat the index with the much larger
-- non-Sprint-R3 MemberEvent traffic.

CREATE INDEX IF NOT EXISTS member_events_r3_idempotency_idx
  ON member_events (event_name, entity_type, entity_id)
  WHERE event_name IN (
    'course_kickoff_email_sent',
    'course_accountability_sent',
    'counselor_followup_needed',
    'certification_celebration_sent'
  );
