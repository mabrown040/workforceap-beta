# Postmortem: Portal auth and admin view outage — 2026-06-18

## Summary

On 2026-06-18, the public marketing site stayed available, but authenticated portal flows were degraded or unavailable across sign-in, dashboard access, and super-admin demo view switching. The outage was not one single bug; it was a stack of portal-only failures across auth hardening, Prisma/GUC request context, stale PWA cache behavior, and database schema drift.

By the end of the incident, login recovered, `/dashboard` loaded for the super-admin demo account, and admin view switching reached all portal views. Partner and employer view crashes were fixed by applying and committing the missing `onboarding_current_step` columns.

## Impact

- Affected: authenticated portal users, especially admin/super-admin workflows.
- Unaffected: public marketing pages and unauthenticated marketing navigation.
- Demo impact: `mabrown040@gmail.com` could sign in but could not reliably switch among Member, Partner, Employer, Counselor, and Admin views until the final fixes landed.
- User-visible symptoms:
  - Login/dashboard loops or generic portal errors.
  - Portal 504s and error boundaries.
  - Super-admin "Member" switch returning to Admin.
  - Partner and Employer overview pages showing "Something went wrong."

## Timeline

All times approximate, Central time unless noted.

- 15:16 — PR #2046 (`2ad76696`) merged: login handler moved to anonymous GUC context; Supabase auth failures fail closed instead of hard-crashing.
- 15:17–15:22 — Vercel build for `2ad76696` completed, but build logs showed repeated `[auth:getUser] ... Dynamic server usage` messages.
- 15:30–15:40 — Hotfix `e2f67d21` pushed to `master`: auth/GUC wrappers call `unstable_rethrow()` before treating errors as signed-out.
- 15:40–15:57 — `f6ec4d5c` and later `be7fc8d9` landed: non-load-bearing Prisma GUC behavior disabled, and super-admins allowed into `/dashboard` for demo view switching.
- 16:05–16:10 — Mobile screenshots confirmed Partner and Employer overview pages were still failing while Counselor loaded.
- 16:10 — Supabase Postgres logs showed `column partners.onboarding_current_step does not exist` and `column employers.onboarding_current_step does not exist`.
- 16:10–16:12 — Columns were added directly to both Supabase projects, and migration `20260618161000_add_portal_onboarding_current_step` was committed.
- 16:20+ — Latest `master` deploy verified green and includes the auth, switcher, and schema fixes.

## Root causes

### 1. Auth hardening swallowed Next.js framework control flow

PR #2046 correctly made real Supabase auth failures fail closed, but broad catches in auth-adjacent code also caught Next.js framework errors such as `DYNAMIC_SERVER_USAGE`. That made build/runtime diagnostics misleading and risked turning framework routing signals into signed-out fallbacks.

Fix: `e2f67d21` added `unstable_rethrow(error)` before fallback logging/returns in:

- `lib/auth/server.ts`
- `lib/db/withRequestGuc.ts`
- `app/api/auth/login/route.ts`
- regression coverage in `tests/lib/auth-server.test.ts`

### 2. Prisma request-context/GUC work amplified portal failures

Recent RLS/GUC work made portal render paths more sensitive to Prisma context and transaction behavior. During the incident, this contributed to portal 500/504 behavior and noisy auth/API paths.

Fixes:

- `8d38aab2` reverted lazy Prisma GUC resolution for RSC pages.
- `f6ec4d5c` disabled the non-load-bearing GUC layer to stop portal 504s.

### 3. Super-admin demo switching conflicted with member dashboard guard

The super-admin switcher included "Member Portal", but `/dashboard` redirected both `admin` and `super_admin` users back to `/admin`. That made the switcher appear broken for the demo account.

Fix: `be7fc8d9` changed `/dashboard` to redirect regular admins only, allowing super-admins to render the member dashboard for demos.

### 4. Production schema drift broke Partner and Employer overview pages

The Prisma schema expected:

- `partners.onboarding_current_step`
- `employers.onboarding_current_step`

The production/demo Supabase project did not have those columns. Partner and Employer overview pages selected those fields and crashed server-side.

Fix:

- Applied idempotent DDL to both Supabase projects.
- Committed `prisma/migrations/20260618161000_add_portal_onboarding_current_step/migration.sql`.

## What went well

- Marketing remained available.
- Supabase API/auth was healthy; `/auth/v1/user` returned 200s during validation.
- Once logs were inspected, the partner/employer failure had a clear SQL error.
- Direct `master` hotfixes deployed quickly once root causes were identified.

## What went poorly

- The outage was multi-cause, so each fix exposed the next failure.
- Vercel/GitHub runs were repeatedly cancelled because `master` advanced during incident response.
- Existing migration history did not guarantee the live database matched `schema.prisma`.
- Some portal error boundaries hid the exact server query failure from the UI.
- We lacked a one-command "admin demo smoke" covering every portal view.

## Verification performed

- Live health check returned `status: ok` with database `ok` on commit `f6ec4d5`.
- `/api/auth/me` returned 200 for unauthenticated users instead of 500.
- `/dashboard` unauthenticated redirect remained correct: `/en/login?redirectTo=%2Fdashboard`.
- Invalid login returned 401 with the expected generic error.
- Supabase confirmed `onboarding_current_step` exists on both `partners` and `employers` in both projects.
- CI/Vercel green on latest `master` after the member switch and schema fixes.

## Follow-up actions

### P0

- Add an authenticated Playwright "super-admin demo smoke" that verifies `/admin`, `/dashboard`, `/partner`, `/employer`, and `/counselor` render without route error boundaries.
- Add a schema drift check in CI/deploy that compares required Prisma columns against the target Supabase database before promoting.
- Add log surfacing for `RouteErrorFallback` reference IDs so the UI can map quickly to server logs/Sentry.

### P1

- Stop manually resolving migrations during Vercel builds except through an explicit incident playbook.
- Add a "portal overview minimal query" test for Partner and Employer pages, including missing optional onboarding/Stripe fields.
- Keep a seeded super-admin demo account contract documented: required roles, demo fallback partner, demo fallback employer, and expected switcher destinations.

### P2

- Reduce duplicate auth/session reads in shell components and `/api/auth/me`.
- Improve mobile portal error copy for staff/admin demos with actionable "report this reference" guidance.

## Current status

Resolved for the reported demo path. Latest master includes:

- auth framework rethrow fix,
- super-admin member-dashboard switch fix,
- partner/employer onboarding column migration,
- latest Vercel deployment green.
