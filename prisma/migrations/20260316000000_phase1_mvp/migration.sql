-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "TrainingAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_ATTENTION', 'REJECTED');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "goal_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_metric_type" TEXT,
    "target_metric_value" INTEGER,
    "current_metric_value" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "target_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "downloaded_at" TIMESTAMP(3),
    "saved_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "completion_status" TEXT NOT NULL DEFAULT 'not_started',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "source_page" TEXT,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_recaps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "week_end_date" TIMESTAMP(3) NOT NULL,
    "recap_json" JSONB NOT NULL,
    "readiness_score_snapshot" INTEGER,
    "goals_snapshot_json" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),
    "emailed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_recaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pathway_step_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pathway_id" TEXT NOT NULL,
    "step_index" INTEGER NOT NULL,
    "step_title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pathway_step_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_access_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "status" "TrainingAccessStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "trigger_event" TEXT NOT NULL,
    "trigger_conditions_json" JSONB,
    "action_type" TEXT NOT NULL,
    "action_payload_json" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");
CREATE INDEX "goals_status_idx" ON "goals"("status");

CREATE INDEX "resource_progress_user_id_idx" ON "resource_progress"("user_id");
CREATE INDEX "resource_progress_resource_id_idx" ON "resource_progress"("resource_id");
CREATE UNIQUE INDEX "resource_progress_user_id_resource_id_key" ON "resource_progress"("user_id", "resource_id");

CREATE INDEX "member_events_user_id_idx" ON "member_events"("user_id");
CREATE INDEX "member_events_event_name_idx" ON "member_events"("event_name");
CREATE INDEX "member_events_created_at_idx" ON "member_events"("created_at");

CREATE INDEX "weekly_recaps_user_id_idx" ON "weekly_recaps"("user_id");
CREATE UNIQUE INDEX "weekly_recaps_user_id_week_start_date_key" ON "weekly_recaps"("user_id", "week_start_date");

CREATE INDEX "pathway_step_progress_user_id_idx" ON "pathway_step_progress"("user_id");
CREATE UNIQUE INDEX "pathway_step_progress_user_id_pathway_id_step_index_key" ON "pathway_step_progress"("user_id", "pathway_id", "step_index");

CREATE INDEX "training_access_requests_user_id_idx" ON "training_access_requests"("user_id");
CREATE INDEX "training_access_requests_status_idx" ON "training_access_requests"("status");
CREATE UNIQUE INDEX "training_access_requests_user_id_provider_key_key" ON "training_access_requests"("user_id", "provider_key");

CREATE UNIQUE INDEX "automation_rules_rule_key_key" ON "automation_rules"("rule_key");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_events" ADD CONSTRAINT "member_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_recaps" ADD CONSTRAINT "weekly_recaps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pathway_step_progress" ADD CONSTRAINT "pathway_step_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_access_requests" ADD CONSTRAINT "training_access_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
