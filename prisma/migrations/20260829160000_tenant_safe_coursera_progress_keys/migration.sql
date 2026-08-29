-- Make raw Coursera idempotency keys tenant-local.
--
-- Historical NULL-organization rows are intentionally left untouched: an
-- email address alone is not tenant evidence. Runtime writers may adopt an
-- exact legacy identity only while holding the global raw-email transaction
-- lock and after authenticated organization/user validation.
--
-- Production rollout is deliberately two-step. The attended precreate script
-- builds these four indexes with CREATE INDEX CONCURRENTLY and verifies their
-- exact catalog definitions before `prisma migrate deploy` runs this file.
-- Prisma 5.x can wrap a multi-statement migration in a transaction, where
-- CREATE INDEX CONCURRENTLY is forbidden even when IF NOT EXISTS would be a
-- no-op. Therefore this migration contains no concurrent DDL: it validates
-- precreated indexes and fails closed when a populated table is missing one.
-- A completely empty development/test table may bootstrap its index with
-- ordinary transactional DDL; populated deployments never take that path.
--
-- The old global indexes remain in place for the serving Stage-A deployment.
-- Dropping them is a separate, later rollout after all legacy writers drain.

DO $migration$
DECLARE
  expected record;
  exact_index_exists boolean;
  table_has_rows boolean;
BEGIN
  FOR expected IN
    SELECT *
    FROM (VALUES
      (
        'coursera_course_progress_org_email_course_exact_key',
        'coursera_course_progress',
        'organization_id',
        'external_email',
        'coursera_course_id',
        false,
        'CREATE UNIQUE INDEX "coursera_course_progress_org_email_course_exact_key" ON "coursera_course_progress" ("organization_id", "external_email", "coursera_course_id")'
      ),
      (
        'coursera_course_progress_org_email_course_key',
        'coursera_course_progress',
        'organization_id',
        'lower(external_email)',
        'coursera_course_id',
        true,
        'CREATE UNIQUE INDEX "coursera_course_progress_org_email_course_key" ON "coursera_course_progress" ("organization_id", LOWER("external_email"), "coursera_course_id") WHERE "organization_id" IS NOT NULL'
      ),
      (
        'coursera_badge_progress_org_email_badge_exact_key',
        'coursera_badge_progress',
        'organization_id',
        'external_email',
        'badge_slug',
        false,
        'CREATE UNIQUE INDEX "coursera_badge_progress_org_email_badge_exact_key" ON "coursera_badge_progress" ("organization_id", "external_email", "badge_slug")'
      ),
      (
        'coursera_badge_progress_org_email_badge_key',
        'coursera_badge_progress',
        'organization_id',
        'lower(external_email)',
        'badge_slug',
        true,
        'CREATE UNIQUE INDEX "coursera_badge_progress_org_email_badge_key" ON "coursera_badge_progress" ("organization_id", LOWER("external_email"), "badge_slug") WHERE "organization_id" IS NOT NULL'
      )
    ) AS definitions(
      index_name,
      table_name,
      col1,
      col2,
      col3,
      predicate_required,
      create_sql
    )
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_index AS index_row
      JOIN pg_class AS index_class ON index_class.oid = index_row.indexrelid
      JOIN pg_class AS table_class ON table_class.oid = index_row.indrelid
      JOIN pg_namespace AS table_namespace ON table_namespace.oid = table_class.relnamespace
      WHERE index_class.relname = expected.index_name
        AND table_namespace.nspname = 'public'
        AND table_class.relname = expected.table_name
        AND index_row.indisvalid
        AND index_row.indisready
        AND index_row.indisunique
        AND index_row.indnkeyatts = 3
        AND index_row.indnatts = 3
        AND replace(pg_get_indexdef(index_row.indexrelid, 1, true), '"', '') = expected.col1
        AND replace(pg_get_indexdef(index_row.indexrelid, 2, true), '"', '') = expected.col2
        AND replace(pg_get_indexdef(index_row.indexrelid, 3, true), '"', '') = expected.col3
        AND (
          (NOT expected.predicate_required AND index_row.indpred IS NULL)
          OR (
            expected.predicate_required
            AND regexp_replace(
              COALESCE(pg_get_expr(index_row.indpred, index_row.indrelid, true), ''),
              '[()"[:space:]]',
              '',
              'g'
            ) = 'organization_idISNOTNULL'
          )
        )
    ) INTO exact_index_exists;

    IF NOT exact_index_exists THEN
      IF to_regclass(format('public.%I', expected.index_name)) IS NOT NULL THEN
        RAISE EXCEPTION
          'Coursera tenant index % exists but is invalid, not ready, non-unique, or has the wrong definition',
          expected.index_name;
      END IF;

      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM public.%I LIMIT 1)',
        expected.table_name
      ) INTO table_has_rows;

      IF table_has_rows THEN
        RAISE EXCEPTION
          'Coursera tenant index % is missing on populated table %. Run pnpm coursera:precreate-tenant-indexes -- --apply before prisma migrate deploy',
          expected.index_name,
          expected.table_name;
      END IF;

      -- Empty-database bootstrap only. Populated databases always fail above
      -- and must use the attended concurrent precreation path.
      EXECUTE expected.create_sql;

      SELECT EXISTS (
        SELECT 1
        FROM pg_index AS index_row
        JOIN pg_class AS index_class ON index_class.oid = index_row.indexrelid
        JOIN pg_class AS table_class ON table_class.oid = index_row.indrelid
        JOIN pg_namespace AS table_namespace ON table_namespace.oid = table_class.relnamespace
        WHERE index_class.relname = expected.index_name
          AND table_namespace.nspname = 'public'
          AND table_class.relname = expected.table_name
          AND index_row.indisvalid
          AND index_row.indisready
          AND index_row.indisunique
          AND index_row.indnkeyatts = 3
          AND index_row.indnatts = 3
          AND replace(pg_get_indexdef(index_row.indexrelid, 1, true), '"', '') = expected.col1
          AND replace(pg_get_indexdef(index_row.indexrelid, 2, true), '"', '') = expected.col2
          AND replace(pg_get_indexdef(index_row.indexrelid, 3, true), '"', '') = expected.col3
          AND (
            (NOT expected.predicate_required AND index_row.indpred IS NULL)
            OR (
              expected.predicate_required
              AND regexp_replace(
                COALESCE(pg_get_expr(index_row.indpred, index_row.indrelid, true), ''),
                '[()"[:space:]]',
                '',
                'g'
              ) = 'organization_idISNOTNULL'
            )
          )
      ) INTO exact_index_exists;

      IF NOT exact_index_exists THEN
        RAISE EXCEPTION
          'Coursera tenant index % failed exact-definition validation after empty-table bootstrap',
          expected.index_name;
      END IF;
    END IF;
  END LOOP;
END
$migration$;
