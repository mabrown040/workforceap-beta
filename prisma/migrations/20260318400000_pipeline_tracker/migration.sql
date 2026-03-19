-- Pipeline tracker: placement records and counselor notes

CREATE TABLE "placement_records" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL,
  "employer_name" TEXT NOT NULL,
  "job_title" TEXT NOT NULL,
  "start_date" DATE,
  "salary_offered" INTEGER,
  "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "placed_by" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "placement_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "placement_records_user_id_key" ON "placement_records"("user_id");
CREATE INDEX "placement_records_placed_at_idx" ON "placement_records"("placed_at");
ALTER TABLE "placement_records" ADD CONSTRAINT "placement_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "counselor_notes" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "member_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "counselor_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "counselor_notes_member_id_idx" ON "counselor_notes"("member_id");
CREATE INDEX "counselor_notes_author_id_idx" ON "counselor_notes"("author_id");
ALTER TABLE "counselor_notes" ADD CONSTRAINT "counselor_notes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "counselor_notes" ADD CONSTRAINT "counselor_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;