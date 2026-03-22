CREATE TABLE "workflow_diagnostics" (
    "id" TEXT NOT NULL,
    "workflow" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "summary" TEXT NOT NULL,
    "provider" TEXT,
    "method" TEXT,
    "fallback_path" TEXT,
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_diagnostics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_diagnostics_workflow_created_at_idx" ON "workflow_diagnostics"("workflow", "created_at");
CREATE INDEX "workflow_diagnostics_status_created_at_idx" ON "workflow_diagnostics"("status", "created_at");
CREATE INDEX "workflow_diagnostics_actor_user_id_idx" ON "workflow_diagnostics"("actor_user_id");

ALTER TABLE "workflow_diagnostics"
ADD CONSTRAINT "workflow_diagnostics_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
