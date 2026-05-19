# P1 RLS policy review — FORCE ROW LEVEL SECURITY readiness

**Date:** 2026-05-18  
**Scope:** Prisma migrations (`prisma/migrations/**/migration.sql`), legacy Supabase SQL (`supabase/migrations/**/*.sql`), app GUC contract (`lib/db/gucContext.ts`, `lib/db/prisma.ts`, `lib/auth/server.ts`, `app/layout.tsx`)  
**Audit-only** — no schema or policy changes in this commit.

---

## Executive summary

| Area | Status |
|------|--------|
| GUC names in SQL helpers vs app `set_config` | **Aligned** (`app.current_user_id`, `app.current_org_id`, `app.current_role`, optional `app.current_employer_id` / `app.current_partner_id`) |
| `FORCE ROW LEVEL SECURITY` on P0 member tables | **Deferred** by `20260514000000_defer_rls_force_authorize_system` (46 tables `NO FORCE`) |
| `orgId` in request GUC | **Partial** — `resolveAuthGucContext()` resolves `organizationId`; root `app/layout.tsx` still passes `orgId: null` |
| Empty-string vs NULL org GUC | **Gap** — app sets `''` when org absent; SQL treats `'' IS NOT NULL`, breaking several admin/org checks until normalized |
| PgBouncer / single-query GUC stickiness | **Blocker** — middleware is best-effort outside `$transaction` (`lib/db/prisma.ts`) |
| `system` cron role | **Fixed** in defer migration (helpers short-circuit for `role = system`) |
| Tables named in charter (`members`, `organizations`, `applications`, `placements`, `audit_log`) | See per-table verdicts below — **not ready** to FORCE as a set |

**Recommendation:** Do not re-apply `ALTER TABLE … FORCE ROW LEVEL SECURITY` until (1) every request entry sets a real `orgId` (including layout), (2) helpers treat empty GUC as NULL, (3) sensitive paths use `$transaction`, and (4) shadow role matrix passes (`p1-shadow-force-rls-test`).

---

## GUC contract (app ↔ SQL)

### Application (`lib/db/prisma.ts` → `buildGucSql`)

| GUC | Set when | Empty / anonymous behavior |
|-----|----------|----------------------------|
| `app.current_user_id` | Always | `''` if null |
| `app.current_org_id` | Always | `''` if null |
| `app.current_role` | Always | `'anonymous'`, `'member'`, `'admin'`, `'system'`, etc. |
| `app.current_employer_id` | If `ctx.employerId` | Omitted when unset |
| `app.current_partner_id` | If `ctx.partnerId` | Omitted when unset |

### SQL helpers (`20260513040000_add_rls_policies`, updated `20260514000000_defer_rls_force_authorize_system`)

| Function | Reads | Notes |
|----------|-------|-------|
| `get_current_user_id()` | `app.current_user_id` | `COALESCE(..., NULL)` — `''` stays `''`, not NULL |
| `get_current_org_id()` | `app.current_org_id` | Same — **`'' IS NOT NULL`** breaks org gates |
| `get_current_role()` | `app.current_role` | |
| `is_current_admin()` | role IN (`admin`, `super_admin`, **`system`**) | Defer migration added `system` |
| `is_admin_for_member_data(uid)` | org GUC + admin role + `users.organization_id` | Fails when `co` is `''` or NULL |
| `can_access_org_row(org_id)` | org GUC + role | 7 policies call this directly |
| `is_current_partner` / `is_current_employer` | partner/employer GUC + tables | `system` bypass added |

### Org resolution gaps (app)

| Call site | `orgId` |
|-----------|---------|
| `resolveAuthGucContext()` (`lib/auth/server.ts`) | `user.organizationId` from DB |
| `withAuthGuc()` | Uses `resolveAuthGucContext()` |
| Root `app/layout.tsx` | **`orgId: null` hardcoded** — server components inherit empty org GUC |
| `SYSTEM_GUC_CONTEXT` / cron | `null` → `''` (OK for `system` role bypass) |

---

## Policies calling `can_access_org_row` (direct)

Post-defer definition: `system` → TRUE; `super_admin` → TRUE; `admin` + matching `get_current_org_id()` → TRUE; any role with matching org GUC → TRUE.

| Table | policy_name | current_check | gap | recommendation |
|-------|-------------|---------------|-----|----------------|
| `pre_screening_responses` | `pre_screening_responses_select_admin` | `can_access_org_row(organization_id) AND is_current_admin()` | Row `organization_id` must match GUC; empty org GUC never matches; no counselor path | Normalize empty org in `get_current_org_id()`; ensure layout sets org; add counselor policy if product needs it |
| `employers` | `employers_select_org` | `can_access_org_row(organization_id) AND is_current_admin()` | Same; cross-table admin listing depends on org GUC | Same + verify admin employer list uses `$transaction` |
| `employers` | `employers_update_admin` | Same as select | No INSERT policy for admin-created employers | Add `employers_insert_admin` when FORCE flips if admins create rows |
| `jobs` | `jobs_select_org_published` | `can_access_org_row(organization_id) AND status IN (...)` | Members need populated org GUC to see job board | Set org in layout; document that members without `organization_id` see no published jobs |
| `jobs` | `jobs_select_admin` | `can_access_org_row(organization_id) AND is_current_admin()` | Org GUC required | Ready only after org GUC + empty-string fix |
| `jobs` | `jobs_modify_admin` | `can_access_org_row` + admin (ALL) | OK pattern | Ready after org GUC fix |
| `partners` | `partners_select_admin` | `can_access_org_row(organization_id) AND is_current_admin()` | OK if org GUC set | Ready after org GUC fix |
| `partners` | `partners_modify_admin` | Same (ALL) | OK | Ready after org GUC fix |

---

## Charter tables (requested focus)

> **Note:** There is no `members` table — program members are rows in `users` (`organization_id` FK).

### `users` (members)

| policy_name | current_check | gap | recommendation |
|-------------|---------------|-----|----------------|
| `users_select_own` | `id = get_current_user_id()` | OK for members | Keep |
| `users_select_admin` | `is_admin_for_member_data(id)` | Requires non-empty matching org GUC; layout leaves org empty | Fix layout + `NULLIF(get_current_org_id(),'')` in helper |
| `users_select_counselor` | `is_counselor_for_member(id)` | Assignment-based; OK | Keep |
| `users_update_own` | own id | OK | Keep |
| `users_update_admin` | `is_admin_for_member_data(id)` | Same org GUC dependency | Fix org GUC before FORCE |
| *(none)* | — | **No INSERT policy** — signup/service paths rely on owner bypass today | Add `users_insert_system` or restrict sign-up to service role explicitly before FORCE |

**Flip readiness:** **NOT READY** — admin member lists fail under FORCE until org GUC is correct on every path; signup/insert path undefined.

---

### `organizations`

| policy_name | current_check | gap | recommendation |
|-------------|---------------|-----|----------------|
| `organizations_select_own` | `super_admin OR id = get_current_org_id()` | `get_current_org_id() = ''` never matches UUID; layout omits org | Fix org propagation |
| `organizations_modify_super_admin` | `is_current_super_admin()` | OK | Keep |
| `organizations_update_admin` | `is_current_admin() AND id = get_current_org_id()` | Needs real org GUC | Fix layout |
| *(none)* | — | **RLS never FORCED** (P2 table); ENABLE only | When forcing P2, add explicit INSERT if admins create orgs |

**Flip readiness:** **NOT READY** — branding/settings reads break for admins when org GUC empty; not on FORCE list yet but policies are org-GUC-critical.

---

### `applications`

| policy_name | current_check | gap | recommendation |
|-------------|---------------|-----|----------------|
| `applications_select_own` | `user_id = get_current_user_id()` | OK | Keep |
| `applications_select_admin` | `is_admin_for_member_data(user_id)` | Org GUC | Fix org GUC |
| `applications_select_counselor` | `is_counselor_for_member(user_id)` | OK | Keep |
| *(none)* | — | **No INSERT/UPDATE/DELETE policies** — intake mutations denied under FORCE | Add owner insert/update + admin/counselor mutate policies (mirror `goals_*` pattern) |

**Flip readiness:** **NOT READY** — read mostly OK after org fix; **writes will hard-fail** under FORCE.

---

### `placement_records` (placements)

| policy_name | current_check | gap | recommendation |
|-------------|---------------|-----|----------------|
| `placement_records_select_own` | `user_id = get_current_user_id()` | OK | Keep |
| `placement_records_select_admin` | `is_admin_for_member_data(user_id)` | Org GUC | Fix org GUC |
| `placement_records_select_counselor` | `is_counselor_for_member(user_id)` | OK | Keep |
| *(none)* | — | **No write policies** — counselors/admins cannot INSERT/UPDATE placements under FORCE | Add `placement_records_insert_admin`, `placement_records_update_admin/counselor` before FORCE |

**Flip readiness:** **NOT READY** — placement workflow writes blocked under FORCE.

---

### `audit_logs`

| policy_name | current_check | gap | recommendation |
|-------------|---------------|-----|----------------|
| `audit_logs_select_actor` | `actor_user_id = get_current_user_id()` | OK | Keep |
| `audit_logs_select_admin` | `super_admin OR (admin AND actor in same org via get_current_org_id())` | `actor_user_id IS NOT NULL` excludes system/cron rows from admin view; empty org GUC blocks admin reads | Normalize org GUC; consider `org_id` column on `audit_logs` for direct tenancy |
| *(none)* | — | **No INSERT/SELECT for system** — comment says "service role only" | Ensure all writers use `SYSTEM_GUC_CONTEXT` inside transaction, or add `audit_logs_insert_system` |

**Flip readiness:** **NOT READY** — admin audit UI empty under FORCE without org GUC + insert policies for app writers.

---

## Other GUC-aware / high-risk policies (summary)

### Admin policies without org scoping (cross-tenant risk once `is_current_admin()` passes)

These use `is_current_admin()` only — **any org’s admin can read all rows** when connected under FORCE with a valid admin role (org GUC irrelevant):

| Table | policy_name |
|-------|-------------|
| `counselors` | `counselors_select_admin`, `counselors_modify_admin` |
| `partner_users` | `partner_users_select_admin`, `partner_users_modify_admin` |
| `employer_hiring_intents` | `employer_hiring_intents_select_admin` |
| `subgroups` | `subgroups_select_admin` |
| `invitations` | `invitations_select_admin` |
| `portal_workflow_events` | `portal_workflow_events_select_admin` |
| `resources` | `resources_modify_admin` |

**Recommendation:** Scope with `can_access_org_row` via join to `users.organization_id` or table `organization_id` before FORCE.

### `resources_select_all`

| policy_name | current_check | gap | recommendation |
|-------------|---------------|-----|----------------|
| `resources_select_all` | `get_current_user_id() IS NOT NULL` | **`'' IS NOT NULL`** → anonymous middleware allows global read under FORCE | Change to `NULLIF(get_current_user_id(),'') IS NOT NULL` |

### `milestone_cascades` (uses raw `current_setting`, not helpers)

| policy_name | current_check | gap | recommendation |
|-------------|---------------|-----|----------------|
| `milestone_cascades_select_system` | `current_setting('app.current_role', true) = 'system'` | Consistent with app | OK |
| `milestone_cascades_insert_system` | same | OK | OK |
| `milestone_cascades_update_system` | same | OK | OK |
| `milestone_cascades_*_admin` | `is_admin_for_member_data(user_id)` | Org GUC | Same as other member tables |

**Flip readiness (table):** **NOT READY** until org GUC fixed; system policies OK.

---

## RLS enabled but **no policies** (implicit deny under FORCE)

These tables have `ENABLE ROW LEVEL SECURITY` in `20260513040000_add_rls_policies` but **no `CREATE POLICY`** in any Prisma migration reviewed:

| Table | Flip readiness |
|-------|----------------|
| `courses` | **NOT READY** |
| `organization_program_catalog` | **NOT READY** |
| `employer_screening_packs` | **NOT READY** |
| `coursera_canonical_course_mappings` | **NOT READY** |
| `member_subgroups` | **NOT READY** |
| `subgroup_leaders` | **NOT READY** |

---

## Tables with **no RLS** (post–RLS-migration additions)

Should have member/org policies before multitenant FORCE flip:

| Table | Flip readiness |
|-------|----------------|
| `notifications` | **NOT READY** — no ENABLE |
| `member_feedback` | **NOT READY** |
| `webhook_events` | **NOT READY** (service/cron only — document or add `system` policies) |
| `feature_flags` | **NOT READY** |
| `email_templates` | **NOT READY** |
| `cron_executions` | **NOT READY** |
| `course_enrollments` | **NOT READY** — only legacy Supabase `auth.uid()` policies in `supabase/migrations/20260413183000_*.sql`, not GUC-aware |

---

## Supabase vs Prisma policy drift

`supabase/migrations/20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql` defines policies on `mentors`, `mentor_specialties`, `mentor_sessions`, `member_next_best_actions`, `course_enrollments` using **`auth.uid()`** (Supabase JWT), not `get_current_user_id()` GUCs.

Prisma migration `20260513040000` **replaces** `mentor_sessions` / `member_next_best_actions` policies with GUC-based rules; `mentors` / `mentor_specialties` / `course_enrollments` remain Supabase-only.

| Table | Flip readiness |
|-------|----------------|
| `mentor_sessions` | **CONDITIONAL** — GUC policies exist; ENABLE fixed in `20260514020000`; FORCE deferred |
| `member_next_best_actions` | **CONDITIONAL** — dual migration history; verify effective policy set in DB |
| `mentors`, `mentor_specialties` | **NOT READY** for Prisma FORCE — no GUC policies |
| `course_enrollments` | **NOT READY** |

---

## FORCE ROW LEVEL SECURITY inventory

| Migration | Action |
|-----------|--------|
| `20260513040000_add_rls_policies` | `FORCE` on 46 P0 tables + `mentor_sessions` |
| `20260514000000_defer_rls_force_authorize_system` | `NO FORCE` on same 46 tables |
| P2 (`organizations`, `audit_logs`, `user_roles`, `resources`, …) | **Never FORCED** in repo |
| `milestone_cascades` | ENABLE only, explicitly no FORCE |

---

## Member-scoped tables — flip readiness (batch)

Legend: **READY** = policies structurally OK after org GUC + transaction fixes; **NOT READY** = missing writes, no policies, or cross-tenant admin gap.

| Table | Verdict | Primary blocker |
|-------|---------|-----------------|
| `users` | NOT READY | Org GUC; no INSERT |
| `profiles` | NOT READY | Org GUC; SELECT-only for admin writes elsewhere |
| `applications` | NOT READY | No write policies |
| `placement_records` | NOT READY | No write policies |
| `organizations` | NOT READY | Org GUC / layout |
| `audit_logs` | NOT READY | No INSERT; org-scoped admin read |
| `goals` | CONDITIONAL | Write policies added `20260514020000`; org GUC |
| `job_applications` | CONDITIONAL | Has owner writes; org for admin |
| `pre_screening_responses` | NOT READY | `can_access_org_row`; admin only |
| `employers` / `jobs` / `partners` | NOT READY | `can_access_org_row` + admin scope gaps |
| `counselors` / `partner_users` | NOT READY | Admin policies not org-scoped |
| `courses` (+ 5 tables above) | NOT READY | RLS on, zero policies |
| `notifications` (+ 5 new tables) | NOT READY | No RLS |
| `milestone_cascades` | CONDITIONAL | System policies OK; admin needs org GUC |

---

## Pre-flip checklist (ordered)

1. **`app/layout.tsx`** — resolve `organizationId` like `resolveAuthGucContext()` (remove `orgId: null`).
2. **SQL** — `get_current_org_id()` / `get_current_user_id()` → `NULLIF(current_setting(...), '')` (or app never sends `''`).
3. **Scope admin policies** on `counselors`, `partner_users`, `subgroups`, `invitations`, `portal_workflow_events`, `employer_hiring_intents` with org checks.
4. **Add missing policies** — `applications_*` writes, `placement_records_*` writes, six ENABLE-only catalog tables, post-RLS tables (`notifications`, etc.).
5. **`resources_select_all`** — tighten anonymous guard.
6. **Wrap Prisma** — sensitive reads/writes in `$transaction` so GUCs stick under PgBouncer.
7. **Shadow test** — `scripts/p1/test-force-rls.ts` matrix green, then re-apply FORCE migration (reverse of defer section).

---

## References

- `prisma/migrations/20260513040000_add_rls_policies/migration.sql`
- `prisma/migrations/20260514000000_defer_rls_force_authorize_system/migration.sql`
- `prisma/migrations/20260514020000_rls_goals_writes_mentor_sessions_enable/migration.sql`
- `prisma/migrations/20260514040000_rls_milestone_cascades/migration.sql`
- `supabase/migrations/20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql`
- `lib/db/gucContext.ts`, `lib/db/prisma.ts`, `lib/auth/server.ts`, `app/layout.tsx`
- `docs/GUC-MIDDLEWARE.md`, `AUDIT-2026-05-16.md` §C-T6
