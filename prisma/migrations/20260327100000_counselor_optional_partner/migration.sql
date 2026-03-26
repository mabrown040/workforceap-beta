-- WorkforceAP counselors: partner_id nullable (null = org-level counselor)
ALTER TABLE "counselors" DROP CONSTRAINT IF EXISTS "counselors_partner_id_fkey";
ALTER TABLE "counselors" ALTER COLUMN "partner_id" DROP NOT NULL;
ALTER TABLE "counselors" ADD CONSTRAINT "counselors_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
