# WorkforceAP Migration Runbook

**Repo:** `wap-repo` | **Last Updated:** 2026-05-13

Step-by-step guide for every pending migration. Read the full entry before running.

---

## Current Pending Migrations Inventory

| # | Migration | Date | Purpose | Risk | Prerequisites |
|---|-----------|------|---------|------|---------------|
| 1 | `20260512240000_fix_schema_drift` | 2026-05-12 | Add `last_login_at` to `users` | **Low** | None |
| 2 | `20260513000000_add_placement_survey_wave` | 2026-05-13 | Add `wave` enum + composite unique to `placement_surveys` | **Medium** | Backfill plan for existing rows |
| 3 | `20260513010000_add_at_risk_alert_notification_fields` | 2026-05-13 | Add `notified_counselor_at`, `escalated_at` to `at_risk_alerts` | **Low** | None |
| 4 | `20260513020000_add_org_white_label_fields` | 2026-05-13 | Add `accent_color`, `subscription_tier`, `subscription_status` to `organizations` | **Low** | None |
| 5 | `20260513030000_add_testimonial` | 2026-05-13 | Create `testimonials` table + enums + indexes | **Low** | None |
| 6 | `20260513040000_add_rls_policies` | 2026-05-13 | Enable RLS + policies on 50+ tables; FORCE RLS on P0 | **HIGH** | Prisma GUC middleware MUST be deployed first |
| 7 | `20260513110000_add_cron_execution` | 2026-05-13 | Create `cron_executions` table + indexes | **Low** | None |
| 8 | `20260513130000_add_performance_indexes` | 2026-05-13 | Add 8 composite indexes for dashboard/cron queries | **Low** | None |
| 9 | `20260513140100_add_feature_flags` | 2026-05-13 | Create `feature_flags` table + unique index | **Low** | None |

> **Total:** 9 pending migrations  
> **Blocked:** #6 (RLS) — see details below  
> **Code-only (no migration):** Member merge tool (already in `master`)

---

## Migration Details

### 1. `20260512240000_fix_schema_drift`

**Purpose:** Aligns schema with Prisma model by adding `last_login_at` timestamp to `users`.

**SQL:**
```sql
ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);
```

**Tables affected:** `users`

**Estimated downtime:** Zero (nullable column add, no rewrite).

**Rollback:**
```sql
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_at";
```

**Verification:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'last_login_at';
```

---

### 2. `20260513000000_add_placement_survey_wave`

**Purpose:** Supports multiple placement surveys per member (30/60/90-day waves).

**Tables affected:** `placement_surveys`

**Changes:**
- Creates `placement_survey_wave` enum: `thirty_day`, `sixty_day`, `ninety_day`
- Adds `wave` column with default `thirty_day`
- Drops old unique constraint on `user_id`
- Creates composite unique index on `(user_id, wave)`
- Ensures regular index on `user_id`

**Estimated downtime:** < 1 second (index rebuild on small table).

**Rollback:**
```sql
ALTER TABLE "placement_surveys" DROP COLUMN IF EXISTS "wave";
DROP TYPE IF EXISTS "placement_survey_wave";
-- Recreate old unique constraint if needed:
-- ALTER TABLE "placement_surveys" ADD CONSTRAINT "placement_surveys_user_id_key" UNIQUE ("user_id");
```

**Verification:**
```sql
SELECT * FROM placement_surveys LIMIT 1; -- confirm wave column present
SELECT indexname FROM pg_indexes WHERE tablename = 'placement_surveys';
```

**Risk note:** Existing rows get `thirty_day` default. If a member already has a survey and a new 30-day survey is created, the unique constraint will block duplicates — this is intentional.

---

### 3. `20260513010000_add_at_risk_alert_notification_fields`

**Purpose:** Tracks when at-risk alerts are acted upon by counselors or escalated.

**Tables affected:** `at_risk_alerts`

**Changes:**
- `notified_counselor_at` TIMESTAMPTZ
- `escalated_at` TIMESTAMPTZ

**Estimated downtime:** Zero.

**Rollback:**
```sql
ALTER TABLE "at_risk_alerts" DROP COLUMN IF EXISTS "notified_counselor_at";
ALTER TABLE "at_risk_alerts" DROP COLUMN IF EXISTS "escalated_at";
```

**Verification:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'at_risk_alerts' AND column_name LIKE 'notified%';
```

---

### 4. `20260513020000_add_org_white_label_fields`

**Purpose:** Supports org-level white-label branding and subscription tracking.

**Tables affected:** `organizations`

**Changes:**
- `accent_color` TEXT
- `subscription_tier` TEXT
- `subscription_status` TEXT DEFAULT 'trial'

**Estimated downtime:** Zero.

**Rollback:**
```sql
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "accent_color";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "subscription_tier";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "subscription_status";
```

**Verification:**
```sql
SELECT accent_color, subscription_tier, subscription_status
FROM organizations LIMIT 1;
```

---

### 5. `20260513030000_add_testimonial`

**Purpose:** New pipeline for collecting and publishing member testimonials.

**Tables affected:** `testimonials` (new), `users`

**Changes:**
- Creates `testimonial_source` enum: `SURVEY`, `MANUAL`, `INTERVIEW`
- Creates `testimonial_status` enum: `PENDING`, `APPROVED`, `REJECTED`, `PUBLISHED`
- Creates `testimonials` table with FKs to `users` (member_id, reviewed_by)
- Indexes: `member_id`, `status`, `source`

**Estimated downtime:** Zero (new table).

**Rollback:**
```sql
DROP TABLE IF EXISTS "testimonials";
DROP TYPE IF EXISTS "testimonial_status";
DROP TYPE IF EXISTS "testimonial_source";
```

**Verification:**
```sql
SELECT * FROM testimonials LIMIT 1;
```

---

### 6. `20260513040000_add_rls_policies` ⚠️ BLOCKED

**Purpose:** Defense-in-depth Row Level Security across all P0, P1, and P2 tables.

**Status:** **DO NOT DEPLOY YET**

**Why blocked:** The migration enables RLS and creates policies that depend on PostgreSQL GUCs (`app.current_user_id`, `app.current_org_id`, `app.current_role`) being set by the application. As of 2026-05-13, **no Prisma middleware sets these GUCs**. Deploying this migration before the middleware is live will cause **all queries to return empty result sets** for non-super-admin users.

**Tables affected:** 50+ tables (full list in migration file). Key tables:
- P0 (member data): `users`, `profiles`, `applications`, `job_applications`, `goals`, `course_progress`, `messages`, etc.
- P1 (business): `employers`, `jobs`, `partners`, `counselors`, etc.
- P2 (system): `organizations`, `user_roles`, `audit_logs`

**Estimated downtime:** < 5 seconds (policy creation is fast).

**Prerequisites (ALL must be met):**
1. [ ] Prisma middleware sets GUCs on every connection:
   ```ts
   // Required in lib/db/prisma.ts or middleware
   await prisma.$executeRaw`SET LOCAL app.current_user_id = ${userId}`;
   await prisma.$executeRaw`SET LOCAL app.current_org_id = ${orgId}`;
   await prisma.$executeRaw`SET LOCAL app.current_role = ${role}`;
   ```
2. [ ] Service-role connections (cron, webhooks) either bypass RLS or set GUCs appropriately.
3. [ ] Admin/counselor dashboards tested end-to-end with RLS enabled on staging.
4. [ ] `SUPABASE_SERVICE_ROLE_KEY` connections verified to bypass or set GUCs.

**Rollback:**
```sql
-- Disable RLS on all affected tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ... (repeat for all 50+ tables)

-- Drop all policies (optional — disabling RLS is enough to restore behavior)
DROP POLICY IF EXISTS "users_select_own" ON users;
-- ... (repeat for all policies)

-- Drop helper functions
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS get_current_org_id();
DROP FUNCTION IF EXISTS get_current_role();
DROP FUNCTION IF EXISTS is_current_admin();
DROP FUNCTION IF EXISTS is_current_super_admin();
DROP FUNCTION IF EXISTS is_counselor_for_member(TEXT);
DROP FUNCTION IF EXISTS is_admin_for_member_data(TEXT);
DROP FUNCTION IF EXISTS can_access_org_row(TEXT);
DROP FUNCTION IF EXISTS is_current_employer(TEXT);
DROP FUNCTION IF EXISTS is_current_partner(TEXT);
```

**Verification (after prerequisites met):**
```sql
-- Confirm RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'users';

-- Confirm policies exist
SELECT schemaname, tablename, policyname FROM pg_policies
WHERE tablename = 'users';

-- Smoke test: run a query as a member user via app connection
-- and confirm only own rows are returned.
```

**Deploy order:** This must be the **last** migration in the deploy batch, after code with GUC middleware is live.

---

### 7. `20260513110000_add_cron_execution`

**Purpose:** Observability table for tracking cron job runs.

**Tables affected:** `cron_executions` (new)

**Changes:**
- Creates `cron_executions` table: `id`, `job_name`, `status`, `started_at`, `completed_at`, `error_message`, `records_processed`, `duration_ms`, `created_at`
- Indexes: `(job_name, created_at)`, `(status, created_at)`, `(started_at)`

**Estimated downtime:** Zero.

**Rollback:**
```sql
DROP TABLE IF EXISTS "cron_executions";
```

**Verification:**
```sql
SELECT * FROM cron_executions LIMIT 1;
```

---

### 8. `20260513130000_add_performance_indexes`

**Purpose:** Quick-win composite indexes to cap unbounded dashboard queries and cron jobs.

**Tables affected:** `xapi_statements`, `goals`, `job_applications`, `ai_tool_results`, `counselor_assignments`, `messages`, `course_progress`

**Changes:**
| Index | Table | Columns |
|-------|-------|---------|
| `xapi_statements_processed_created_at_idx` | xapi_statements | `(processed, created_at)` |
| `goals_user_id_created_at_idx` | goals | `(user_id, created_at)` |
| `job_applications_user_id_created_at_idx` | job_applications | `(user_id, created_at)` |
| `job_applications_user_id_status_created_at_idx` | job_applications | `(user_id, status, created_at)` |
| `ai_tool_results_user_id_created_at_idx` | ai_tool_results | `(user_id, created_at)` |
| `counselor_assignments_member_id_active_assigned_at_idx` | counselor_assignments | `(member_id, active, assigned_at DESC)` |
| `messages_author_id_created_at_idx` | messages | `(author_id, created_at DESC)` |
| `course_progress_user_id_course_id_completed_at_idx` | course_progress | `(user_id, course_id, completed_at)` |

**Estimated downtime:** < 2 seconds per index (depends on table size; `messages` and `xapi_statements` may take longer).

**Rollback:**
```sql
DROP INDEX IF EXISTS "xapi_statements_processed_created_at_idx";
DROP INDEX IF EXISTS "goals_user_id_created_at_idx";
DROP INDEX IF EXISTS "job_applications_user_id_created_at_idx";
DROP INDEX IF EXISTS "job_applications_user_id_status_created_at_idx";
DROP INDEX IF EXISTS "ai_tool_results_user_id_created_at_idx";
DROP INDEX IF EXISTS "counselor_assignments_member_id_active_assigned_at_idx";
DROP INDEX IF EXISTS "messages_author_id_created_at_idx";
DROP INDEX IF EXISTS "course_progress_user_id_course_id_completed_at_idx";
```

**Verification:**
```sql
SELECT indexname FROM pg_indexes
WHERE indexname LIKE '%_idx' AND schemaname = 'public'
ORDER BY indexname;
```

---

### 9. `20260513140100_add_feature_flags`

**Purpose:** Runtime feature flag system for gradual rollouts and role-gated features.

**Tables affected:** `feature_flags` (new)

**Changes:**
- Creates `feature_flags` table: `id`, `key`, `name`, `description`, `enabled`, `rollout_percentage`, `allowed_roles`, `created_at`, `updated_at`
- Unique index on `key`
- Indexes on `enabled`, `key`

**Estimated downtime:** Zero.

**Rollback:**
```sql
DROP TABLE IF EXISTS "feature_flags";
```

**Verification:**
```sql
SELECT * FROM feature_flags LIMIT 1;
```

---

## Recommended Deploy Order

Run migrations in this sequence:

1. `20260512240000_fix_schema_drift` — Low risk, additive
2. `20260513000000_add_placement_survey_wave` — Medium risk (constraint change)
3. `20260513010000_add_at_risk_alert_notification_fields` — Low risk
4. `20260513020000_add_org_white_label_fields` — Low risk
5. `20260513030000_add_testimonial` — Low risk (new table)
6. `20260513110000_add_cron_execution` — Low risk (new table)
7. `20260513130000_add_performance_indexes` — Low risk (indexes only)
8. `20260513140100_add_feature_flags` — Low risk (new table)
9. **BLOCKED** `20260513040000_add_rls_policies` — Wait for Prisma GUC middleware

---

## Member Merge

**Status:** Code-only (no migration required).  
**Commit:** `ded54ec45` — `feat(admin): member merge tool with conflict detection, preview, and tests`  
**What it does:** Admin UI to merge duplicate member records with field-level conflict resolution.  
**Deploy note:** Merge the PR; no DB changes. Verify via admin panel → Members → "Merge Duplicates".

---

## Environment Variable Checklist

| Variable | Required For | Status |
|----------|--------------|--------|
| `CRON_SECRET` | All `/api/cron/*` endpoints | **MUST SET BEFORE DEPLOY** |
| `PLACEMENT_SURVEY_TOKEN_SECRET` | Placement survey email links | Verify set |
| `AUTH_TRUST_COOKIE_SECRET` | Staff MFA trust cookies | Verify set |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB ops | Verify set |
| `POSTGRES_PRISMA_URL` | Prisma connection pool | Verify set |
| `POSTGRES_URL_NON_POOLING` | Migrations + raw queries | Verify set |

---

## Related Docs

- `docs/DEPLOYMENT-CHECKLIST.md` — Full deploy ceremony
- `docs/ENVIRONMENT-VARIABLES.md` — Env var documentation
- `docs/TROUBLESHOOTING.md` — Common issues
- `docs/INCIDENT-RESPONSE-PLAN.md` — Escalation procedures
- `docs/RLS-AUDIT-REPORT-2026-05-11.md` — RLS design context
