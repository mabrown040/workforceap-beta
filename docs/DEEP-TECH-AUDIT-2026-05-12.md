# Deep Technical Audit — WorkforceAP
**Date:** 2026-05-12
**Scope:** Security, Performance, Architecture
**Files Scanned:** 1,583 TypeScript/TSX files, 327 API routes

---

## Executive Summary

| Area | Grade | Critical Issues | High Issues | Medium Issues |
|------|-------|----------------|-------------|---------------|
| **Security** | B+ | 0 | 3 | 5 |
| **Performance** | B | 0 | 4 | 6 |
| **Architecture** | B+ | 0 | 2 | 4 |

**Bottom line:** The codebase is well-structured for a fast-moving nonprofit. Tenant isolation (`withTenantScope`) is thoughtfully designed, auth patterns are consistent, and rate limiting is deployed. The main risks are **unbounded `findMany` queries** (92 routes without pagination), **uneven tenant-scope adoption** outside member routes, and **missing try/catch in ~17 routes** that could leak raw error details or crash the Node process.

---

## 🔒 Security Audit

### What We Did Well

1. **Tenant isolation architecture** — `withTenantScope` is a well-designed Proxy-based defense that auto-injects `organizationId` into queries and fails loudly on scope violations. 48 routes use it.
2. **Middleware header sanitization** — Client-supplied `x-wap-org-id` and `x-wap-host` headers are deleted immediately before processing, preventing cache-poisoning / org-impersonation attacks.
3. **MFA enforcement** — Admin paths require AAL2 (MFA) when `isStaffMfaEnforcementEnabled()` is true, with a trust-device cookie for remembered devices.
4. **No raw SQL** — Zero uses of `$queryRaw`, `$executeRaw`, or `$queryRawUnsafe` in the API layer.
5. **No XSS vectors** — Zero uses of `dangerouslySetInnerHTML` in the codebase.
6. **Rate limiting deployed** — `lib/rate-limit.ts` is used on auth routes, AI routes, signup routes, and public APIs.
7. **Cron auth** — All cron routes wrap handlers with `withCronLogging`, which calls `authorizeCronRequest` verifying `CRON_SECRET` via `Authorization: Bearer` or `x-cron-secret` headers.
8. **Member IDOR prevention** — 31 member routes filter by `userId: user.id`, preventing cross-member data access.

### Issues Found

#### HIGH-1: Unbounded `findMany` queries across 92 API routes
**Severity:** High (DoS / memory exhaustion)
**Files:** 92 API routes including `app/api/admin/search/route.ts`, `app/api/counselor/members/[memberId]/messages/route.ts`, `app/api/partner/messages/route.ts`, `app/api/employer/messages/route.ts`, `app/api/(portal)/dashboard/jobs/route.ts`
**Issue:** None of the 92 `findMany` calls in API routes specify `take` / `skip` pagination. An admin with 10,000 members, or an employer with thousands of applications, could cause the Node process to OOM or the Vercel function to timeout.
**Fix:** Add pagination to all list endpoints. Client-facing routes should default to `take: 20` with `skip`/`cursor` support. Admin export routes should use streaming or batched queries.

#### HIGH-2: Partner / Employer routes bypass `withTenantScope`
**Severity:** High (cross-tenant data leak — conditional)
**Files:** `app/api/partner/*.ts`, `app/api/employer/*.ts` (multiple routes)
**Issue:** Partner and employer routes frequently use the raw `prisma` client instead of `withTenantScope`. While some routes filter by `partnerId` or `employerId` derived from the authenticated user, there is no centralized enforcement. A bug in a new route could easily omit the filter.
**Fix:** Migrate all partner/employer routes to `withTenantScope` or add an explicit `organizationId` filter to every query. Consider a lint rule banning raw `prisma` in role-scoped route directories.

#### HIGH-3: `app/api/admin/members/at-risk/route.ts` has PATCH without explicit auth in handler
**Severity:** High (auth bypass — mitigated by middleware)
**File:** `app/api/admin/members/at-risk/route.ts`
**Issue:** The PATCH handler does not call `getUser()` or role checks inside the route. The middleware does protect `/api/admin/*`, but if the middleware matcher is ever relaxed or bypassed (e.g., via a rewrite rule), this route becomes unprotected.
**Fix:** Add explicit `const user = await getUser(); if (!user || !(await isAdmin(user.id)))` guard inside the PATCH handler as defense-in-depth.

#### MED-1: AI routes lack cost limits / token caps
**Severity:** Medium (cost runaway)
**Files:** `app/api/ai/*` (15 routes)
**Issue:** AI routes use OpenAI/Anthropic but do not enforce max token limits or per-user daily quotas in code. Rate limiting exists but does not cap cumulative spend.
**Fix:** Add per-request `max_tokens` caps and per-user daily budget tracking (e.g., via `memberEvent` or Redis counter).

#### MED-2: File upload routes need stricter validation
**Severity:** Medium
**Files:** `app/api/member/resume/upload/route.ts`, `app/api/counselor/sessions/upload-resume/route.ts`, `app/api/admin/members/[id]/upload-resume/route.ts`
**Issue:** Need to verify MIME type whitelisting, file size caps, and path-traversal protection on filename handling.
**Fix:** Audit each upload route for explicit `content-type` whitelist (`application/pdf`, `application/msword`), max size check before streaming, and `path.basename()` sanitization.

#### MED-3: Some routes return raw error messages to client
**Severity:** Medium (info leak)
**Files:** Various — routes that catch errors and return `error.message` directly
**Issue:** A database error message could leak internal schema details (e.g., column names).
**Fix:** Return generic `{ error: 'Internal server error' }` in production and log the full stack server-side.

#### MED-4: `placement-survey/route.ts` (cron) uses `POST` without `withCronLogging`
**Severity:** Medium
**File:** `app/api/cron/placement-survey/route.ts`
**Issue:** The POST handler is a plain async function, not wrapped in `withCronLogging`. It may lack CRON_SECRET validation.
**Fix:** Wrap with `withCronLogging` or add explicit `authorizeCronRequest` call.

#### MED-5: Supabase `createServerClient` called on every request in middleware
**Severity:** Medium (cold-start / latency)
**File:** `middleware.ts`
**Issue:** `createServerClient` is instantiated for every request, including static assets. While the matcher excludes most static files, it still runs on all page navigations.
**Fix:** Already partially mitigated by `needsValidatedUser` gate. Could further optimize by skipping Supabase initialization for public marketing paths that don't need session data.

---

## ⚡ Performance Audit

### What We Did Well

1. **Database indexes** — 157 `@index` and 50 `@unique` declarations in `schema.prisma`. High-traffic tables (`User`, `JobApplication`, `MemberEvent`, `Application`) have indexes on `userId`, `status`, `createdAt`, and composite indexes.
2. **No circular dependencies** — `madge --circular lib/` returned zero circular imports.
3. **Clean imports** — No full `lodash` imports. No `import * as` anti-patterns.
4. **Prisma transactions** — Multiple routes use `$transaction` for multi-step writes (e.g., `app/api/member/enrollments/[id]/set-primary/route.ts`).

### Issues Found

#### HIGH-1: Zero `findMany` queries use pagination (`take`/`skip`)
**Severity:** High
**Scope:** 92 API routes
**Impact:** Unbounded list endpoints can return arbitrarily large datasets. On Vercel, this means >10s function timeouts or OOM kills.
**Fix:** Add pagination to every list API. Pattern:
```ts
const take = Math.min(Number(searchParams.get('limit') ?? '20'), 100);
const skip = Number(searchParams.get('offset') ?? '0');
const [items, total] = await Promise.all([
  prisma.x.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
  prisma.x.count({ where }),
]);
```

#### HIGH-2: Admin search and cohort-export queries unbounded
**Severity:** High
**Files:** `app/api/admin/search/route.ts`, `app/api/admin/cohort-export/route.ts`
**Issue:** These are admin-facing routes that could select thousands of rows. The export route streams a CSV but the underlying `findMany` is unbounded.
**Fix:** Add `take: 1000` with cursor-based pagination for exports, or use Prisma's `stream` API.

#### HIGH-3: N+1 query patterns in cron jobs
**Severity:** High (cron-induced DB load)
**Files:** `app/api/cron/partner-outcome-digest/route.ts`, `app/api/cron/coursera-sync/route.ts`, `app/api/cron/weekly-recap/route.ts`
**Issue:** Cron jobs iterate over large result sets and make inner queries per item. For example, partner digest fetches all partners, then per partner fetches referrals.
**Fix:** Use `include` or batch queries. For example:
```ts
const partnersWithReferrals = await prisma.partner.findMany({
  include: { referrals: { where: { createdAt: { gte: lastWeek } } } },
});
```

#### HIGH-4: Missing React `cache()` for repeated org lookups
**Severity:** Medium-High
**Scope:** Server components and API routes that call `resolveOrgFromRequest` or `getOrgFromRequest`
**Issue:** Multiple queries for the same org within a single request lifecycle hit the DB repeatedly.
**Fix:** Wrap org resolution in `cache()` (React server component cache) or use a request-scoped WeakMap.

#### MED-1: Middleware runs Supabase session check unnecessarily
**Severity:** Medium
**File:** `middleware.ts`
**Issue:** `supabase.auth.getSession()` is called for every non-protected path, even when the result is unused. On cold starts this adds 50–200ms.
**Fix:** Only call `getSession()` / `getUser()` when `needsValidatedUser` is true. Already partially done but `getSession()` still fires for public paths.

#### MED-2: No bundle analyzer configured
**Severity:** Medium
**File:** `next.config.ts`
**Issue:** No `@next/bundle-analyzer` integration. Hard to detect bundle bloat.
**Fix:** Add conditional bundle analyzer to build pipeline.

#### MED-3: `tsconfig.tsbuildinfo` is 989KB and committed
**Severity:** Low-Medium
**Issue:** A 989KB build cache file is in the repo root and likely tracked by git, bloating clones.
**Fix:** Add `*.tsbuildinfo` to `.gitignore` and `git rm --cached` the file.

#### MED-4: Cron jobs lack concurrency controls
**Severity:** Medium
**Scope:** All cron routes
**Issue:** If a cron job exceeds its interval (e.g., weekly recap takes >1 week), overlapping invocations can run simultaneously, causing duplicate emails.
**Fix:** Add a "running" flag in `WorkflowDiagnostic` or use a lightweight distributed lock (e.g., Redis `SETNX`).

---

## 🏗️ Architecture Audit

### What We Did Well

1. **Consistent auth patterns** — Almost every route follows `getUser()` → role check → business logic. `lib/auth/roles.ts` provides `isAdmin`, `isCounselor`, `isSuperAdmin`, `getEmployerForUser`, `getPartnerForUser`.
2. **Prisma schema discipline** — 867-line schema with proper `@relation`, `@index`, `@unique`, `@map`, and enums. Foreign key cascades are explicit.
3. **Test coverage exists** — 68 `.test.ts` files in `lib/`, plus 20 E2E/fixture files. Covers auth, AI parsing, counselor nudges, blog formatting.
4. **Zod validation** — Most POST/PATCH routes use Zod schemas for input validation.
5. **Observability** — `captureApiError` and `trackEvent` are imported across routes. Cron jobs log to `WorkflowDiagnostic`.

### Issues Found

#### HIGH-1: Inconsistent error response shapes
**Severity:** High (client fragility)
**Scope:** ~17 routes across member/admin/employer/partner APIs
**Issue:** Some routes return `{ error: string }`, some return `{ error: string, details: unknown }`, some return Zod validation errors in different shapes. The frontend must defensively parse multiple error formats.
**Fix:** Standardize on a single error schema, e.g.:
```ts
{ error: string; code: string; details?: unknown; status: number }
```
Add a `createApiError` helper in `lib/api/errors.ts`.

#### HIGH-2: 17 API routes lack try/catch
**Severity:** High (process crash / error leak)
**Files:** 9 member routes, 8 admin routes, plus misc
**Issue:** Unhandled Prisma errors (e.g., `P2025` not found, `P2002` unique constraint, `P2003` FK violation) bubble up as 500s with full stack traces in non-production or leak internal details.
**Fix:** Add a `withApiErrorHandling` HOF (higher-order function) that wraps all route handlers with a standard try/catch + logging + sanitized client response. Apply it globally or per-route.

#### MED-1: `any` types and `as` casts in API routes
**Severity:** Medium
**Scope:** Various routes
**Issue:** Some routes cast `req.json()` with `as` (e.g., `body = await req.json() as CheckpointBody`) instead of Zod parsing. This bypasses runtime validation.
**Fix:** Replace all `as` casts on request bodies with Zod `safeParse`.

#### MED-2: `lib/` is becoming a large flat namespace
**Severity:** Medium
**File:** `lib/` directory
**Issue:** `lib/` contains 100+ modules with no clear boundary between `lib/auth`, `lib/ai`, `lib/admin`, `lib/employer`, etc. As the team scales, this increases the risk of importing cross-domain logic improperly.
**Fix:** Enforce barrel exports (`index.ts`) per subdomain and add an ESLint rule restricting cross-domain imports (e.g., `lib/employer/*` cannot import `lib/admin/*`).

#### MED-3: Missing tests for critical auth and tenant paths
**Severity:** Medium
**Issue:** No unit tests for `withTenantScope`, `authorizeCronRequest`, or middleware auth flows. The most security-sensitive code is untested.
**Fix:** Add tests for `scopeProxy.ts` (tenant injection, violation detection), `authorizeCronRequest.ts` (secret matching, Vercel user-agent fallback), and middleware (header stripping, redirect logic).

#### MED-4: `app/api/(portal)/dashboard/jobs/*` routes may be redundant
**Severity:** Low-Medium
**Files:** `app/api/(portal)/dashboard/jobs/route.ts`, `app/api/(portal)/dashboard/jobs/[id]/route.ts`, `app/api/(portal)/dashboard/jobs/[id]/apply/route.ts`
**Issue:** These routes exist alongside `app/api/member/matched-jobs/route.ts` and employer job routes. Potential for divergent logic.
**Fix:** Document the intended consumer for each job route family and consider consolidation.

---

## Recommended Priority Order

### P0 — Fix This Week
1. **Add pagination (`take`/`skip`) to all 92 `findMany` API routes** — DoS risk.
2. **Add `withTenantScope` or explicit `organizationId` filters to all partner/employer routes** — Data isolation risk.
3. **Add try/catch + standardized error handler to the 17 unprotected routes** — Crash + info leak risk.

### P1 — Fix This Sprint
4. **Standardize error response shape** across all APIs.
5. **Add per-request token caps to AI routes**.
6. **Add concurrency locks to cron jobs**.
7. **Audit file upload routes** for MIME whitelist + size limits.

### P2 — Fix Next Quarter
8. **Add unit tests** for `withTenantScope`, `authorizeCronRequest`, middleware.
9. **Add bundle analyzer** to build pipeline.
10. **Refactor `lib/` into stricter domain boundaries** with import lint rules.

---

*Audit performed by DenchClaw on 2026-05-12. Subagents: 3 spawned (Security, Performance, Architecture), 2 completed, 1 timed out. Manual deep-dive filled gaps.*
