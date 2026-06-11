-- RLS policies for apply_eligibility_screenings and public_wioa_screenings
--
-- Both tables carry organization_id and back the apply-eligibility screen +
-- the public WIOA qualification page.
--
-- Self-contained + idempotent: this migration also CREATEs the two tables and
-- the is_current_counselor() predicate it depends on. Those were originally
-- expected to already exist (from the 2026-06-02 sprint), but their create
-- migration was lost in the #1530 revert while these RLS policies + the Prisma
-- models survived — leaving this migration unrunnable against prod and blocking
-- ALL deploys (P3009). Creating them here (IF NOT EXISTS) makes the migration
-- self-sufficient and safe to (re)apply on any database.

-- ============================================================
-- prerequisite: counselor role predicate (mirrors is_current_admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_current_counselor()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $fn$
BEGIN RETURN get_current_role() IN ('counselor'); END;
$fn$;

-- ============================================================
-- prerequisite: tables (match prisma models)
-- ============================================================
CREATE TABLE IF NOT EXISTS apply_eligibility_screenings (
  id text PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  organization_id text NOT NULL,
  q1 text NOT NULL,
  q2 text NOT NULL,
  q3 text NOT NULL,
  qualifies boolean NOT NULL,
  yes_count integer NOT NULL,
  created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT apply_eligibility_screenings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT apply_eligibility_screenings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS apply_eligibility_screenings_organization_id_idx ON apply_eligibility_screenings(organization_id);

CREATE TABLE IF NOT EXISTS public_wioa_screenings (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  snapshot jsonb NOT NULL,
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT public_wioa_screenings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS public_wioa_screenings_organization_id_idx ON public_wioa_screenings(organization_id);
CREATE INDEX IF NOT EXISTS public_wioa_screenings_email_idx ON public_wioa_screenings(email);

-- ============================================================
-- apply_eligibility_screenings
-- ============================================================

ALTER TABLE apply_eligibility_screenings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "apply_eligibility_screenings_select_own" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_select_own" ON apply_eligibility_screenings
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "apply_eligibility_screenings_select_admin" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_select_admin" ON apply_eligibility_screenings
  FOR SELECT USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "apply_eligibility_screenings_select_counselor" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_select_counselor" ON apply_eligibility_screenings
  FOR SELECT USING (can_access_org_row(organization_id) AND is_current_counselor());

DROP POLICY IF EXISTS "apply_eligibility_screenings_insert_admin" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_insert_admin" ON apply_eligibility_screenings
  FOR INSERT WITH CHECK (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "apply_eligibility_screenings_update_admin" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_update_admin" ON apply_eligibility_screenings
  FOR UPDATE USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "apply_eligibility_screenings_delete_admin" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_delete_admin" ON apply_eligibility_screenings
  FOR DELETE USING (can_access_org_row(organization_id) AND is_current_admin());

-- ============================================================
-- public_wioa_screenings
-- ============================================================
-- These are anonymous submissions (no user_id). They are created by the
-- public WIOA qualification page and read by admin/counselor in the org.
-- Members cannot read them (no user_id to match).

ALTER TABLE public_wioa_screenings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_wioa_screenings_select_admin" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_select_admin" ON public_wioa_screenings
  FOR SELECT USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "public_wioa_screenings_select_counselor" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_select_counselor" ON public_wioa_screenings
  FOR SELECT USING (can_access_org_row(organization_id) AND is_current_counselor());

DROP POLICY IF EXISTS "public_wioa_screenings_insert_public" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_insert_public" ON public_wioa_screenings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public_wioa_screenings_update_admin" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_update_admin" ON public_wioa_screenings
  FOR UPDATE USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "public_wioa_screenings_delete_admin" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_delete_admin" ON public_wioa_screenings
  FOR DELETE USING (can_access_org_row(organization_id) AND is_current_admin());
