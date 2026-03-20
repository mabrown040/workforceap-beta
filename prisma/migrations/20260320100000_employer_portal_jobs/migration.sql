-- Employer Portal & Job Management
-- Uses TEXT for user references to match users.id (TEXT in this schema)
-- If migration previously failed, run: prisma migrate resolve --rolled-back 20260320100000_employer_portal_jobs
-- employers: company profiles linked to users
-- jobs: employer job postings with status workflow
-- job_posting_applications: students applying to posted jobs
-- ai_job_matches: cached AI student match suggestions

CREATE TABLE employers (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_description TEXT,
  logo_url TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employers_user_id ON employers(user_id);
CREATE INDEX idx_employers_status ON employers(status);

CREATE TYPE job_location_type AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE job_type_enum AS ENUM ('fulltime', 'parttime', 'contract');
CREATE TYPE job_status_enum AS ENUM ('draft', 'pending', 'approved', 'live', 'filled', 'closed');

CREATE TABLE jobs (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employer_id TEXT NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT,
  location_type job_location_type NOT NULL DEFAULT 'onsite',
  job_type job_type_enum NOT NULL DEFAULT 'fulltime',
  salary_min INTEGER,
  salary_max INTEGER,
  description TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  preferred_certifications TEXT[] DEFAULT '{}',
  suggested_programs TEXT[] DEFAULT '{}',
  status job_status_enum NOT NULL DEFAULT 'draft',
  applications_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

CREATE TYPE job_posting_application_status AS ENUM ('pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected');

CREATE TABLE job_posting_applications (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status job_posting_application_status NOT NULL DEFAULT 'pending',
  cover_letter TEXT,
  resume_url TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, student_id)
);

CREATE INDEX idx_job_posting_applications_job_id ON job_posting_applications(job_id);
CREATE INDEX idx_job_posting_applications_student_id ON job_posting_applications(student_id);

CREATE TYPE ai_job_match_status AS ENUM ('suggested', 'employer_notified', 'student_notified', 'rejected');

CREATE TABLE ai_job_matches (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[] DEFAULT '{}',
  status ai_job_match_status NOT NULL DEFAULT 'suggested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, student_id)
);

CREATE INDEX idx_ai_job_matches_job_id ON ai_job_matches(job_id);
CREATE INDEX idx_ai_job_matches_student_id ON ai_job_matches(student_id);
