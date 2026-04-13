-- CreateEnum
CREATE TYPE "career_experience_band" AS ENUM ('beginner', 'some_experience', 'experienced');

-- CreateEnum
CREATE TYPE "career_recommendation_type" AS ENUM ('primary', 'bridge', 'stretch');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "needs_computer_support_follow_up" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "career_recommendation_json" JSONB;

-- AlterTable
ALTER TABLE "applications" ADD COLUMN "recommended_onet_code" TEXT;
ALTER TABLE "applications" ADD COLUMN "recommended_career_title" TEXT;

-- CreateTable
CREATE TABLE "onet_occupations" (
    "onet_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "job_family" TEXT,
    "bright_outlook" BOOLEAN,
    "education_level" TEXT,
    "experience_level" TEXT,
    "training_level" TEXT,
    "salary_low" INTEGER,
    "salary_median" INTEGER,
    "salary_high" INTEGER,
    "outlook_summary" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "raw_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onet_occupations_pkey" PRIMARY KEY ("onet_code")
);

-- CreateTable
CREATE TABLE "onet_occupation_skills" (
    "id" TEXT NOT NULL,
    "onet_code" TEXT NOT NULL,
    "skill_name" TEXT NOT NULL,
    "importance" INTEGER,
    "level" INTEGER,

    CONSTRAINT "onet_occupation_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onet_occupation_tasks" (
    "id" TEXT NOT NULL,
    "onet_code" TEXT NOT NULL,
    "task_text" TEXT NOT NULL,
    "importance" INTEGER,

    CONSTRAINT "onet_occupation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onet_occupation_tech" (
    "id" TEXT NOT NULL,
    "onet_code" TEXT NOT NULL,
    "technology_name" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "onet_occupation_tech_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onet_related_occupations" (
    "id" TEXT NOT NULL,
    "onet_code" TEXT NOT NULL,
    "related_onet_code" TEXT NOT NULL,
    "relationship_type" TEXT,

    CONSTRAINT "onet_related_occupations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_program_mappings" (
    "id" TEXT NOT NULL,
    "onet_code" TEXT NOT NULL,
    "program_slug" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "experience_band" "career_experience_band" NOT NULL,
    "recommendation_type" "career_recommendation_type" NOT NULL,
    "why_recommended" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_program_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_quiz_rules" (
    "id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "input_signal" JSONB NOT NULL,
    "boost_onet_code" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "reason_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_quiz_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "career_quiz_rules_rule_key_key" ON "career_quiz_rules"("rule_key");

-- CreateIndex
CREATE INDEX "onet_occupation_skills_onet_code_idx" ON "onet_occupation_skills"("onet_code");

-- CreateIndex
CREATE INDEX "onet_occupation_tasks_onet_code_idx" ON "onet_occupation_tasks"("onet_code");

-- CreateIndex
CREATE INDEX "onet_occupation_tech_onet_code_idx" ON "onet_occupation_tech"("onet_code");

-- CreateIndex
CREATE INDEX "onet_related_occupations_onet_code_idx" ON "onet_related_occupations"("onet_code");

-- CreateIndex
CREATE INDEX "onet_related_occupations_related_onet_code_idx" ON "onet_related_occupations"("related_onet_code");

-- CreateIndex
CREATE INDEX "career_program_mappings_onet_code_idx" ON "career_program_mappings"("onet_code");

-- CreateIndex
CREATE INDEX "career_program_mappings_program_slug_idx" ON "career_program_mappings"("program_slug");

-- CreateIndex
CREATE INDEX "career_program_mappings_is_active_idx" ON "career_program_mappings"("is_active");

-- AddForeignKey
ALTER TABLE "onet_occupation_skills" ADD CONSTRAINT "onet_occupation_skills_onet_code_fkey" FOREIGN KEY ("onet_code") REFERENCES "onet_occupations"("onet_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onet_occupation_tasks" ADD CONSTRAINT "onet_occupation_tasks_onet_code_fkey" FOREIGN KEY ("onet_code") REFERENCES "onet_occupations"("onet_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onet_occupation_tech" ADD CONSTRAINT "onet_occupation_tech_onet_code_fkey" FOREIGN KEY ("onet_code") REFERENCES "onet_occupations"("onet_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onet_related_occupations" ADD CONSTRAINT "onet_related_occupations_onet_code_fkey" FOREIGN KEY ("onet_code") REFERENCES "onet_occupations"("onet_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onet_related_occupations" ADD CONSTRAINT "onet_related_occupations_related_onet_code_fkey" FOREIGN KEY ("related_onet_code") REFERENCES "onet_occupations"("onet_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_program_mappings" ADD CONSTRAINT "career_program_mappings_onet_code_fkey" FOREIGN KEY ("onet_code") REFERENCES "onet_occupations"("onet_code") ON DELETE CASCADE ON UPDATE CASCADE;
