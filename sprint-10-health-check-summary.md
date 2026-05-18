# Sprint 10: Public Health Check + Feature Flag Cleanup

## Part 1 — Public Health Check Endpoint (`app/api/health/route.ts`)

### Changes
- Replaced the broad dependency-report health endpoint with a focused, load-balancer-friendly check.
- Response shape now matches the spec:
  ```json
  {
    "status": "ok",
    "version": "abc123d",
    "timestamp": "2026-05-17T19:27:03.000Z",
    "checks": {
      "database": "ok",
      "redis": "skipped",
      "s3": "skipped"
    }
  }
  ```
- **Database check**: `prisma.$queryRaw` `SELECT 1`.
- **Redis check**: uses `@upstash/redis` `ping()` when `UPSTASH_REDIS_REST_URL` / `_TOKEN` are configured; otherwise `"skipped"`.
- **S3 check**: attempts a `HEAD` request on a well-known object when `S3_ENDPOINT` + `S3_BUCKET_NAME` (or AWS/R2 equivalents) are configured; otherwise `"skipped"`. Since the current codebase does not use S3 directly (uses Supabase Storage), this check will always be skipped until S3 env vars are added.
- **HTTP status**: `200` if the database is healthy; `503` if the database is down (critical check).
- **`?deep=true`**: includes `responseTimeMs` for every check that was executed.
- **5-second cache**: module-level in-memory cache prevents health-check spam from overwhelming the DB.
- **Auth**: none required — designed for load balancers and uptime monitors.
- **Rate limiting**: still enforced via existing `checkPublicHealthRateLimit`.
- **CORS**: still returns public CORS headers.

### Tests (`tests/api/health-check.spec.ts`)
- Re-wrote tests to match the new endpoint contract.
- 8 tests, all passing:
  1. Returns `ok` when DB healthy and redis/s3 skipped.
  2. Returns `degraded` when redis is configured but unreachable.
  3. Returns `503` / `fail` when database is down.
  4. Returns `429` when rate limited.
  5. Includes `responseTimeMs` when `deep=true`.
  6. Returns `local` version when not on Vercel.
  7. Returns `max-age=5` cache header.
  8. `OPTIONS` returns `204` with CORS headers.

## Part 2 — Feature Flag Cleanup

### Method
1. Searched the entire codebase for env-based feature flags:
   - `process.env.FEATURE_*`
   - `process.env.BETA_*`
   - `process.env.EXPERIMENTAL_*`
   - `process.env.DISABLE_*`
   - `isBeta`, `enableFeature()`, `featureFlag`, `betaFlag`, `toggleFeature`
2. Searched for hardcoded `const X = true/false` module-level booleans.
3. Searched for `if (true)` / `if (false)` dead branches.
4. Inspected the DB-driven feature-flag system (`lib/feature-flags`, `hooks/useFeatureFlag.ts`, `app/admin/feature-flags`).

### Findings
| Flag / Toggle | Location | Status | Action |
|---------------|----------|--------|--------|
| `NEXT_PUBLIC_WIOA_ENABLED` | `lib/nav/portalNav.ts`, `LearningHubDestinationCards.tsx` | **Needed** | Keep — controls WIOA program visibility. |
| `NEXT_PUBLIC_CAPTCHA_ENABLED` | `app/api/contact/route.ts`, `EmployerContactForm.tsx`, `app/api/health/route.ts` (old) | **Needed** | Keep — controls Cloudflare Turnstile. |
| `STAFF_MFA_ENFORCEMENT` | `lib/auth/mfaConfig.ts` | **Needed** | Keep — controls mandatory staff MFA. |
| `ENABLE_ANALYTICS_LOGS` | `lib/analytics/track.ts` | **Needed** | Keep — controls xAPI batch logging verbosity. |
| `ADMIN_MATCH_SUGGESTIONS_DRY_RUN` | `lib/admin/matchSuggestionsConfig.ts` | **Needed** | Keep — dry-run mode for match-suggestion emails. |
| `SEED_DEMO` | `prisma/seed-demo.ts` | **Needed** | Keep — dev/staging demo data seed. |
| `SEED_TEST_ACCOUNTS` | `prisma/seed.ts` | **Needed** | Keep — dev/staging QA account seed. |
| `WORKFORCEAP_FORCE_DB_BUILD` | `lib/db/optionalBuildDb.ts` | **Needed** | Keep — forces Prisma migrate on startup. |
| DB-driven flag system (`prisma.featureFlag`, `useFeatureFlag`, admin UI) | `lib/feature-flags/`, `hooks/useFeatureFlag.ts`, `app/admin/feature-flags/` | **Needed** | Keep — clean infrastructure, no consumers yet but ready for gradual rollouts. |

### Result
**No dead flags found.** The codebase does not contain any always-true or always-false env toggles, hardcoded feature branches, or unused beta wrappers. The existing toggles are all actively used and justified. The DB-driven flag system is well-isolated and should remain.

## Pre-existing test noise
- `tests/api/admin-health.spec.ts` has 3 failing tests unrelated to this PR (pre-existing — tests `/api/admin/health` which is a separate route).

## Commits
- `health endpoint refactor` — `app/api/health/route.ts`
- `health tests refresh` — `tests/api/health-check.spec.ts`
