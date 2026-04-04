# API authorization spot-check (sample)

**Scope:** Representative `app/api` routes were reviewed for the pattern: `getUser()` (or equivalent), then role check (`requireAdmin`, `isAdmin`, `isCounselor`, etc.) on state-changing or sensitive reads.

## Findings

1. **Admin routes** (e.g. `app/api/admin/members/route.ts`, `app/api/admin/members/[id]/pipeline-stage/route.ts`) consistently call `getUser()`, then `requireAdmin` / `isAdmin` before Prisma mutations.

2. **Member-scoped routes** (e.g. under `app/api/member/`) use `getUser()` and enforce ownership or membership via Prisma `where` clauses tied to `user.id`. Spot-check when adding new routes: avoid trusting client-supplied IDs without verifying they belong to the authenticated user.

3. **Middleware** (`middleware.ts`) redirects unauthenticated users away from portal paths but **does not replace** per-route authorization. APIs must still validate roles and resource ownership.

4. **Partner / employer / counselor** routes use role helpers (`getPartnerForUser`, employer account checks, `isCounselor`) in sampled files; extend the same pattern for new endpoints.

## Recommendation

When adding a new `POST`/`PATCH`/`DELETE` under `app/api/`, require: authenticated user, explicit role or ownership check, and rate limiting for auth-adjacent endpoints where already used (`checkAuthRateLimit`, `checkMessageRateLimit`).
