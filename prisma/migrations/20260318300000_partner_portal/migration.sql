-- Partner Portal: partners, counselors, assignments, referrals

CREATE TABLE "partners" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logo_url" TEXT,
  "contact_name" TEXT,
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partners_slug_key" ON "partners"("slug");

CREATE TABLE "counselors" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partner_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "counselors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "counselors_user_id_key" ON "counselors"("user_id");
CREATE INDEX "counselors_partner_id_idx" ON "counselors"("partner_id");

CREATE TABLE "counselor_assignments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "counselor_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  CONSTRAINT "counselor_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "counselor_assignments_counselor_id_member_id_key" ON "counselor_assignments"("counselor_id", "member_id");
CREATE INDEX "counselor_assignments_counselor_id_idx" ON "counselor_assignments"("counselor_id");
CREATE INDEX "counselor_assignments_member_id_idx" ON "counselor_assignments"("member_id");

CREATE TABLE "partner_referrals" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partner_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "referred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_referrals_partner_id_member_id_key" ON "partner_referrals"("partner_id", "member_id");
CREATE INDEX "partner_referrals_partner_id_idx" ON "partner_referrals"("partner_id");

-- Foreign keys
ALTER TABLE "counselors" ADD CONSTRAINT "counselors_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "counselors" ADD CONSTRAINT "counselors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "counselor_assignments" ADD CONSTRAINT "counselor_assignments_counselor_id_fkey" FOREIGN KEY ("counselor_id") REFERENCES "counselors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "counselor_assignments" ADD CONSTRAINT "counselor_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;