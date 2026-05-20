-- Sprint R2 (2026-Q3) — AI Coach memory / stateful tool runs.
-- Adds a self-referential parent link to ai_tool_results so a regenerated
-- run can point back to the prior one. Backfill is NULL — historical rows
-- have no lineage.

ALTER TABLE "ai_tool_results"
  ADD COLUMN "parent_tool_result_id" TEXT;

ALTER TABLE "ai_tool_results"
  ADD CONSTRAINT "ai_tool_results_parent_tool_result_id_fkey"
  FOREIGN KEY ("parent_tool_result_id")
  REFERENCES "ai_tool_results"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "ai_tool_results_parent_tool_result_id_idx"
  ON "ai_tool_results"("parent_tool_result_id");
