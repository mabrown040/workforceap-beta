# Security Audit (Raw Findings)

**Date:** 2026-05-12
**Scope:** WorkforceAP codebase (`/home/mike/.openclaw-dench/workspace/wap-repo`)
**Method:** Static analysis — grep across ~327 API route files plus targeted reads of auth helpers, raw-SQL call sites, file uploads, webhooks, cron handlers, and member-scoped `[id]` routes.

Severity: **critical** = exploitable now / data loss; **high** = exploitable with effort or significant blast radius; **medium** = defense-in-depth gap or limited exposure; **low** = hardening recommendation.

---

## Findings

### MEDIUM-1 — Non-constant-time webhook secret comparison
- **File:** `app/api/webhooks/learning-completion/route.ts:8`
- **Issue:** `if (secret !== process.env.WEBHOOK_SECRET)` uses native string `!==`, which short-circuits on first byte mismatch. An attacker with network-timing visibility could iterate the secret one byte at a time. The codebase already has the right primitive (`crypto.timingSafeEqual` is used in `lib/coursera/webhookAuth.ts` and `lib/xapi/token.ts`), so this is an inconsistency.
- **Also:** Secret is read from request **body**, not a header. Bodies are easier to log, easier to reflect in error messages, and are not what most webhook providers send. Header-based shared-secret is more conventional.
- **Fix:** Move secret to `x-webhook-secret` header (or `Authorization: Bearer`). Compare with `timingSafeEqual(Buffer.from(provided), Buffer.from(expected))` after a length pre-check. Pattern already exists in `lib/coursera/webhookAuth.ts`.

### MEDIUM-2 — Counselor placements POST trusts body `userId` without org-scope check
- **File:** `app/api/counselor/placements/route.ts:60-80` (POST handler)
- **Issue:** Handler verifies caller is `admin || counselor`, then reads `userId` from request body and writes a `placement_records` row for that member. There is no check that the target `userId` belongs to a member the counselor is permitted to manage (e.g. same org / same caseload). A counselor in one org can create placement records pointing at any member in the database.
- **Fix:** After role check, call `assertStaffCanAccessMemberRecord(staffUserId, body.userId)` (or equivalent) — the helper already exists and is used in `app/api/counselor/remind-member/route.ts`.

### MEDIUM-3 — Several `userId`-from-body endpoints depend solely on the role gate
- **Files:**
  - `app/api/admin/coursera/map-unmatched/route.ts:21-40` — admin-only, but accepts arbitrary `userId` from body and binds it to a Coursera identity. Admin is the right gate, but admin actions like this should be audit-logged with the actor and target user. (Spot check did not find an audit-log write here.)
  - `app/api/admin/coursera/mappings/route.ts` — same shape.
- **Fix:** Add audit log entries for identity-mapping mutations (actor, target, before/after). Optional: confirm target `userId` exists and is a member, return 404 otherwise.

### MEDIUM-4 — Tenant isolation needs targeted sweep (not done in this pass)
- **Issue:** App is multi-tenant via `orgId`/`organizationId`. A grep confirmed `orgId` is referenced in `where|filter|select` clauses across the codebase, but per-route verification that every member-data read filters by the caller's org was not feasible inside the time budget. Routes most worth a hand audit:
  - `app/api/admin/members/at-risk/route.ts` (uses `requireAdminOrCounselor` — does it scope by org?)
  - `app/api/employer/jobs/[id]/matches/[studentId]/route.ts:21` — cross-references a student to a job; needs both employer-owns-job and member-opted-in checks.
  - `app/api/subgroup/dashboard/route.ts:9`, `app/api/subgroup/members/[id]/route.ts:13` — subgroup scoping.
- **Fix:** Add a focused pass that, for each member-data read, asserts `where.orgId === session.orgId` (or equivalent). Consider a Prisma extension that refuses queries on tenant tables without an `orgId` filter.

### LOW-1 — Employer logo upload uses extension from user-supplied filename for storage path
- **File:** `app/api/employer/logo/route.ts:27-32`
- **Issue:** Extension is parsed from `file.name` and only validated against an allowlist of safe extensions, then used as `${employerId}/logo.${ext}`. Allowlist makes path traversal infeasible (`png|jpg|jpeg|webp|svg|gif`), but `svg` is uploaded to a public bucket and SVGs can carry inline `<script>`. If the bucket is served with `Content-Type: image/svg+xml` from the same origin as the app, this is stored XSS.
- **Fix:** Either (a) drop `svg` from the allowlist, (b) re-encode SVG through a sanitizer (e.g. DOMPurify with SVG profile) before upload, or (c) ensure the storage CDN serves user uploads from a separate origin with `Content-Disposition: attachment` and a strict CSP.

### LOW-2 — Resume upload `ext` derived from user filename
- **File:** `app/api/member/resume/upload/route.ts:42-49`
- **Issue:** `validateFileType(buffer, mime, name)` (magic-byte check) is correctly applied first — good. The derived `ext` is then appended to the storage path. Path traversal not possible (last `.` segment after split + bucket-rooted path), and the bucket is documented as private. No action needed; documenting the chain because it's a common foot-gun shape.

### LOW-3 — `dangerouslySetInnerHTML` audit
- **Files:** `components/JsonLdFAQPage.tsx`, `components/JsonLdCourse.tsx`, `components/JsonLd.tsx`, `components/theme/ThemeInitScript.tsx`, `components/platform/OrgBrandingStyle.tsx`, `app/layout.tsx` (GTM + service worker), `app/leadership/page.tsx`, `app/apply/page.tsx`, `app/faq/FAQContent.tsx`, `app/(portal)/dashboard/counselor/page.tsx`.
- **Issue:** All instances are static/controlled: JSON-LD via `safeJsonLdStringify`, inline `<style>` blocks with literal CSS, GTM bootstrap, service-worker registration, and `OrgBrandingStyle` (which interpolates org-controlled brand color tokens — only a problem if an org's color value is unsanitized free text). Existing audit `artifacts/audit-master-2026-03-27.md:142,198` already cleared these.
- **Fix:** Confirm `OrgBrandingStyle` source values are validated as CSS color tokens (hex / rgb / hsl / named color), not arbitrary strings. If not, an org admin could inject `}</style><script>` via a brand color field.

### LOW-4 — SQL injection: not present, but two patterns to keep an eye on
- **Files:** `lib/xapi/mappings.ts`, `lib/swarm/taskQueue.ts`, `lib/coursera/csvImport.server.ts`, `lib/counselor/counselorStudentsRoster.ts`, `lib/counselor/triageFlags.ts`, `lib/counselor/commandCenter.ts`, `app/api/counselor/placements/route.ts:53`.
- **Result:** Every `$queryRawUnsafe` / `$executeRawUnsafe` call I read passes the SQL as a constant string and feeds variable values via `$1, $2, ...` parameterization (or in the case of `mappings.ts`, the SQL contains no user input — table DDL only). **No SQL injection sinks identified.**
- **Hardening:** Prefer `prisma.$queryRaw` (tagged template — never accepts string concatenation) over `$queryRawUnsafe` for new code. Add an ESLint rule that flags `$queryRawUnsafe` to prevent future regressions.

### LOW-5 — `NEXT_PUBLIC_` exposure review
- **File:** `.env.example`
- **Result:** All `NEXT_PUBLIC_` vars are intentionally public values: Supabase project URL + anon key, site URL, GTM ID, Sentry DSN, Turnstile **site** key, ElevenLabs **voice IDs**, captcha-enabled flag. The Supabase **service role** key is `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) — correct. Cron, webhook, Resend, ElevenLabs, Turnstile **secret**, Vercel token, placement-survey signing secret are all server-only — correct. **No secret leakage detected.**

### LOW-6 — Public POST endpoints by design (rate-limited)
- **Files:** `app/api/contact/route.ts`, `app/api/apply/confirmation-email/route.ts`, `app/api/careers/recommend/route.ts`, `app/api/apply/signup/route.ts`, `app/api/apply/status-lookup/route.ts`, `app/api/auth/forgot-password/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/setup-mfa/route.ts`, `app/api/auth/verify-mfa/route.ts`, `app/api/employer/signup/route.ts`, `app/api/member/signup/route.ts`, `app/api/partner/signup/route.ts`, `app/api/invite/accept/route.ts`, `app/api/public/wioa-qualification/**`, `app/api/placement-survey/route.ts`.
- **Result:** All have rate limits via `checkXxxRateLimit(ip)`. Forms with a captcha guard (`contact`) gate on `NEXT_PUBLIC_CAPTCHA_ENABLED` + Turnstile verify. `forgot-password` correctly returns a uniform message regardless of account existence (no enumeration). `placement-survey` uses a signed token (`verifyPlacementSurveyToken`) instead of trusting body `userId` — good.
- **Hardening:** Confirm `NEXT_PUBLIC_CAPTCHA_ENABLED=true` in production env (the code path is correct, but the flag has to be on).

### LOW-7 — Cron route auth
- **File:** `lib/cron/authorizeCronRequest.ts`, `lib/cron/withCronLogging.ts`
- **Result:** All cron routes wrap handlers with `withCronLogging`, which calls `authorizeCronRequest`. Default policy requires `CRON_SECRET` via `Authorization: Bearer` or `x-cron-secret`. The `allowVercelUserAgent` flag is documented as "do NOT enable for routes that send email or mutate user state" — should be spot-checked across every cron route to confirm no email-sending cron has the flag enabled. Worth a 30-minute follow-up grep: `rg "allowVercelUserAgent\s*:\s*true" app/api/cron`.

### LOW-8 — CSRF
- **Result:** App Router uses cookie-based session via Supabase; mutating routes accept JSON bodies. Without explicit `Origin` / `Sec-Fetch-Site` checks or CSRF tokens, classic CSRF is mitigated mostly by SameSite cookie defaults (Lax) and by the fact that requests post `Content-Type: application/json` (which is not a "simple" CORS request and triggers preflight). For this app and threat model, that is acceptable. Worth verifying Supabase session cookies are `SameSite=Lax` or `Strict` and not `None`.

### LOW-9 — IDOR sweep result
- **Member `[id]` routes audited** (`app/api/member/applications/[id]/messages`, `app/api/member/job-applications/[id]`, `app/api/member/goals/[id]`, `app/api/member/nba/[id]`): all correctly filter `where: { id: params.id, userId: user.id }`. Good pattern, should be the standard.
- **One to verify:** `app/api/admin/partners/[id]/invite/route.ts` reads a `userId` (param vs. body unclear from grep) — confirm admin scope enforces partner ownership where relevant.

---

## What I Did Not Audit (gaps for next pass)

1. **Per-route `orgId` filtering** for every member-data read (see MEDIUM-4).
2. **Audit logging** coverage on admin mutations (identity mappings, role changes, deletions).
3. **Supabase RLS policies** — out of scope for code grep; needs a Supabase Studio review.
4. **GDPR routes** (`app/api/gdpr/{export,delete,consent}`) — confirmed they call `getUser()` but did not verify scope/idempotency.
5. **xAPI auth deep dive** — `verifyXapiAccessToken` exists but I did not validate token issuance / rotation.
6. **Subgroup routes** (`app/api/subgroup/**`) — confirmed they have `getUser()` but did not verify membership scoping.
7. **Confirm captcha flag is on in production**: `NEXT_PUBLIC_CAPTCHA_ENABLED=true` in Vercel Production env.

---

## Summary

**No critical or high-severity findings.** The codebase is in better shape than the route count would suggest — auth helpers are consistent (`getUser` + role gates), raw SQL is parameterized, file uploads validate magic bytes, sensitive crypto comparisons (Coursera webhook, xAPI token) use `timingSafeEqual`, and public endpoints are uniformly rate-limited.

**Top priorities to fix:**
1. **MEDIUM-1** — switch `learning-completion` webhook to header + `timingSafeEqual` (~15 min).
2. **MEDIUM-2** — add `assertStaffCanAccessMemberRecord` to `counselor/placements` POST (~10 min).
3. **MEDIUM-4** — schedule a focused per-route `orgId` sweep (~1 day).
4. **LOW-1** — drop SVG from employer logo allowlist or sanitize it (~30 min).
5. Add an ESLint rule banning new `$queryRawUnsafe` usage (~30 min).
