-- AddPartnerStatusApproval
ALTER TABLE "partners" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending_approval';
ALTER TABLE "partners" ADD COLUMN "approval_notes" TEXT;
ALTER TABLE "partners" ADD COLUMN "approved_at" TIMESTAMP(3);
ALTER TABLE "partners" ADD COLUMN "approved_by_id" TEXT;
ALTER TABLE "partners" ADD COLUMN "rejected_at" TIMESTAMP(3);
ALTER TABLE "partners" ADD COLUMN "rejected_by_id" TEXT;
ALTER TABLE "partners" ADD COLUMN "rejection_notes" TEXT;

-- Backfill existing partners to active (they were manually created before self-service)
UPDATE "partners" SET "status" = 'active' WHERE "status" = 'pending_approval';

-- Index for pending partners query
CREATE INDEX "partners_status_idx" ON "partners"("status");
