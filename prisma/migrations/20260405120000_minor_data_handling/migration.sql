-- Add minor (under 18) data handling fields to profiles table
-- For high school partnerships and COPPA/FERPA compliance

ALTER TABLE "profiles" ADD COLUMN "is_minor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "parent_guardian_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN "parent_guardian_email" TEXT;
ALTER TABLE "profiles" ADD COLUMN "parent_guardian_phone" TEXT;
ALTER TABLE "profiles" ADD COLUMN "parental_consent_given" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "parental_consent_date" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN "school_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN "school_district" TEXT;
ALTER TABLE "profiles" ADD COLUMN "grade_level" TEXT;
ALTER TABLE "profiles" ADD COLUMN "student_id" TEXT;
ALTER TABLE "profiles" ADD COLUMN "ferpa_consent_given" BOOLEAN NOT NULL DEFAULT false;

-- Add index for querying minors
CREATE INDEX "profiles_is_minor_idx" ON "profiles"("is_minor") WHERE "is_minor" = true;

-- Add index for parental consent tracking
CREATE INDEX "profiles_parental_consent_idx" ON "profiles"("parental_consent_given", "parental_consent_date") WHERE "is_minor" = true;
