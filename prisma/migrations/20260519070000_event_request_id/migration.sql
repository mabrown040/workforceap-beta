-- Sprint P2 (observability uplift): tag every MemberEvent row with the
-- request_id that produced it so logs / Sentry events / DB rows can be
-- joined for forensics. Nullable column to keep the migration online-safe
-- (historical rows, cron-fired events, and tests will be NULL).

ALTER TABLE "member_events" ADD COLUMN "request_id" TEXT NULL;

-- Index used by `/api/health/slo` and any future incident-response query
-- that filters events by a single failing request.
CREATE INDEX "member_events_request_id_idx" ON "member_events" ("request_id");
