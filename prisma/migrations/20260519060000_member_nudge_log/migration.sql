-- CreateTable
CREATE TABLE "member_nudge_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reasons" JSONB,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_nudge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_nudge_logs_user_id_kind_sent_at_idx" ON "member_nudge_logs"("user_id", "kind", "sent_at");

-- CreateIndex
CREATE INDEX "member_nudge_logs_user_id_tier_sent_at_idx" ON "member_nudge_logs"("user_id", "tier", "sent_at");

-- CreateIndex
CREATE INDEX "member_nudge_logs_sent_at_idx" ON "member_nudge_logs"("sent_at");

-- AddForeignKey
ALTER TABLE "member_nudge_logs" ADD CONSTRAINT "member_nudge_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
