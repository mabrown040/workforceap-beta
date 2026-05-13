# RLS Audit Report — WorkforceAP Database

**Date:** 2026-05-11
**Scope:** All tables in the WorkforceAP Prisma schema (`prisma/schema.prisma`)
**Method:** Schema analysis + access-pattern review against API routes and auth helpers
**Auditor:** DenchClaut (autonomous security review)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total tables (excl. enums) | 55 |
| P0 — Critical (member PII / sensitive business data) | 42 |
| P1 — Important (org-scoped business data) | 8 |
| P2 — Reference / System (low sensitivity) | 5 |
| Already have RLS enabled | 5 |
| **P0 tables needing RLS** | **37** |

**Existing RLS:** 5 tables were enabled in `supabase/migrations/20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql`:
`mentors`, `mentor_specialties`, `mentor_sessions`, `member_next_best_actions`, `course_enrollments`.

**Gap:** No tenant-isolation (org-level) RLS exists. No role-based RLS exists for counselors, employers, or partners.

---

## Severity Definitions

| Level | Criteria |
|-------|----------|
| **P0** | Contains member PII, financial data, health/disability info, placement outcomes, counselor notes, or any data that would violate FERPA/WIOA if leaked cross-tenant |
| **P1** | Org-scoped business data (jobs, employers, partners, courses). Cross-tenant leak = competitive harm + breach of partner trust |
| **P2** | Reference data, public content, system config. Low blast radius if read across tenants |

---

## Table Inventory

### P0 — Critical (42 tables)

| # | Table | Ownership Model | Tenant Inheritance | Blast Radius |
|---|-------|-----------------|-------------------|--------------|
| 1 | `users` | `organization_id` + `id` (matches auth.uid) | Direct | All member data |
| 2 | `profiles` | `user_id` → `users` | Via `users` | Full PII (address, DOB, SSN-adjacent, veteran, disability, income) |
| 3 | `applications` | `user_id` → `users` | Via `users` | Member application history |
| 4 | `job_applications` | `user_id` → `users` | Via `users` | Member job search activity |
| 5 | `readiness_checklist` | `user_id` → `users` | Via `users` | Member readiness data |
| 6 | `benefit_requests` | `user_id` → `users` | Via `users` | Benefit eligibility signals |
| 7 | `program_change_requests` | `user_id` → `users` | Via `users` | Member program history |
| 8 | `learning_progress` | `user_id` → `users` | Via `users` | Learning progress |
| 9 | `goals` | `user_id` → `users` | Via `users` | Member goals |
| 10 | `resource_progress` | `user_id` → `users` | Via `users` | Resource usage |
| 11 | `member_events` | `user_id` → `users` | Via `users` | Activity tracking |
| 12 | `weekly_recaps` | `user_id` → `users` | Via `users` | Weekly summaries |
| 13 | `pathway_step_progress` | `user_id` → `users` | Via `users` | Pathway progress |
| 14 | `training_access_requests` | `user_id` → `users` | Via `users` | Training access |
| 15 | `ai_tool_results` | `user_id` → `users` | Via `users` | AI-generated content about member |
| 16 | `application_ai_feedback` | `user_id` → `users` | Via `users` | AI feedback |
| 17 | `user_certifications` | `user_id` → `users` | Via `users` | Certifications |
| 18 | `course_enrollments` | `user_id` + `organization_id` | Direct + Via `users` | Enrollment data |
| 19 | `course_progress` | `user_id` → `users` | Via `users` | Course progress |
| 20 | `member_program_progress` | `user_id` → `users` | Via `users` | Program progress |
| 21 | `pre_screening_responses` | `user_id` + `organization_id` | Direct + Via `users` | Screening answers |
| 22 | `pre_screening_drafts` | `user_id` → `users` | Via `users` | Draft screening |
| 23 | `counselor_assignments` | `member_id` + `counselor_id` | Via `users` | Staff-member relationships |
| 24 | `counselor_notes` | `member_id` + `author_id` | Via `users` | Sensitive counselor notes |
| 25 | `placement_records` | `user_id` → `users` | Via `users` | Placement outcomes (salary, employer) |
| 26 | `placed_outcomes` | `user_id` → `users` | Via `users` | Placement verification |
| 27 | `partner_referrals` | `partner_id` + `member_id` | Via `users` + `partners` | Referral linkage |
| 28 | `partner_outreach_logs` | `partner_id` + `member_id` | Via `users` + `partners` | Outreach records |
| 29 | `message_threads` | `member_id` / `employer_id` / `partner_id` | Via `users` / `employers` / `partners` | Chat threads |
| 30 | `messages` | `thread_id` → `message_threads` | Via `message_threads` | Chat messages |
| 31 | `job_posting_applications` | `student_id` + `job_id` | Via `users` + `jobs` | Job applications |
| 32 | `application_messages` | `application_id` → `job_posting_applications` | Via `job_posting_applications` | Application messages |
| 33 | `portal_workflow_events` | `employer_id` / `partner_id` | Via `employers` / `partners` | Workflow events |
| 34 | `ai_job_matches` | `student_id` + `job_id` | Via `users` + `jobs` | AI job matches |
| 35 | `member_next_best_actions` | `member_id` → `users` | Via `users` | Next best actions |
| 36 | `member_points` | `user_id` → `users` | Via `users` | Points balance |
| 37 | `points_transactions` | `user_id` → `users` | Via `users` | Points history |
| 38 | `at_risk_alerts` | `user_id` + `counselor_id` | Via `users` | At-risk alerts |
| 39 | `placement_surveys` | `user_id` → `users` | Via `users` | Survey responses |
| 40 | `testimonials` | `member_id` → `users` | Via `users` | Testimonials |
| 41 | `coursera_course_progress` | `user_id` → `users` | Via `users` | Coursera progress |
| 42 | `coursera_badge_progress` | `user_id` → `users` | Via `users` | Badge progress |
| 43 | `coursera_skillset_progress` | `user_id` → `users` | Via `users` | Skillset progress |
| 44 | `coursera_identity_mappings` | `user_id` → `users` | Via `users` | Identity mappings |
| 45 | `xapi_statements` | `actor_email` (indirect) | Via `users` (email match) | xAPI statements |
| 46 | `mentor_sessions` | `member_id` + `mentor_id` | Via `users` | Mentor sessions |

*Note: 5 of these already have RLS enabled from the April migration. The remaining 41 need new or extended policies.*

### P1 — Important (8 tables)

| # | Table | Ownership Model | Notes |
|---|-------|-----------------|-------|
| 47 | `employers` | `organization_id` + `user_id` | Employer profiles |
| 48 | `employer_hiring_intents` | `employer_id` → `employers` | Hiring intents |
| 49 | `jobs` | `organization_id` + `employer_id` | Job postings |
| 50 | `partners` | `organization_id` | Partner orgs |
| 51 | `partner_users` | `partner_id` + `user_id` | Partner portal users |
| 52 | `counselors` | `partner_id` + `user_id` | Counselor profiles |
| 53 | `subgroups` | `leader_id` + `partner_id` | Subgroups |
| 54 | `invitations` | `invited_by` + `partner_id` | Invitations |

### P2 — Reference / System (5 tables)

| # | Table | Notes |
|---|-------|-------|
| 55 | `organizations` | Org config — RLS useful but different pattern (super_admin sees all, org admins see own) |
| 56 | `roles` | System enum-like table — readable by all authenticated |
| 57 | `user_roles` | Role assignments — user-scoped |
| 58 | `resources` | Has `visibility_rule` — already filtered in app |
| 59 | `blog_posts` | Public content |
| 60 | `automation_rules` | System config |
| 61 | `employer_screening_packs` | System config |
| 62 | `courses` | Course catalog |
| 63 | `organization_program_catalog` | Org program catalog |
| 64 | `coursera_canonical_course_mappings` | Reference data |
| 65 | `onet_occupations` | Reference data |
| 66 | `onet_occupation_skills` | Reference data |
| 67 | `onet_occupation_tasks` | Reference data |
| 68 | `onet_occupation_tech` | Reference data |
| 69 | `onet_related_occupations` | Reference data |
| 70 | `career_program_mappings` | Reference data |
| 71 | `career_quiz_rules` | Reference data |
| 72 | `mentors` | Mentor profiles (already has RLS) |
| 73 | `mentor_specialties` | Mentor specialties (already has RLS) |
| 74 | `audit_logs` | Audit trail — append-only, read by admins |
| 75 | `partner_signup_requests` | Public signup form data |

---

## Policy Design

### Architecture

RLS serves as **Layer 3** defense in depth (see `docs/TENANT-ISOLATION.md`):
- Layer 1: Application-layer `withTenantScope`
- Layer 2: CI isolation tests
- **Layer 3: Postgres RLS**

### Policy Patterns

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| **Tenant Isolation** | All P0/P1 tables | `organization_id = current_setting('app.current_org_id')` or via FK join to `users` |
| **User Self-Access** | Tables with `user_id` / `member_id` | `user_id = current_setting('app.current_user_id')` |
| **Counselor Assignment** | Member data tables | `EXISTS (SELECT 1 FROM counselor_assignments WHERE counselor_id = ... AND member_id = table.user_id)` |
| **Employer Ownership** | Job + applicant tables | `employer_id = current_setting('app.current_employer_id')` |
| **Partner Ownership** | Referral + outreach tables | `partner_id = current_setting('app.current_partner_id')` |
| **Supabase Auth** | Tables accessed via Supabase client | `auth.uid()` (existing pattern) |

### Prerequisite: GUC Configuration

For RLS to work with Prisma direct connections, the application must set these GUCs before each query (or per transaction):

```sql
SET LOCAL app.current_user_id = '<uuid>';
SET LOCAL app.current_org_id = '<uuid>';
SET LOCAL app.current_role = 'member|admin|counselor|employer|partner|super_admin';
SET LOCAL app.current_employer_id = '<uuid>';  -- if role = employer
SET LOCAL app.current_partner_id = '<uuid>';   -- if role = partner
```

This requires a Prisma extension or middleware. **Do not enable RLS in production until the application sets these GUCs.**

---

## Gap Analysis

### Gaps in Existing RLS (from April migration)

1. **No org-scoped policies** — Existing policies use `auth.uid()` only; no tenant isolation
2. **No counselor access** — Counselors cannot see their assigned members' data via RLS
3. **No admin access** — Admins cannot see org data via RLS
4. **No employer/partner access** — Employer and partner portal data not covered
5. **GUC support missing** — No policies for Prisma direct connections

### Gaps in This Audit

1. **Performance impact** — Policies with EXISTS subqueries (counselor_assignments) need index verification
2. **Raw SQL bypass** — `$queryRawUnsafe` calls bypass Prisma middleware and may not set GUCs
3. **Super admin** — Cross-tenant access for super_admins requires special handling
4. **xapi_statements** — No direct `user_id` FK; linked by `actor_email` → `users.email`. RLS policy is heuristic
5. **Audit log writes** — Backend audit logging must bypass RLS or set appropriate GUCs

---

## Deployment Prerequisites

Before running the migration:

1. [ ] **Prisma extension** — Implement `prisma.$use` middleware or `$extends` that sets GUCs from session context
2. [ ] **Service role bypass** — Ensure cron jobs, webhooks, and backend mutators use a role that bypasses RLS (or set GUCs appropriately)
3. [ ] **Index verification** — Confirm `counselor_assignments(member_id, active)`, `users(organization_id)`, `jobs(employer_id)` indexes exist
4. [ ] **Staging test** — Run full integration test suite with RLS enabled
5. [ ] **Performance baseline** — Benchmark slow queries before/after RLS on representative datasets
6. [ ] **Rollback plan** — `ALTER TABLE ... DISABLE ROW LEVEL SECURITY; DROP POLICY ...;`

---

## Policy Count Summary

| Table Category | Tables | Policies per table (avg) | Estimated total policies |
|----------------|--------|-------------------------|------------------------|
| P0 member data (user_id tables) | 30 | 3-4 | ~100 |
| P0 linkage tables | 8 | 4-5 | ~35 |
| P1 org-scoped tables | 8 | 2-3 | ~20 |
| P2 system tables | 5 | 1-2 | ~8 |
| **Total** | **51** | | **~163** |

*Exact count depends on whether separate SELECT/INSERT/UPDATE/DELETE policies are needed vs. combined ALL policies.*

---

## Migration File

See `prisma/migrations/20260513040000_add_rls_policies/migration.sql` for the full implementation.

**Key design decisions:**
- `DROP POLICY IF EXISTS` + `CREATE POLICY` for idempotency
- Dual policies: `auth.uid()` for Supabase Auth + GUC-based for Prisma
- `FORCE ROW LEVEL SECURITY` on P0 tables to prevent table-owner bypass
- `NO FORCE ROW LEVEL SECURITY` on P2 tables to allow admin/migration tools
- Helper functions for common access checks (`is_admin_in_org`, `is_counselor_for_member`)

---

## Recommendations

1. **Phase 1 (immediate):** Enable RLS + tenant-isolation policies only. This gives 80% of the security value with minimal complexity.
2. **Phase 2 (after GUC middleware):** Enable user-level, counselor, employer, and partner policies.
3. **Phase 3 (after performance validation):** Add `FORCE ROW LEVEL SECURITY` to remaining P1 tables.
4. **Phase 4 (ongoing):** Every new table added to schema must include RLS enablement + policies in the same migration.

---

*Report generated: 2026-05-11*
*Next review: After migration deployment + 30-day stability period*
