-- Additive expand migration for immutable curriculum assignment and approved
-- Coursera provider bindings. The legacy canonical mapping table and every
-- learner progress fact remain untouched so the currently deployed code keeps
-- working throughout the migrate-before-build Vercel release window.

BEGIN;

-- Prisma migrate deploy serializes recorded migrations. Preview temporarily
-- executes this one additive migration directly because the shared demo
-- project has a separately tracked historical backlog. Keep direct preview
-- runs transactional and serialize the exact migration explicitly.
SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '180s';
SELECT pg_advisory_xact_lock(
  hashtextextended('workforceap:20260830123000_versioned_approved_coursera_curricula', 0)
);

ALTER TABLE "course_enrollments"
  ADD COLUMN IF NOT EXISTS "curriculum_version" TEXT NOT NULL DEFAULT 'legacy-v1';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'course_enrollments_curriculum_version_valid'
      AND conrelid = 'public.course_enrollments'::regclass
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
      AND conrelid = 'public.coursera_curriculum_course_mappings'::regclass
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
CREATE TEMP TABLE "expected_20260830123000_curriculum_mappings" (
  "coursera_course_id" TEXT NOT NULL,
  "coursera_course_slug" TEXT NOT NULL,
  "canonical_program_slug" TEXT NOT NULL,
  "curriculum_version" TEXT NOT NULL,
  "canonical_course_slug" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL
) ON COMMIT DROP;

INSERT INTO "expected_20260830123000_curriculum_mappings" (
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
  ('0_J99TlPEfGP5A7qtRBM-w', 'capstone-integrated-management-consulting-project', 'data-analytics-professional-certificate-google', '2026-approved-v2', 'capstone-integrated-management-consulting-project', 'Approved 2026 curriculum manifest', NOW());

INSERT INTO "coursera_curriculum_course_mappings" (
  "coursera_course_id",
  "coursera_course_slug",
  "canonical_program_slug",
  "curriculum_version",
  "canonical_course_slug",
  "notes",
  "updated_at"
)
SELECT
  "coursera_course_id",
  "coursera_course_slug",
  "canonical_program_slug",
  "curriculum_version",
  "canonical_course_slug",
  "notes",
  "updated_at"
FROM "expected_20260830123000_curriculum_mappings"
ON CONFLICT (
  "coursera_course_id",
  "canonical_program_slug",
  "curriculum_version"
) DO NOTHING;

-- IF NOT EXISTS protects safe sequential re-entry. These assertions make
-- partial or same-name/wrong-definition drift fail loudly instead of silently
-- accepting an unusable preview schema.
DO $$
DECLARE
  approved_mapping_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_enrollments'
      AND column_name = 'curriculum_version'
      AND data_type = 'text'
      AND is_nullable = 'NO'
      AND column_default LIKE '%legacy-v1%'
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: course_enrollments.curriculum_version';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'course_enrollments_curriculum_version_valid'
      AND conrelid = 'public.course_enrollments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%legacy-v1%'
      AND pg_get_constraintdef(oid) LIKE '%catalog-v1%'
      AND pg_get_constraintdef(oid) LIKE '%2026-approved-v2%'
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: enrollment version constraint';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'course_enrollments'
      AND indexname = 'course_enrollments_program_slug_curriculum_version_idx'
      AND REPLACE(indexdef, '"', '') LIKE '%(program_slug, curriculum_version)%'
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: enrollment version index';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'course_enrollment_curriculum_version_immutable'
      AND tgrelid = 'public.course_enrollments'::regclass
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: enrollment immutability trigger';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('id', 'uuid', 'NO'),
        ('coursera_course_id', 'text', 'NO'),
        ('coursera_course_slug', 'text', 'YES'),
        ('canonical_program_slug', 'text', 'NO'),
        ('curriculum_version', 'text', 'NO'),
        ('canonical_course_slug', 'text', 'NO'),
        ('notes', 'text', 'YES'),
        ('created_at', 'timestamp without time zone', 'NO'),
        ('updated_at', 'timestamp without time zone', 'NO')
    ) AS expected(column_name, data_type, is_nullable)
    LEFT JOIN information_schema.columns actual
      ON actual.table_schema = 'public'
      AND actual.table_name = 'coursera_curriculum_course_mappings'
      AND actual.column_name = expected.column_name
    WHERE actual.column_name IS NULL
      OR actual.data_type IS DISTINCT FROM expected.data_type
      OR actual.is_nullable IS DISTINCT FROM expected.is_nullable
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: mapping table columns';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coursera_curriculum_course_mappings'
      AND column_name = 'id'
      AND column_default LIKE '%gen_random_uuid%'
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: mapping id default';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coursera_curriculum_course_mappings_pkey'
      AND conrelid = 'public.coursera_curriculum_course_mappings'::regclass
      AND contype = 'p'
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: mapping primary key';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coursera_curriculum_mapping_version_valid'
      AND conrelid = 'public.coursera_curriculum_course_mappings'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%legacy-v1%'
      AND pg_get_constraintdef(oid) LIKE '%catalog-v1%'
      AND pg_get_constraintdef(oid) LIKE '%2026-approved-v2%'
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: mapping version constraint';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'coursera_curriculum_course_mappings'
      AND indexname = 'coursera_curriculum_mapping_id_program_version_key'
      AND indexdef LIKE 'CREATE UNIQUE INDEX%'
      AND REPLACE(indexdef, '"', '') LIKE '%(coursera_course_id, canonical_program_slug, curriculum_version)%'
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: mapping uniqueness';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'public.coursera_curriculum_course_mappings'::regclass
      AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: mapping RLS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polrelid = 'public.coursera_curriculum_course_mappings'::regclass
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: mapping table must have no RLS policies';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'coursera_curriculum_course_mapping_append_only'
      AND tgrelid = 'public.coursera_curriculum_course_mappings'::regclass
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: mapping append-only trigger';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "expected_20260830123000_curriculum_mappings" expected
    LEFT JOIN "coursera_curriculum_course_mappings" actual
      ON actual."coursera_course_id" = expected."coursera_course_id"
      AND actual."canonical_program_slug" = expected."canonical_program_slug"
      AND actual."curriculum_version" = expected."curriculum_version"
    WHERE actual."id" IS NULL
      OR actual."coursera_course_slug" IS DISTINCT FROM expected."coursera_course_slug"
      OR actual."canonical_course_slug" IS DISTINCT FROM expected."canonical_course_slug"
      OR actual."notes" IS DISTINCT FROM expected."notes"
  ) THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: stale or missing provider binding';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO approved_mapping_count
  FROM "coursera_curriculum_course_mappings"
  WHERE "curriculum_version" = '2026-approved-v2';

  IF approved_mapping_count <> 26 THEN
    RAISE EXCEPTION 'approved curriculum migration invariant failed: expected 26 provider bindings, found %', approved_mapping_count;
  END IF;
END;
$$;

COMMIT;
