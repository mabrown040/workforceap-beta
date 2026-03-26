-- Add age requirements and youth-appropriate flags to jobs
-- For filtering jobs shown to minors and high school students

ALTER TABLE "jobs" ADD COLUMN "minimum_age" INTEGER;
ALTER TABLE "jobs" ADD COLUMN "youth_appropriate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "jobs" ADD COLUMN "requires_work_permit" BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering youth-appropriate jobs
CREATE INDEX "jobs_youth_appropriate_idx" ON "jobs"("youth_appropriate") WHERE "youth_appropriate" = true;

-- Index for minimum age queries
CREATE INDEX "jobs_minimum_age_idx" ON "jobs"("minimum_age") WHERE "minimum_age" IS NOT NULL;

-- Mark existing jobs as adult-only by default (safe approach)
-- Employers can explicitly mark jobs as youth-appropriate
UPDATE "jobs" SET "minimum_age" = 18 WHERE "minimum_age" IS NULL AND "status" = 'live';

COMMENT ON COLUMN "jobs"."minimum_age" IS 'Minimum age requirement (e.g. 16, 18, 21). NULL means no age restriction.';
COMMENT ON COLUMN "jobs"."youth_appropriate" IS 'Job is appropriate and safe for high school students (ages 14-17). Requires admin approval.';
COMMENT ON COLUMN "jobs"."requires_work_permit" IS 'Job requires work permit for minors (under 18). Varies by state law.';
