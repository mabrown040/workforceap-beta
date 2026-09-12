-- Placement survey rows must exist before email provider acceptance because
-- their ids are signed into survey URLs. Represent that pre-acceptance state
-- as NULL rather than the historical Unix-epoch sentinel.
UPDATE "placement_surveys"
SET "sent_at" = NULL
WHERE "sent_at" = TIMESTAMPTZ '1970-01-01 00:00:00+00';

ALTER TABLE "placement_surveys"
ALTER COLUMN "sent_at" DROP NOT NULL,
ALTER COLUMN "sent_at" DROP DEFAULT;

ALTER TABLE "placement_surveys"
ADD COLUMN "token_expires_at" TIMESTAMPTZ,
ADD COLUMN "delivery_attempt" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "accepted_attempt" INTEGER NOT NULL DEFAULT 0;

UPDATE "placement_surveys"
SET "token_expires_at" = COALESCE("sent_at", now()) + INTERVAL '60 days',
    "accepted_attempt" = CASE WHEN "sent_at" IS NULL THEN 0 ELSE 1 END;

ALTER TABLE "placement_surveys"
ALTER COLUMN "token_expires_at" SET NOT NULL;

ALTER TABLE "placement_surveys"
ADD CONSTRAINT "placement_surveys_attempt_order_check"
CHECK ("delivery_attempt" >= 1 AND "accepted_attempt" >= 0 AND "accepted_attempt" <= "delivery_attempt");

-- Manual rollback (only after proving no NULL rows remain):
-- ALTER TABLE "placement_surveys" ALTER COLUMN "sent_at" SET DEFAULT now();
-- ALTER TABLE "placement_surveys" ALTER COLUMN "sent_at" SET NOT NULL;
-- ALTER TABLE "placement_surveys" DROP CONSTRAINT "placement_surveys_attempt_order_check";
-- ALTER TABLE "placement_surveys" DROP COLUMN "accepted_attempt";
-- ALTER TABLE "placement_surveys" DROP COLUMN "delivery_attempt";
-- ALTER TABLE "placement_surveys" DROP COLUMN "token_expires_at";
