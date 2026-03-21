-- CreateTable
CREATE TABLE "partner_users" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_users_user_id_key" ON "partner_users"("user_id");

-- CreateIndex
CREATE INDEX "partner_users_partner_id_idx" ON "partner_users"("partner_id");

-- AddForeignKey
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable - Add notification preference columns to partners
ALTER TABLE "partners" ADD COLUMN "notify_on_enrollment" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "partners" ADD COLUMN "notify_on_course" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "partners" ADD COLUMN "notify_on_certified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "partners" ADD COLUMN "notify_on_placed" BOOLEAN NOT NULL DEFAULT true;
