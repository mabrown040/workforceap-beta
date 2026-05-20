# P1 FORCE RLS — Staging rehearsal runbook

**Owner:** Mike  
**When:** End of week after P1 GUC fixes land on staging  
**Goal:** Prove `FORCE ROW LEVEL SECURITY` is safe on staging before production flip.

This runbook is copy-pasteable. Do **not** point these commands at production.

---

## Prerequisites

- [ ] Staging deploy has latest P1 migrations (including `audit_events` RLS).
- [ ] `STAGING_DATABASE_URL` in `.env.local` — **direct/session** Postgres URL (port **5432**, not pooler).
- [ ] `DATABASE_URL` in the same file points at **production** (used only as a guard).
- [ ] `SHADOW_DATABASE_URL` set if you use shadow (must differ from staging).
- [ ] `pg_dump` and `psql` available locally.
- [ ] Staging has ≥2 orgs with admin + member fixture data (or set `P1_FIXTURE_*` overrides).

Optional if staging hostname does not contain `staging`:

```bash
export P1_STAGING_HOST_CONFIRMED=1
# or
export P1_STAGING_PROJECT_REF=<staging-supabase-ref>
```

---

## 1. Preflight (5 min)

```bash
cd /path/to/wap-repo
git checkout growth/force-rls-staging-rehearsal   # or main after merge
git pull
pnpm install
pnpm typecheck
```

Verify env guards (should print staging host, not prod):

```bash
source .env.local 2>/dev/null || true
python3 - <<'PY'
import os, urllib.parse
def host(u):
    return urllib.parse.urlparse(u.replace("postgres://","postgresql://",1)).hostname
staging = os.environ.get("STAGING_DATABASE_URL","")
prod = os.environ.get("DATABASE_URL","")
assert staging, "STAGING_DATABASE_URL missing"
assert prod and staging != prod, "staging must differ from DATABASE_URL"
print("staging host:", host(staging))
print("prod host:", host(prod))
PY
```

Quick connectivity:

```bash
psql "$STAGING_DATABASE_URL" -c "SELECT current_database(), COUNT(*) FROM pg_policies;"
```

---

## 2. Rehearsal run (default — FORCE reverted)

```bash
export STAGING_DATABASE_URL='postgresql://postgres.<staging-ref>:<password>@<host>:5432/postgres'
# load other guards from .env.local as needed
pnpm p1:rehearse-staging
```

**Expected:**

- Snapshot written to `artifacts/p1-force-rls-staging-YYYY-MM-DD/`
- Report written to `docs/rehearsals/p1-force-rls-staging-YYYY-MM-DD.md`
- Console ends with `PASS` and `FORCE was reverted`
- Exit code `0`

**Review the report.** All non-skipped rows should be `PASS`. Skips are OK when fixture data is absent (e.g. no `coach_memories` until r2 merges).

---

## 3. Manual smoke (optional, 15 min)

While FORCE is **not** applied (after step 2), spot-check staging UI:

- Admin org A roster loads; org B data not visible
- Member dashboard loads own data
- Employer portal shows only own jobs
- Cron endpoint smoke (if safe on staging): one read-only cron with `CRON_SECRET`

Re-run rehearsal if code changed.

---

## 4. Permanent flip (only after clean PASS)

**Only run this when step 2 report verdict is PASS and you are ready to leave FORCE on staging.**

```bash
pnpm p1:rehearse-staging:flip
```

This re-runs extended fixtures and, on PASS, leaves `ALTER TABLE … FORCE ROW LEVEL SECURITY` applied on all RLS-enabled tables (`--no-revert`).

Confirm in SQL:

```bash
psql "$STAGING_DATABASE_URL" -c "
  SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  ORDER BY relname
  LIMIT 20;"
```

Repeat manual smoke (section 3). Leave staging in FORCE state for 24–48h before prod planning.

---

## 5. Rollback (staging)

If admin UI breaks or report shows unexpected FAILs after flip:

### A. Fast rollback — remove FORCE (keeps RLS policies)

```bash
psql "$STAGING_DATABASE_URL" -f - <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;
SQL
```

### B. Verify rollback

```bash
psql "$STAGING_DATABASE_URL" -c "
  SELECT COUNT(*) AS still_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity AND c.relforcerowsecurity;"
```

Expect `still_forced = 0`.

### C. Restore from snapshot (schema reference only)

Pre-rehearsal schema inventory:

```bash
ls artifacts/p1-force-rls-staging-snapshot-YYYY-MM-DD/
# schema.sql, rls-policies.tsv, sample-counts.tsv
```

Use `rls-policies.tsv` to diff policy drift; do **not** blindly restore `schema.sql` onto staging without review.

### D. Re-run rehearsal after fix

```bash
pnpm p1:rehearse-staging
```

---

## 6. What the extended fixtures cover

| Area | Tables / roles |
|------|----------------|
| Base matrix | `users`, `organizations`, `applications`, `placement_records`, `audit_logs` |
| Cron / system | `weekly_recaps`, `mentor_sessions` + `system` GUC |
| Sub-agent GUC bugs | admin/member with wrong or null `orgId` |
| Multi-account routing | `jobs` + employer GUC across org X / Y |
| Audit log (p1) | `audit_events` org-scoped reads |
| r2 optional | `coach_memories` (auto-skip if absent) |
| r4 marketplace | `jobs` employer reads |

---

## 7. Exit codes

| Code | Meaning |
|------|---------|
| `0` | PASS — fixtures match expectations |
| `1` | FAIL — review report, rollback if flipped, fix GUC/policies |

---

## 8. Never do on production

- Do not export production `DATABASE_URL` as `STAGING_DATABASE_URL`.
- Do not run `pnpm p1:rehearse-staging:flip` against prod.
- Shadow testing stays on `pnpm p1:test-force-rls` with `SHADOW_DATABASE_URL`.

---

_Last updated: 2026-05-19 — branch `growth/force-rls-staging-rehearsal`_
