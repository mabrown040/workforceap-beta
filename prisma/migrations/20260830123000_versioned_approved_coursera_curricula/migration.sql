-- Additive expand migration for immutable curriculum assignment and approved
-- Coursera provider bindings. The legacy canonical mapping table and every
-- learner progress fact remain untouched so the currently deployed code keeps
-- working throughout the migrate-before-build Vercel release window.

ALTER TABLE "course_enrollments"
  ADD COLUMN IF NOT EXISTS "curriculum_version" TEXT NOT NULL DEFAULT 'legacy-v1';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'course_enrollments_curriculum_version_valid'
  ) THEN
    ALTER TABLE "course_enrollments"
      ADD CONSTRAINT "course_enrollments_curriculum_version_valid"
      CHECK ("curriculum_version" IN ('legacy-v1', 'catalog-v1', '2026-approved-v2'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS "course_enrollments_program_slug_curriculum_version_idx"
  ON "course_enrollments"("program_slug", "curriculum_version");

-- CourseEnrollment is the immutable assignment record. Protect it even from a
-- broad PostgREST/RLS update; an attended migration is required to move a
-- learner between curriculum versions.
CREATE OR REPLACE FUNCTION "preserve_course_enrollment_curriculum_version"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."curriculum_version" IS DISTINCT FROM OLD."curriculum_version" THEN
    RAISE EXCEPTION 'course enrollment curriculum_version is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "course_enrollment_curriculum_version_immutable"
  ON "course_enrollments";
CREATE TRIGGER "course_enrollment_curriculum_version_immutable"
BEFORE UPDATE ON "course_enrollments"
FOR EACH ROW
EXECUTE FUNCTION "preserve_course_enrollment_curriculum_version"();

CREATE TABLE IF NOT EXISTS "coursera_curriculum_course_mappings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "coursera_course_id" TEXT NOT NULL,
  "coursera_course_slug" TEXT,
  "canonical_program_slug" TEXT NOT NULL,
  "curriculum_version" TEXT NOT NULL,
  "canonical_course_slug" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coursera_curriculum_course_mappings_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coursera_curriculum_mapping_version_valid'
  ) THEN
    ALTER TABLE "coursera_curriculum_course_mappings"
      ADD CONSTRAINT "coursera_curriculum_mapping_version_valid"
      CHECK ("curriculum_version" IN ('legacy-v1', 'catalog-v1', '2026-approved-v2'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "coursera_curriculum_mapping_id_program_version_key"
  ON "coursera_curriculum_course_mappings"(
    "coursera_course_id",
    "canonical_program_slug",
    "curriculum_version"
  );

CREATE INDEX IF NOT EXISTS "coursera_curriculum_course_mappings_coursera_course_id_idx"
  ON "coursera_curriculum_course_mappings"("coursera_course_id");

CREATE INDEX IF NOT EXISTS "coursera_curriculum_course_mappings_canonical_program_slug_curriculum_version_idx"
  ON "coursera_curriculum_course_mappings"("canonical_program_slug", "curriculum_version");

CREATE INDEX IF NOT EXISTS "coursera_curriculum_course_mappings_canonical_course_slug_idx"
  ON "coursera_curriculum_course_mappings"("canonical_course_slug");

-- Global server-owned integrity catalog. Match the legacy canonical mapping
-- table's deny-by-default PostgREST posture; Prisma's owner connection remains
-- the only runtime reader/writer unless a future migration adds a policy.
ALTER TABLE "coursera_curriculum_course_mappings" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION "preserve_coursera_curriculum_course_mapping"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'coursera curriculum course mappings are append-only';
END;
$$;

DROP TRIGGER IF EXISTS "coursera_curriculum_course_mapping_append_only"
  ON "coursera_curriculum_course_mappings";
CREATE TRIGGER "coursera_curriculum_course_mapping_append_only"
BEFORE UPDATE OR DELETE ON "coursera_curriculum_course_mappings"
FOR EACH ROW
EXECUTE FUNCTION "preserve_coursera_curriculum_course_mapping"();

-- Seed the board-approved v2 provider bindings. Local WorkforceAP lab modules
-- intentionally have no provider row.
INSERT INTO "coursera_curriculum_course_mappings" (
  "coursera_course_id",
  "coursera_course_slug",
  "canonical_program_slug",
  "curriculum_version",
  "canonical_course_slug",
  "notes",
  "updated_at"
)
VALUES
  ('aDPeKsbTEeqqzg7nmRt_BQ', 'foundations-user-experience-design', 'ux-design-professional-certificate-google', '2026-approved-v2', 'foundations-user-experience-design', 'Approved 2026 curriculum manifest', NOW()),
  ('R-r2uwp-Eeuf7w5EwYPThw', 'start-ux-design-process', 'ux-design-professional-certificate-google', '2026-approved-v2', 'start-ux-design-process', 'Approved 2026 curriculum manifest', NOW()),
  ('TjOLkAp-EeubJBIM7h4jow', 'wireframes-low-fidelity-prototypes', 'ux-design-professional-certificate-google', '2026-approved-v2', 'wireframes-low-fidelity-prototypes', 'Approved 2026 curriculum manifest', NOW()),
  ('U7e_Lgp-EeubJBIM7h4jow', 'conduct-ux-research', 'ux-design-professional-certificate-google', '2026-approved-v2', 'conduct-ux-research', 'Approved 2026 curriculum manifest', NOW()),
  ('W5kcLAp-Eeua7xKR7OK1aw', 'high-fidelity-designs-prototype', 'ux-design-professional-certificate-google', '2026-approved-v2', 'high-fidelity-designs-prototype', 'Approved 2026 curriculum manifest', NOW()),
  ('YLwdQgp-Eeu0VAqNda9Xjw', 'responsive-web-design-adobe-xd', 'ux-design-professional-certificate-google', '2026-approved-v2', 'responsive-web-design-adobe-xd', 'Approved 2026 curriculum manifest', NOW()),
  ('coP2hgp-Eeuh2QpCvqFzYQ', 'ux-design-jobs', 'ux-design-professional-certificate-google', '2026-approved-v2', 'ux-design-jobs', 'Approved 2026 curriculum manifest', NOW()),
  ('zQV3KCOCEeui6AoQjSZBrQ', 'introduction-to-data-engineering', 'data-science-professional-certificate-ibm', '2026-approved-v2', 'introduction-to-data-engineering', 'Approved 2026 curriculum manifest', NOW()),
  ('qNrWFjDlEeua-goM8-0Q8w', 'introduction-to-relational-databases', 'data-science-professional-certificate-ibm', '2026-approved-v2', 'introduction-to-relational-databases', 'Approved 2026 curriculum manifest', NOW()),
  ('GDQMSxDWEeitFhJL4G-A_g', 'sql-data-science', 'data-science-professional-certificate-ibm', '2026-approved-v2', 'sql-data-science', 'Approved 2026 curriculum manifest', NOW()),
  ('ejOz7RDUEei99hK0xs-tsg', 'python-for-applied-data-science-ai', 'data-science-professional-certificate-ibm', '2026-approved-v2', 'python-for-applied-data-science-ai', 'Approved 2026 curriculum manifest', NOW()),
  ('B_rci897EeufchLeGgZGZQ', 'hands-on-introduction-to-linux-commands-and-shell-scripting', 'data-science-professional-certificate-ibm', '2026-approved-v2', 'hands-on-introduction-to-linux-commands-and-shell-scripting', 'Approved 2026 curriculum manifest', NOW()),
  ('gaD7sM97EeuHgw5SCcDQSQ', 'etl-and-data-pipelines-shell-airflow-kafka', 'data-science-professional-certificate-ibm', '2026-approved-v2', 'etl-and-data-pipelines-shell-airflow-kafka', 'Approved 2026 curriculum manifest', NOW()),
  ('xdMr0c97EeuHgw5SCcDQSQ', 'data-warehouse-fundamentals', 'data-science-professional-certificate-ibm', '2026-approved-v2', 'data-warehouse-fundamentals', 'Approved 2026 curriculum manifest', NOW()),
  ('XXZBGc97EeufchLeGgZGZQ', 'relational-database-administration', 'data-science-professional-certificate-ibm', '2026-approved-v2', 'relational-database-administration', 'Approved 2026 curriculum manifest', NOW()),
  ('V2tYXNFWEe-3_Q7tYtYdfw', 'relational-database-administration-capstone-project', 'data-science-professional-certificate-ibm', '2026-approved-v2', 'relational-database-administration-capstone-project', 'Approved 2026 curriculum manifest', NOW()),
  ('1psdSVOIEeyc0w4h2jEFEQ', 'introduction-to-management-consulting', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'introduction-to-management-consulting', 'Approved 2026 curriculum manifest', NOW()),
  ('zPU_kmRfEe-e0g4kKcdYJQ', 'introduction-to-business-analysis', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'introduction-to-business-analysis', 'Approved 2026 curriculum manifest', NOW()),
  ('ma9Rl54ZEfCkjBKc1V0Qpw', 'project-stakeholder-and-requirements-management-fundamentals', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'project-stakeholder-and-requirements-management-fundamentals', 'Approved 2026 curriculum manifest', NOW()),
  ('RrWSGy5yEfGRiRLMJS1FiQ', 'business-strategy-creating-competitive-advantage', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'business-strategy-creating-competitive-advantage', 'Approved 2026 curriculum manifest', NOW()),
  ('CGp8Nj4JEfGj6wr_-5C2xw', 'financial-analysis-and-modeling', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'financial-analysis-and-modeling', 'Approved 2026 curriculum manifest', NOW()),
  ('kvb6uMbTEeqZOA5eKDHL-w', 'foundations-data', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'foundations-data', 'Approved 2026 curriculum manifest', NOW()),
  ('ZEB-Lgp9Eeun_RJEc0KNDw', 'ask-questions-make-decisions', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'ask-questions-make-decisions', 'Approved 2026 curriculum manifest', NOW()),
  ('NRRbf9zWEeqPZRKxGtAxBQ', 'data-visualization-dashboards-excel-cognos', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'data-visualization-dashboards-excel-cognos', 'Approved 2026 curriculum manifest', NOW()),
  ('xZqTjNaNEfC69hJmAzZJ9w', 'generative-ai-transform-your-management-consulting', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'generative-ai-transform-your-management-consulting', 'Approved 2026 curriculum manifest', NOW()),
  ('0_J99TlPEfGP5A7qtRBM-w', 'capstone-integrated-management-consulting-project', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'capstone-integrated-management-consulting-project', 'Approved 2026 curriculum manifest', NOW())
ON CONFLICT (
  "coursera_course_id",
  "canonical_program_slug",
  "curriculum_version"
) DO NOTHING;
