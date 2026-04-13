
-- MentorSpecialty
CREATE TABLE IF NOT EXISTS mentor_specialties (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  mentor_id  TEXT NOT NULL,
  name       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mentor_specialties_mentor_id ON mentor_specialties(mentor_id);

-- Mentor
CREATE TABLE IF NOT EXISTS mentors (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             TEXT NOT NULL UNIQUE,
  full_name           TEXT NOT NULL,
  title               TEXT NOT NULL,
  company             TEXT NOT NULL,
  industry            TEXT NOT NULL,
  bio                 TEXT NOT NULL,
  linkedin_url        TEXT,
  available_hours     INT NOT NULL DEFAULT 2,
  total_hours_donated FLOAT NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MentorSessionStatus enum
DO $$ BEGIN
  CREATE TYPE "MentorSessionStatus" AS ENUM ('PENDING','CONFIRMED','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- MentorSession
CREATE TABLE IF NOT EXISTS mentor_sessions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  mentor_id       TEXT NOT NULL,
  member_id       TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INT NOT NULL DEFAULT 30,
  status          "MentorSessionStatus" NOT NULL DEFAULT 'PENDING',
  topic           TEXT,
  notes           TEXT,
  member_feedback TEXT,
  hours_logged    FLOAT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor_id ON mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_member_id ON mentor_sessions(member_id);

-- Foreign keys
ALTER TABLE mentor_specialties
  ADD CONSTRAINT fk_mentor_specialties_mentor FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE;

ALTER TABLE mentors
  ADD CONSTRAINT fk_mentors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE mentor_sessions
  ADD CONSTRAINT fk_mentor_sessions_mentor FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_mentor_sessions_member FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE;

-- updated_at trigger for mentors
CREATE OR REPLACE FUNCTION update_mentors_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mentors_updated_at ON mentors;
CREATE TRIGGER trg_mentors_updated_at
  BEFORE UPDATE ON mentors
  FOR EACH ROW EXECUTE FUNCTION update_mentors_updated_at();
;
