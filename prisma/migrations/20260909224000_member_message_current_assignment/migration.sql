-- Member-thread routing pointers do not grant lasting access after reassignment.
-- Keep the existing GUC identity contract and owner/service-role bypass intact.
-- This predicate is messaging-only; other counselor-data policies are unchanged.
BEGIN;

CREATE OR REPLACE FUNCTION public.can_access_member_message_thread(
  check_member_id TEXT,
  allow_admin BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users member
    JOIN public.users actor ON actor.id = public.get_current_user_id()
    WHERE member.id = check_member_id
      AND member.deleted_at IS NULL
      AND actor.deleted_at IS NULL
      AND (
        actor.id = member.id
        OR (
          allow_admin
          AND public.is_admin_for_member_data(member.id)
          AND (
            public.is_current_super_admin()
            OR actor.organization_id = member.organization_id
          )
        )
        OR (
          actor.organization_id = member.organization_id
          AND EXISTS (
            SELECT 1
            FROM public.counselor_assignments ca
            JOIN public.counselors c ON c.id = ca.counselor_id
            WHERE ca.member_id = member.id
              AND ca.active = TRUE
              AND c.active = TRUE
              AND c.user_id = actor.id
          )
        )
      )
  );
$$;

-- Member-thread access is derived from current assignment, not a cached owner.
-- Non-member branches below retain the existing policy clauses and privileges.
ALTER POLICY "message_threads_select_participant" ON public.message_threads
USING (
  (kind = 'member' AND public.can_access_member_message_thread(member_id, TRUE))
  OR (kind <> 'member' AND (
    member_id = public.get_current_user_id()
    OR counselor_user_id = public.get_current_user_id()
    OR staff_user_id = public.get_current_user_id()
    OR (employer_id IS NOT NULL AND public.is_current_employer(employer_id))
    OR (partner_id IS NOT NULL AND public.is_current_partner(partner_id))
    OR (member_id IS NOT NULL AND public.is_admin_for_member_data(member_id))
    OR public.is_current_super_admin()
  ))
);

-- Preserve existing admin write scope: an admin must also match its old
-- participant pointer. Active assigned counselors do not need that pointer.
ALTER POLICY "message_threads_update_participant" ON public.message_threads
USING (
  (kind = 'member' AND public.can_access_member_message_thread(
    member_id, counselor_user_id = public.get_current_user_id() OR staff_user_id = public.get_current_user_id()
  ))
  OR (kind <> 'member' AND (
    member_id = public.get_current_user_id()
    OR counselor_user_id = public.get_current_user_id()
    OR staff_user_id = public.get_current_user_id()
    OR (employer_id IS NOT NULL AND public.is_current_employer(employer_id))
    OR (partner_id IS NOT NULL AND public.is_current_partner(partner_id))
  ))
)
WITH CHECK (
  (kind = 'member' AND public.can_access_member_message_thread(
    member_id, counselor_user_id = public.get_current_user_id() OR staff_user_id = public.get_current_user_id()
  ))
  OR (kind <> 'member' AND (
    member_id = public.get_current_user_id()
    OR counselor_user_id = public.get_current_user_id()
    OR staff_user_id = public.get_current_user_id()
    OR (employer_id IS NOT NULL AND public.is_current_employer(employer_id))
    OR (partner_id IS NOT NULL AND public.is_current_partner(partner_id))
  ))
);

ALTER POLICY "messages_select_thread_participant" ON public.messages
USING (
  EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id = messages.thread_id AND (
      (t.kind = 'member' AND public.can_access_member_message_thread(t.member_id, TRUE))
      OR (t.kind <> 'member' AND (
        t.member_id = public.get_current_user_id()
        OR t.counselor_user_id = public.get_current_user_id()
        OR t.staff_user_id = public.get_current_user_id()
        OR (t.employer_id IS NOT NULL AND public.is_current_employer(t.employer_id))
        OR (t.partner_id IS NOT NULL AND public.is_current_partner(t.partner_id))
        OR (t.member_id IS NOT NULL AND public.is_admin_for_member_data(t.member_id))
        OR public.is_current_super_admin()
      ))
    )
  )
);

ALTER POLICY "messages_insert_author" ON public.messages
WITH CHECK (
  author_id = public.get_current_user_id()
  AND EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id = messages.thread_id AND (
      (t.kind = 'member' AND public.can_access_member_message_thread(
        t.member_id, t.counselor_user_id = public.get_current_user_id() OR t.staff_user_id = public.get_current_user_id()
      ))
      OR (t.kind <> 'member' AND (
        t.member_id = public.get_current_user_id()
        OR t.counselor_user_id = public.get_current_user_id()
        OR t.staff_user_id = public.get_current_user_id()
        OR (t.employer_id IS NOT NULL AND public.is_current_employer(t.employer_id))
        OR (t.partner_id IS NOT NULL AND public.is_current_partner(t.partner_id))
      ))
    )
  )
);

-- Live ACLs grant browser roles table-level UPDATE. Restrict authenticated
-- participant updates to receipts so a caller cannot rewrite kind, member,
-- portal IDs, or cached staff pointers to enter another policy branch.
-- App writes use owner/service_role; reassignment remains available there.
-- No browser client in this repository writes thread metadata through PostgREST.
REVOKE UPDATE ON TABLE public.message_threads FROM anon, authenticated;
GRANT UPDATE (
  member_last_read_at,
  counselor_last_read_at,
  portal_user_last_read_at,
  staff_last_read_at
) ON TABLE public.message_threads TO authenticated;

COMMIT;
