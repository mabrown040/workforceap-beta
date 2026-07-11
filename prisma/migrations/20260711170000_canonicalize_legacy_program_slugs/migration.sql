BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TEMP TABLE _program_slug_map (
  old_slug TEXT PRIMARY KEY,
  new_slug TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO _program_slug_map (old_slug, new_slug) VALUES
  ('ai-practitioner-professional-certificate', 'ai-practitioner-professional-certificate-aws'),
  ('ai-professional-developer-certificate-ibm', 'ai-practitioner-professional-certificate-aws'),
  ('construction-readiness-certificate-osha-10', 'core-construction-training-certificate'),
  ('logistics-and-supply-chain-certificate-clt', 'certified-logistics-technician-clt'),
  ('production-technology-certificate-cpt', 'certified-production-technician-cpt');

-- Production historically contains two catalog shells for the same AI
-- Practitioner curriculum. Keep the row backed by the 16-course curriculum
-- and remove only its empty duplicate before canonicalizing both slugs.
DELETE FROM "organization_program_catalog" duplicate
WHERE duplicate."program_slug" = 'ai-practitioner-professional-certificate'
  AND EXISTS (
    SELECT 1
    FROM "organization_program_catalog" curriculum
    WHERE curriculum."organization_id" = duplicate."organization_id"
      AND curriculum."program_slug" = 'ai-professional-developer-certificate-ibm'
  );

-- Fail before any canonicalization if a composite unique key would collapse.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "organization_program_catalog" catalog
    LEFT JOIN _program_slug_map mapping ON mapping.old_slug = catalog."program_slug"
    GROUP BY catalog."organization_id", COALESCE(mapping.new_slug, catalog."program_slug")
    HAVING COUNT(*) > 1 AND BOOL_OR(mapping.old_slug IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'program slug backfill would collide in organization_program_catalog';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "courses" course
    LEFT JOIN _program_slug_map mapping ON mapping.old_slug = course."program_slug"
    GROUP BY course."organization_id", COALESCE(mapping.new_slug, course."program_slug"), course."course_slug"
    HAVING COUNT(*) > 1 AND BOOL_OR(mapping.old_slug IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'program slug backfill would collide in courses';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "course_enrollments" enrollment
    LEFT JOIN _program_slug_map mapping ON mapping.old_slug = enrollment."program_slug"
    GROUP BY enrollment."user_id", COALESCE(mapping.new_slug, enrollment."program_slug")
    HAVING COUNT(*) > 1 AND BOOL_OR(mapping.old_slug IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'program slug backfill would collide in course_enrollments';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "course_progress" progress
    LEFT JOIN _program_slug_map mapping ON mapping.old_slug = progress."program_slug"
    GROUP BY progress."user_id", COALESCE(mapping.new_slug, progress."program_slug"), progress."course_slug"
    HAVING COUNT(*) > 1 AND BOOL_OR(mapping.old_slug IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'program slug backfill would collide in course_progress';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "member_program_progress" progress
    LEFT JOIN _program_slug_map mapping ON mapping.old_slug = progress."program_slug"
    GROUP BY progress."user_id", COALESCE(mapping.new_slug, progress."program_slug")
    HAVING COUNT(*) > 1 AND BOOL_OR(mapping.old_slug IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'program slug backfill would collide in member_program_progress';
  END IF;
END $$;

UPDATE "career_program_mappings" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "course_enrollments" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "course_progress" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "coursera_canonical_course_mappings" target
SET "canonical_program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."canonical_program_slug" = mapping.old_slug;

UPDATE "coursera_course_progress" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "coursera_skillset_progress" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "courses" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "employer_hiring_intents" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "employer_screening_packs" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "invitations" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "member_program_progress" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "milestone_cascades" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "organization_program_catalog" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "placed_outcomes" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "placement_records" target
SET "program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."program_slug" = mapping.old_slug;

UPDATE "program_change_requests" target
SET "current_program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."current_program_slug" = mapping.old_slug;

UPDATE "program_change_requests" target
SET "requested_program_slug" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."requested_program_slug" = mapping.old_slug;

UPDATE "users" target
SET "enrolled_program" = mapping.new_slug
FROM _program_slug_map mapping
WHERE target."enrolled_program" = mapping.old_slug;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "career_program_mappings" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "course_enrollments" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "course_progress" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "coursera_canonical_course_mappings" WHERE "canonical_program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "coursera_course_progress" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "coursera_skillset_progress" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "courses" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "employer_hiring_intents" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "employer_screening_packs" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "invitations" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "member_program_progress" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "milestone_cascades" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "organization_program_catalog" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "placed_outcomes" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "placement_records" WHERE "program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "program_change_requests" WHERE "current_program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "program_change_requests" WHERE "requested_program_slug" IN (SELECT old_slug FROM _program_slug_map)
    UNION ALL SELECT 1 FROM "users" WHERE "enrolled_program" IN (SELECT old_slug FROM _program_slug_map)
  ) THEN
    RAISE EXCEPTION 'program slug backfill left legacy values behind';
  END IF;
END $$;

COMMIT;
