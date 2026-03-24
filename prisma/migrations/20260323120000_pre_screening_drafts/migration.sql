-- CreateTable
CREATE TABLE "pre_screening_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "employment_status" TEXT,
    "primary_goal" TEXT,
    "weekly_hours" TEXT,
    "barrier" TEXT,
    "hear_about" TEXT,
    "hear_about_other" TEXT,
    "workforce_assistance" BOOLEAN,
    "phone" TEXT,
    "address" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_screening_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pre_screening_drafts_user_id_key" ON "pre_screening_drafts"("user_id");

-- AddForeignKey
ALTER TABLE "pre_screening_drafts" ADD CONSTRAINT "pre_screening_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
