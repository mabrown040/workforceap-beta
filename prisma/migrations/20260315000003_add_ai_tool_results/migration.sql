-- CreateEnum
CREATE TYPE "AIToolType" AS ENUM ('resume_rewriter', 'cover_letter', 'interview_practice', 'linkedin_headline');

-- CreateTable
CREATE TABLE "ai_tool_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_type" "AIToolType" NOT NULL,
    "input_summary" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_tool_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_tool_results_user_id_idx" ON "ai_tool_results"("user_id");

-- CreateIndex
CREATE INDEX "ai_tool_results_user_id_tool_type_idx" ON "ai_tool_results"("user_id", "tool_type");

-- AddForeignKey
ALTER TABLE "ai_tool_results" ADD CONSTRAINT "ai_tool_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
