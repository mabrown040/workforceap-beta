# WorkforceAP Production Deployment Checklist

**Repo:** `workforceap-beta` | **Branch:** `master` | **Last Updated:** 2026-08-30

Use this checklist for every production deploy. Do not skip steps.

---

## Pre-Deploy (Local)

- [ ] **Pull latest master**
  ```bash
  git pull origin master
  ```

- [ ] **Install dependencies**
  ```bash
  corepack pnpm@10 install --frozen-lockfile
  ```

- [ ] **Run TypeScript check**
  ```bash
  npx tsc --noEmit
  ```
  > Must pass zero errors. Do not deploy with type errors.

- [ ] **Run tests**
  ```bash
  npm run test:unit
  npm run test:vitest
  ```
  > Runs the Node.js unit lane and the Vitest component/API lane. Fix failures before deploy.

- [ ] **Run E2E tests (if changed areas covered)**
  ```bash
  npx playwright test
  ```

- [ ] **Review pending migrations**
  ```bash
  npx prisma migrate status
  ```
  > Read `docs/MIGRATION-RUNBOOK.md` for each pending migration. Confirm risk level and rollback plan.

- [ ] **Check environment variables**
  - [ ] `CRON_SECRET` is set in Vercel (Production)
  - [ ] `PLACEMENT_SURVEY_TOKEN_SECRET` is set
  - [ ] `AUTH_TRUST_COOKIE_SECRET` is set
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
  - [ ] `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` are set
  - [ ] All AI provider keys required for feature flags are set
  > Full reference: `docs/ENVIRONMENT-VARIABLES.md` and `.env.example`

- [ ] **Check Sentry for unresolved errors**
  - Open Sentry dashboard → Issues → filter `is:unresolved`
  - If new errors appeared since last deploy, assess before shipping

- [ ] **Check database connection pool**
  - Supabase Dashboard → Database → Connection Pooling
  - Confirm pool size adequate for migration + traffic spike

- [ ] **Verify no uncommitted changes**
  ```bash
  git status
  ```

---

## Deploy

- [ ] **Push to production branch**
  ```bash
  git push origin master
  # or via PR: merge to master, Vercel auto-deploys
  ```

- [ ] **Run Prisma migrations**
  ```bash
  npx prisma migrate deploy
  ```
  > Run against production database. Use Supabase SQL Editor if CLI access is restricted.

- [ ] **Verify Vercel build succeeds**
  - Vercel Dashboard → Deployments
  - Confirm green checkmark, no build errors

- [ ] **Check health endpoints** (contract: `docs/HEALTH-PROBES.md`)
  ```bash
  curl -sS https://www.workforceap.org/api/health
  curl -sS -o /tmp/ready.json -w "%{http_code}\n" https://www.workforceap.org/api/health/ready
  ```
  - Liveness (`/api/health`): `probe: "live"`, HTTP 200 — process up, **no** Prisma
  - Readiness (`/api/health/ready`): HTTP 200 and `status: "ok"` — Prisma + default org. **Page 504 / dependency alerts here**, not on liveness staying green.

- [ ] **Verify cron secrets are active**
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" \
    https://www.workforceap.org/api/cron/smoke-test
  ```
  > Should return HTTP 200 with `ok: true` and seven passing probes, not merely “not 401.” A failed readiness, public-page marker, timeout, or protected-route redirect returns 503, marks the cron execution failed, and reports a sanitized Sentry exception.

---

## Post-Deploy

- [ ] **Smoke test critical flows**
  - [ ] Homepage loads (public)
  - [ ] Member signup → login → dashboard
  - [ ] Admin login → member list → member detail
  - [ ] Job application submission (member)
  - [ ] Coursera training progress visible (if enrolled)
  - [ ] AI tools (gap analyzer, interview coach) respond
  - [ ] Email send (password reset or contact form)

- [ ] **Check error rates in Sentry**
  - Watch for 5xx spikes in first 15 minutes

- [ ] **Verify cron jobs are running**
  - Vercel Dashboard → Cron Jobs
  - Check last run times for:
    - `smoke-test` (hourly)
    - `deploy-health` (hourly)
    - `coursera-training-sync` (hourly)
    - `at-risk-check` (daily at 06:00 UTC, per `vercel.json`)
  - If `cron_executions` table exists, query:
    ```sql
    SELECT job_name, status, started_at
    FROM cron_executions
    ORDER BY started_at DESC
    LIMIT 20;
    ```

- [ ] **Check database connection limits**
  - Supabase Dashboard → Database → Connections
  - Ensure not near max (default 200 on Supabase)

- [ ] **Verify RLS is not breaking existing flows** (if RLS migration deployed)
  - Only deploy RLS **after** Prisma GUC middleware is live
  - See `docs/MIGRATION-RUNBOOK.md` → `20260513040000_add_rls_policies`

- [ ] **Announce deploy**
  - Post in internal channel: deploy SHA, migrations run, any known risks

---

## Rollback

If deploy fails:

1. **Revert code**: `git revert <sha>` or rollback in Vercel
2. **Assess migration reversibility**: Some migrations (enum changes, column drops) cannot be rolled back without data loss
3. **Database**: If schema change is breaking, restore from Supabase backup (taken daily at 00:00 UTC)
4. **Verify rollback**: Re-run health check + smoke tests

---

## Related Docs

- `docs/MIGRATION-RUNBOOK.md` — Per-migration details
- `docs/ENVIRONMENT-VARIABLES.md` — Full env var reference
- `docs/TROUBLESHOOTING.md` — Common issues
- `docs/INCIDENT-RESPONSE-PLAN.md` — Escalation procedures
