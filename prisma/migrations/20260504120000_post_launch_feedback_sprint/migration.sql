-- CreateEnum
CREATE TYPE "application_ai_feedback_how_used" AS ENUM ('YES', 'ADJUSTED', 'NO', 'SKIPPED');

-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN "interview_pre_reminder_sent_at" TIMESTAMP(3),
ADD COLUMN "interview_post_follow_up_sent_at" TIMESTAMP(3);

CREATE INDEX "job_applications_next_interview_date_idx" ON "job_applications"("next_interview_date");

-- AlterTable
ALTER TABLE "placement_records" ADD COLUMN "onboarding_window_end" DATE,
ADD COLUMN "retention_decision" TEXT;

-- CreateTable
CREATE TABLE "application_ai_feedback" (
    "id" TEXT NOT NULL,
    "job_application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "how_used" "application_ai_feedback_how_used" NOT NULL,
    "primary_ai_tool_result_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_ai_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_ai_feedback_job_application_id_key" ON "application_ai_feedback"("job_application_id");

CREATE INDEX "application_ai_feedback_user_id_idx" ON "application_ai_feedback"("user_id");

ALTER TABLE "application_ai_feedback" ADD CONSTRAINT "application_ai_feedback_job_application_id_fkey" FOREIGN KEY ("job_application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_ai_feedback" ADD CONSTRAINT "application_ai_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_ai_feedback" ADD CONSTRAINT "application_ai_feedback_primary_ai_tool_result_id_fkey" FOREIGN KEY ("primary_ai_tool_result_id") REFERENCES "ai_tool_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "employer_hiring_intents" (
    "id" TEXT NOT NULL,
    "employer_id" TEXT NOT NULL,
    "program_slug" TEXT NOT NULL,
    "seat_count" INTEGER NOT NULL,
    "start_by" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "mou_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_hiring_intents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employer_hiring_intents_employer_id_idx" ON "employer_hiring_intents"("employer_id");

CREATE INDEX "employer_hiring_intents_program_slug_idx" ON "employer_hiring_intents"("program_slug");

ALTER TABLE "employer_hiring_intents" ADD CONSTRAINT "employer_hiring_intents_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "employer_screening_packs" (
    "id" TEXT NOT NULL,
    "program_slug" TEXT NOT NULL,
    "employer_label" TEXT NOT NULL,
    "pack_title" TEXT NOT NULL,
    "questions_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_screening_packs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employer_screening_packs_program_slug_idx" ON "employer_screening_packs"("program_slug");

CREATE INDEX "employer_screening_packs_is_active_idx" ON "employer_screening_packs"("is_active");
