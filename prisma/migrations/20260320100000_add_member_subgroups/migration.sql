-- Member Subgroups: partner/manager/church visibility for members

CREATE TYPE "SubgroupType" AS ENUM ('partner', 'manager', 'church');

CREATE TYPE "MemberSubgroupAssignmentType" AS ENUM ('auto_referral', 'manual_admin', 'manual_leader');

CREATE TABLE "subgroups" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "type" "SubgroupType" NOT NULL,
  "leader_id" TEXT NOT NULL,
  "partner_id" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT NOT NULL,
  CONSTRAINT "subgroups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "subgroups_type_idx" ON "subgroups"("type");
CREATE INDEX "subgroups_leader_id_idx" ON "subgroups"("leader_id");
CREATE INDEX "subgroups_partner_id_idx" ON "subgroups"("partner_id");

CREATE TABLE "member_subgroups" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "member_id" TEXT NOT NULL,
  "subgroup_id" TEXT NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assigned_by" TEXT,
  "assignment_type" "MemberSubgroupAssignmentType" NOT NULL,
  CONSTRAINT "member_subgroups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "member_subgroups_member_id_subgroup_id_key" ON "member_subgroups"("member_id", "subgroup_id");
CREATE INDEX "member_subgroups_member_id_idx" ON "member_subgroups"("member_id");
CREATE INDEX "member_subgroups_subgroup_id_idx" ON "member_subgroups"("subgroup_id");

CREATE TABLE "subgroup_leaders" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "subgroup_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'secondary',
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subgroup_leaders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subgroup_leaders_subgroup_id_user_id_key" ON "subgroup_leaders"("subgroup_id", "user_id");
CREATE INDEX "subgroup_leaders_subgroup_id_idx" ON "subgroup_leaders"("subgroup_id");
CREATE INDEX "subgroup_leaders_user_id_idx" ON "subgroup_leaders"("user_id");

-- Foreign keys
ALTER TABLE "subgroups" ADD CONSTRAINT "subgroups_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subgroups" ADD CONSTRAINT "subgroups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subgroups" ADD CONSTRAINT "subgroups_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "member_subgroups" ADD CONSTRAINT "member_subgroups_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_subgroups" ADD CONSTRAINT "member_subgroups_subgroup_id_fkey" FOREIGN KEY ("subgroup_id") REFERENCES "subgroups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_subgroups" ADD CONSTRAINT "member_subgroups_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subgroup_leaders" ADD CONSTRAINT "subgroup_leaders_subgroup_id_fkey" FOREIGN KEY ("subgroup_id") REFERENCES "subgroups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subgroup_leaders" ADD CONSTRAINT "subgroup_leaders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
