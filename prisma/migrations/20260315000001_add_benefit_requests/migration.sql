-- CreateEnum
CREATE TYPE "BenefitRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "benefit_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "status" "BenefitRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "benefit_requests_user_id_benefit_key" ON "benefit_requests"("user_id", "benefit");

-- CreateIndex
CREATE INDEX "benefit_requests_user_id_idx" ON "benefit_requests"("user_id");

-- CreateIndex
CREATE INDEX "benefit_requests_status_idx" ON "benefit_requests"("status");

-- AddForeignKey
ALTER TABLE "benefit_requests" ADD CONSTRAINT "benefit_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
