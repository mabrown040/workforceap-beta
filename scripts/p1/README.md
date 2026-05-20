# P1 FORCE RLS scripts

## `test-force-rls.ts`

One-shot audit that temporarily enables `FORCE ROW LEVEL SECURITY` on every
`public` table where `pg_class.relrowsecurity` is true, exercises representative
read/write queries under simulated GUC roles, then reverts with `NO FORCE` (unless
`--no-revert`).

### Targets

| Target | Env var | Report path |
|--------|---------|-------------|
| `shadow` (default) | `SHADOW_DATABASE_URL` | `docs/audits/p1-force-rls-shadow-results-{date}.md` |
| `staging` | `STAGING_DATABASE_URL` | `docs/rehearsals/p1-force-rls-staging-{date}.md` |

### Connection pattern

Mirrors local Prisma env loading (`.env` / `.env.local`) but **never** uses
`DATABASE_URL` as the run target.

| Variable | Required | Purpose |
|----------|----------|---------|
| `SHADOW_DATABASE_URL` | Shadow runs | Direct Postgres URL for the **shadow** Supabase project (session mode, port **5432**). |
| `STAGING_DATABASE_URL` | Staging runs | Direct Postgres URL for **staging** (must differ from prod and shadow). |
| `DATABASE_URL` | No | Prod guard — script exits `1` if it equals the active target. |
| `P1_STAGING_HOST_CONFIRMED` | Staging only | Set to `1` when staging hostname does not contain `staging`. |
| `P1_STAGING_PROJECT_REF` | Staging only | Expected Supabase project ref (alternative host guard). |

Optional fixture overrides (auto-discovered when unset):

- `P1_FIXTURE_ORG_X_ID`, `P1_FIXTURE_ORG_Y_ID`
- `P1_FIXTURE_MEMBER_USER_ID`
- `P1_FIXTURE_ADMIN_X_USER_ID`, `P1_FIXTURE_ADMIN_Y_USER_ID`

### Run

```bash
# Shadow (temporary FORCE, reverted)
export SHADOW_DATABASE_URL='postgresql://postgres.[ref]:[password]@....supabase.co:5432/postgres'
pnpm p1:test-force-rls

# Staging extended rehearsal (via orchestrator — preferred)
export STAGING_DATABASE_URL='postgresql://postgres.[staging-ref]:...@....supabase.co:5432/postgres'
pnpm p1:rehearse-staging
```

Direct script flags:

```bash
npx tsx scripts/p1/test-force-rls.ts --target=staging --extended
npx tsx scripts/p1/test-force-rls.ts --target=staging --extended --no-revert  # keep FORCE
```

### Extended fixtures (`--extended`)

- **system (cron):** `weekly_recaps`, `mentor_sessions` under `SYSTEM_GUC_CONTEXT`
- **sub-agent contexts:** admin/member with mismatched or null `orgId` GUC
- **multi-account routing:** employer GUC isolation across org X / org Y (`jobs`)
- **audit_events:** org-scoped reads (p1/audit-log)
- **coach_memories:** skipped automatically if table absent (r2)
- **jobs (EmployerJob):** employer-role reads when fixture data exists (r4 marketplace)

### Safety

- Exits `1` when target URL is missing or equals `DATABASE_URL`.
- Staging runs reject shadow/prod Supabase project refs.
- Always runs `NO FORCE` in `finally` unless `--no-revert`.

---

## `rehearse-force-rls-staging.sh`

End-to-end staging orchestrator:

1. Verifies `STAGING_DATABASE_URL` (not prod, not shadow)
2. Snapshots schema + RLS policies + sample row counts to `artifacts/p1-force-rls-staging-snapshot-{date}/`
3. Runs `test-force-rls.ts --target=staging --extended`
4. Writes/appends to `docs/rehearsals/p1-force-rls-staging-{date}.md`
5. On PASS + `--confirm-flip`, leaves `FORCE` applied permanently

```bash
pnpm p1:rehearse-staging          # rehearsal only (reverts FORCE)
pnpm p1:rehearse-staging:flip     # rehearsal + permanent FORCE if PASS
```

See `docs/rehearsals/p1-force-rls-runbook.md` for the full operator sequence.
