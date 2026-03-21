-- Fix job create failure: ensure enum types exist in production.
-- Error 42704 "type public.JobLocationType does not exist" occurs when:
-- - employer_portal_jobs migration was marked APPLIED but never ran, or
-- - schema drift (Prisma expected PascalCase, migration created snake_case).
-- This migration is idempotent: creates types only if missing.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_location_type') THEN
    CREATE TYPE job_location_type AS ENUM ('remote', 'hybrid', 'onsite');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type_enum') THEN
    CREATE TYPE job_type_enum AS ENUM ('fulltime', 'parttime', 'contract');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status_enum') THEN
    CREATE TYPE job_status_enum AS ENUM ('draft', 'pending', 'approved', 'live', 'filled', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_posting_application_status') THEN
    CREATE TYPE job_posting_application_status AS ENUM ('pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_job_match_status') THEN
    CREATE TYPE ai_job_match_status AS ENUM ('suggested', 'employer_notified', 'student_notified', 'rejected');
  END IF;
END $$;
