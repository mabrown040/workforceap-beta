# Postmortem: Portal-wide 504 outage — 2026-06-18

## Summary

For an extended window on 2026-06-18, the **public marketing site stayed up, but every authenticated portal page (`/admin`, `/dashboard`, `/counselor`, `/partner`, `/employer`) timed out and returned 504** — for all roles, not just one page. Login and `/api/health` kept returning 200/fast, which disguised the outage and sent the response down a multi-hour symptom-chasing path before the shared root cause was found.

The primary cause was a **per-query authentication round-trip introduced into the Prisma middleware (PR #1845)**: every database call inside a server render did a Supabase `auth.getUser()` network hop plus two DB transactions, and a page that fans out to 8+ queries blew past the 60s function timeout. Reverting it (`8d38aab`, PR #2048) restored the portal immediately. A cluster of secondary portal bugs (auth error-swallowing, super-admin view switching, and production schema drift) were uncovered and fixed in the same incident.

## Impact

- **Affected:** all authenticated users, all roles. Every portal *page* render 504'd.
- **Unaffected:** public marketing pages, `/api/health`, `/api/auth/login`, `/api/auth/me` — all stayed 200. This is exactly why the outage was mis-scoped as "just the dashboard" for hours.
- **User-visible:** portal pages hang ~60s then show a 504 / error boundary; for the demo super-admin account, view-switching into Member/Partner/Employer appeared broken.

## Root causes

### 1. PRIMARY — per-query GUC auth round-trip in the Prisma hot path (the 504s)

**PR #1845 (`b0cdcb514`, `lib/db/prisma.ts`)** added *lazy per-query GUC resolution*: when the request's GUC context (an `AsyncLocalStorage` value) was `null`, the Prisma middleware ran `await resolveAuthGucContext()` — a Supabase `auth.getUser()` network round-trip **plus two DB `$transaction`s** — **on every bare `prisma.*` call.**

The trap: **RSC page renders execute outside the root layout's `gucContextStorage.run()` scope**, so the context is *always* null inside a page component. Every query therefore fired the full round-trip. `/admin` fans out to 8+ queries → 8× (Supabase hop + GUC setup), serialized → past the 60s `maxDuration` → **504**.

Why the health signals lied:
- `/api/auth/me` and `/api/health` use `withApiGuc`, which sets the ALS context **once** up front → the lazy path is skipped → they stayed fast.
- The database was genuinely healthy; there were simply 8–40× too many round-trips per page request.

**Fix:** `git revert b0cdcb514` → **PR #2048 (`8d38aab`)**, restoring the anonymous-GUC fallback when context is null. Later **`f6ec4d5`** disabled the non-load-bearing GUC layer entirely. Zero security impact: the GUC is fail-open and not load-bearing for authz (RLS enabled but not forced; the app connects as table owner — per the code's own comment).

### 2. Auth hardening swallowed Next.js framework control flow

PR #2046 made real Supabase auth failures fail *closed*, but its broad `catch` also captured Next.js framework signals such as `DYNAMIC_SERVER_USAGE`, turning routing/render control-flow into spurious signed-out fallbacks and noisy build logs.

**Fix:** `e2f67d21` calls `unstable_rethrow(error)` before any fallback in `lib/auth/server.ts`, `lib/db/withRequestGuc.ts`, `app/api/auth/login/route.ts` (+ regression test).

### 3. Super-admin demo view-switching blocked by the member-dashboard guard

`/dashboard` redirected both `admin` and `super_admin` back to `/admin`, so the demo account's "Member Portal" switch looked broken.

**Fix:** `be7fc8d9` redirects only regular admins, letting super-admins render the member dashboard.

### 4. Production schema drift crashed Partner/Employer pages

`schema.prisma` expected `partners.onboarding_current_step` and `employers.onboarding_current_step`; the live Supabase project lacked both columns, so those overview pages threw server-side.

**Fix:** idempotent DDL applied to both projects + committed migration `20260618161000_add_portal_onboarding_current_step`.

## Timeline (commit-anchored, UTC)

- `b0cdcb514` (#1845) merged earlier — per-query GUC resolution lands. Portal page renders begin 504'ing; health/login stay green, so the outage reads as "dashboard slowness."
- Several symptom-fixes ship and deploy without resolving it: B4B fetch timeout (#2034), non-blocking Coursera (#2041), `maxDuration` raise (#2043), service-worker v8 (#2045).
- `2ad76696` (#2046) auth-hardening merges; build logs show repeated `Dynamic server usage`.
- `e2f67d21` — auth `unstable_rethrow` hotfix.
- **`8d38aab` (#2048) — #1845 reverted. Authed routes return 200/fast immediately.** Verified: `/admin` 1.07s, `/dashboard` 3.73s, `/counselor` 1.17s, `/partner` 0.74s, `/employer` 0.53s (all previously 504/60s).
- `f6ec4d5` — GUC layer disabled outright (defense-in-depth on cause #1).
- `be7fc8d9` — super-admin member-dashboard switch fix.
- Schema columns added to both Supabase projects; migration `20260618161000` committed (`279ae3b7`).
- Prod verified green on `af82662`: health ok, all authed routes 200, GUC guard clean.

## What went wrong (process)

1. **`/api/health` was treated as portal health — it isn't.** Health (and login) stayed 200 the entire outage because they set the auth context once, bypassing the broken per-query path. Hours were spent reporting "healthy" while every authed page was down.
2. **Symptom whack-a-mole.** Four fixes chased the dashboard/Coursera symptom. The tell that it was a *shared* cause, missed for too long: **`/admin` has no Coursera calls and 504'd identically.** When every authed route fails the same way, suspect shared middleware/layout/auth — not per-route data.
3. **Concurrent autonomous agents** (clawpatch, codex, jules, gate-merge) kept advancing `master` during response, cancelling CI/Vercel runs and obscuring which change fixed what.
4. **Schema drift** was invisible until a Postgres error surfaced — migration history did not guarantee the live DB matched `schema.prisma`.
5. **Error boundaries hid the server query failure** from the UI, slowing diagnosis of causes #3/#4.

## What worked

- Marketing and the Supabase auth API stayed healthy throughout.
- Vercel `get_runtime_logs` clearly showed "Vercel Runtime Timeout Error" 504s on the *page* routes (not API), pointing at render.
- A multi-agent fan-out (gstack repro + Prisma code-path read + Vercel/Sentry logs + shared-render-path analysis + prod re-test) pinned the exact `lib/db/prisma.ts` lines.
- **`curl` with a session cookie, timing each route**, was the cleanest repro — browser hangs are hard to read.

## Follow-up actions

### P0
- **Health-check the authed render, not just `/api/health`.** Add an authenticated smoke (super-admin) that logs in and asserts `/admin`, `/dashboard`, `/partner`, `/employer`, `/counselor` return 200 + fast, with no route error boundary. Wire it into post-deploy verification.
- **Schema-drift gate:** before promoting a deploy, compare required Prisma columns against the target Supabase DB.

### P1
- **Resolve GUC/auth context once per render, not per query** — this was #1845's legitimate goal (forced-RLS readiness). Re-implement by establishing context once for the RSC render, never lazily inside the Prisma middleware.
- Document an incident playbook for the agent swarm: during a P0, **one driver**; pause clawpatch/gate-merge auto-merge so `master` stops moving under responders.
- Minimal-query render tests for Partner/Employer pages covering missing optional columns.
- Surface `RouteErrorFallback` reference IDs in the UI → map to server logs/Sentry.

### P2
- **De-duplicate `/api/auth/me` reads** — a clean authed page load currently fires it ~4× plus duplicate `member/notifications` (tracked as TODO-087). Same family of "per-render work" pressure that made #1 catastrophic.

## Current status

**Resolved.** Latest `master` (verified green on prod) contains: revert of the per-query GUC round-trip, the GUC layer disable, the auth framework-error rethrow, the super-admin member-dashboard switch, and the onboarding-column migration. All authenticated routes return 200/fast; GUC guard confirms the per-query path has not been re-introduced.

> Single most important lesson: **never put an auth or network round-trip inside the per-query database path, and never trust `/api/health` as a proxy for whether the authenticated app actually renders.**
