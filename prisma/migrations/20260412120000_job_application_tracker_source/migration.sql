-- Add source and interview scheduling support to member job applications

DO $$
BEGIN
  CREATE TYPE "JobApplicationSource" AS ENUM ('INDEED', 'LINKEDIN', 'DIRECT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "job_applications"
  ADD COLUMN IF NOT EXISTS "source" "JobApplicationSource" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS "next_interview_date" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "job_applications_source_idx" ON "job_applications"("source");
