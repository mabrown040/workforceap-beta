-- Add indexes for lifecycle query performance.
-- These columns are queried by cron jobs (inactive-nudge, weekly-recap,
-- partner-outcome-digest) and admin lifecycle audit endpoints.

-- User.enrolledProgram: used in WHERE enrolledProgram IS NOT NULL filters
CREATE INDEX IF NOT EXISTS "users_enrolled_program_idx" ON "users"("enrolled_program");

-- CourseEnrollment.programSlug: used in enrollment lookups by program
CREATE INDEX IF NOT EXISTS "course_enrollments_program_slug_idx" ON "course_enrollments"("program_slug");
