-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MentorSessionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable mentors
CREATE TABLE IF NOT EXISTS "mentors" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "bio" TEXT NOT NULL,
  "linkedin_url" TEXT,
  "available_hours" INTEGER NOT NULL DEFAULT 2,
  "total_hours_donated" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentors_pkey" PRIMARY KEY ("id")
);

-- CreateTable mentor_sessions
CREATE TABLE IF NOT EXISTS "mentor_sessions" (
  "id" TEXT NOT NULL,
  "mentor_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "duration_min" INTEGER NOT NULL DEFAULT 30,
  "status" "MentorSessionStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "hours_logged" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mentor_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "mentors_user_id_key" ON "mentors"("user_id");

DO $$ BEGIN
  ALTER TABLE "mentors" ADD CONSTRAINT "mentors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "mentor_sessions" ADD CONSTRAINT "mentor_sessions_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "mentor_sessions" ADD CONSTRAINT "mentor_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
