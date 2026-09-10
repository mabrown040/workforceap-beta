-- WAP-12, phase 1: contain anonymous Data API access. Authenticated realtime
-- uses public.messages/message_threads and needs a separate authorization review.
-- This intentionally does not revoke authenticated grants or FORCE RLS.
BEGIN;

DROP POLICY IF EXISTS public_wioa_screenings_insert_public
  ON public.public_wioa_screenings;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, PUBLIC;

-- Table-level REVOKE does not remove column grants.
DO $migration$
DECLARE relation RECORD;
BEGIN
  FOR relation IN
    SELECT c.oid::regclass AS name, string_agg(quote_ident(a.attname), ', ') AS columns
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND a.attnum > 0 AND NOT a.attisdropped
    GROUP BY c.oid
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE %s FROM anon, PUBLIC',
      relation.columns, relation.name);
  END LOOP;
END
$migration$;

-- Preserve effective authenticated EXECUTE where it previously came from PUBLIC.
-- Never grant access to the older helpers already restricted to the backend.
DO $migration$
DECLARE routine RECORD;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure AS name FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', routine.name);
  END LOOP;
END
$migration$;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;

-- Prisma creates application objects as postgres. Global defaults must also
-- remove PUBLIC EXECUTE: per-schema defaults cannot override that implicit grant.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM anon, PUBLIC;

-- Managed supabase_admin defaults are a separate rollout prerequisite; do not
-- silently skip permission failures or alter a managed role in an app migration.
ALTER FUNCTION public.preserve_coursera_curriculum_course_mapping()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.preserve_course_enrollment_curriculum_version()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.xapi_statement_ingest_org_check()
  SET search_path = pg_catalog, public;

-- Fail atomically if inherited grants or unexpected ACLs defeat containment.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND CASE WHEN c.relkind IN ('r', 'p', 'v', 'm', 'f') THEN
      (has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')) ELSE false END
  ) OR EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND CASE WHEN c.relkind = 'S' THEN
      has_sequence_privilege('anon', c.oid, 'SELECT,UPDATE,USAGE') ELSE false END
  ) OR EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'WAP-12 anonymous public privileges remain; containment rolled back';
  END IF;
END
$migration$;

COMMIT;
