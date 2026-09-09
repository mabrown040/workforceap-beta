-- Additive evidence workflow. No completion, attendance, credential, or provider writes.
BEGIN;
SELECT pg_advisory_xact_lock(609091300);
CREATE TABLE "member_lab_drafts" (
  "id" TEXT PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "enrollment_id" TEXT NOT NULL REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "program_slug" TEXT NOT NULL, "curriculum_version" TEXT NOT NULL,
  "lab_id" TEXT NOT NULL, "content_version" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0 CHECK ("revision" >= 0),
  "submission_count" INTEGER NOT NULL DEFAULT 0 CHECK ("submission_count" >= 0),
  "answers" JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof("answers") = 'object'),
  "artifact_url" VARCHAR(2000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "member_lab_drafts_enrollment_lab_content_key" ON "member_lab_drafts"("enrollment_id", "lab_id", "content_version");
CREATE UNIQUE INDEX "member_lab_drafts_identity_key" ON "member_lab_drafts"("id", "organization_id", "user_id");
CREATE INDEX "member_lab_drafts_user_id_idx" ON "member_lab_drafts"("user_id");
CREATE TABLE "member_lab_submissions" (
  "id" TEXT PRIMARY KEY, "draft_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "lab_id" TEXT NOT NULL, "program_slug" TEXT NOT NULL, "curriculum_version" TEXT NOT NULL,
  "content_version" TEXT NOT NULL, "rubric_version" TEXT NOT NULL,
  "draft_revision" INTEGER NOT NULL CHECK ("draft_revision" > 0),
  "attempt" INTEGER NOT NULL CHECK ("attempt" > 0),
  "answers" JSONB NOT NULL CHECK (jsonb_typeof("answers") = 'object'),
  "artifact_url" VARCHAR(2000), "lab_snapshot" JSONB NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_lab_submissions_draft_id_organization_id_user_id_fkey" FOREIGN KEY ("draft_id", "organization_id", "user_id") REFERENCES "member_lab_drafts"("id", "organization_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "member_lab_submissions_draft_id_attempt_key" ON "member_lab_submissions"("draft_id", "attempt");
CREATE INDEX "member_lab_submissions_organization_id_submitted_at_id_idx" ON "member_lab_submissions"("organization_id", "submitted_at", "id");
CREATE INDEX "member_lab_submissions_user_id_lab_id_submitted_at_idx" ON "member_lab_submissions"("user_id", "lab_id", "submitted_at");
CREATE TABLE "member_lab_reviews" (
  "id" TEXT PRIMARY KEY,
  "submission_id" TEXT NOT NULL REFERENCES "member_lab_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "reviewer_id" TEXT NOT NULL, "reviewer_display_name" TEXT NOT NULL,
  "reviewer_role" TEXT NOT NULL CHECK ("reviewer_role" IN ('admin', 'counselor')),
  "decision" TEXT NOT NULL CHECK ("decision" IN ('revision_requested', 'reviewed')),
  "feedback" TEXT NOT NULL CHECK (char_length("feedback") BETWEEN 1 AND 4000),
  "rubric_version" TEXT NOT NULL, "rubric_results" JSONB NOT NULL CHECK (jsonb_typeof("rubric_results") = 'array'),
  "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "member_lab_reviews_submission_id_key" ON "member_lab_reviews"("submission_id");

-- Definer helpers consult real current user/org/role/assignment records. A caller's
-- chosen member id or role GUC cannot grant access. Locked search_path avoids
-- object shadowing; no sensitive fields or draft content are returned.
CREATE FUNCTION public.lab_actor_is_member(p_member_id TEXT, p_organization_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users u
    WHERE u.id = p_member_id AND u.id = NULLIF(current_setting('app.current_user_id', true), '')
      AND u.organization_id = p_organization_id AND u.deleted_at IS NULL);
$$;
CREATE FUNCTION public.lab_actor_can_review(p_member_id TEXT, p_organization_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users actor JOIN public.users member ON member.id = p_member_id
    WHERE actor.id = NULLIF(current_setting('app.current_user_id', true), '')
      AND actor.id <> member.id
      AND actor.organization_id = p_organization_id AND member.organization_id = p_organization_id
      AND actor.deleted_at IS NULL AND member.deleted_at IS NULL
      AND (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = actor.id AND p.role IN ('admin', 'super_admin'))
        OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE ur.user_id = actor.id AND r.name IN ('admin', 'super_admin'))
        OR EXISTS (SELECT 1 FROM public.counselor_assignments ca JOIN public.counselors c ON c.id = ca.counselor_id WHERE ca.member_id = member.id AND ca.active AND c.active AND c.user_id = actor.id)
      ));
$$;
ALTER TABLE "member_lab_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_lab_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_lab_reviews" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_lab_drafts_read" ON "member_lab_drafts" FOR SELECT USING (public.lab_actor_is_member(user_id, organization_id));
CREATE POLICY "member_lab_drafts_insert" ON "member_lab_drafts" FOR INSERT WITH CHECK (public.lab_actor_is_member(user_id, organization_id));
CREATE POLICY "member_lab_drafts_update" ON "member_lab_drafts" FOR UPDATE USING (public.lab_actor_is_member(user_id, organization_id)) WITH CHECK (public.lab_actor_is_member(user_id, organization_id));
CREATE POLICY "member_lab_submissions_read" ON "member_lab_submissions" FOR SELECT
  USING (public.lab_actor_is_member(user_id, organization_id) OR public.lab_actor_can_review(user_id, organization_id));
CREATE POLICY "member_lab_submissions_insert" ON "member_lab_submissions" FOR INSERT
  WITH CHECK (public.lab_actor_is_member(user_id, organization_id));
CREATE POLICY "member_lab_reviews_read" ON "member_lab_reviews" FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.member_lab_submissions s WHERE s.id = submission_id AND
    (public.lab_actor_is_member(s.user_id, s.organization_id) OR public.lab_actor_can_review(s.user_id, s.organization_id)))
);
CREATE POLICY "member_lab_reviews_insert" ON "member_lab_reviews" FOR INSERT WITH CHECK (
  reviewer_id = NULLIF(current_setting('app.current_user_id', true), '') AND
  EXISTS (SELECT 1 FROM public.member_lab_submissions s WHERE s.id = submission_id AND public.lab_actor_can_review(s.user_id, s.organization_id))
);
-- Immutable submission/review payloads even when the application owner bypasses RLS.
-- Account deletion may cascade as part of the existing deletion lifecycle.
CREATE FUNCTION public.reject_lab_evidence_update() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION 'Lab evidence and reviews are immutable' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER member_lab_submissions_immutable BEFORE UPDATE ON "member_lab_submissions" FOR EACH ROW EXECUTE FUNCTION public.reject_lab_evidence_update();
CREATE TRIGGER member_lab_reviews_immutable BEFORE UPDATE ON "member_lab_reviews" FOR EACH ROW EXECUTE FUNCTION public.reject_lab_evidence_update();
COMMIT;
