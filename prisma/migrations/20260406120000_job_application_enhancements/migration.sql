-- Add profile/resume sharing consent and interview scheduling to job applications

ALTER TABLE "job_posting_applications" ADD COLUMN "resume_path" TEXT;
ALTER TABLE "job_posting_applications" ADD COLUMN "profile_shared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "job_posting_applications" ADD COLUMN "interview_scheduled_at" TIMESTAMP(3);
ALTER TABLE "job_posting_applications" ADD COLUMN "interview_notes" TEXT;

-- Add index for status queries (employer filtering by status)
CREATE INDEX "job_posting_applications_status_idx" ON "job_posting_applications"("status");

-- Update existing applications to have profile_shared = true (backwards compatibility)
UPDATE "job_posting_applications" SET "profile_shared" = true WHERE "profile_shared" = false;
