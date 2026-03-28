# WorkforceAP Technical Code Audit
**Date:** 2026-03-27  
**Auditor:** Forge ⚙️ (Developer Subagent)  
**Codebase:** `/home/claw/.openclaw/workspace/projects/workforceap-beta`  
**Stack:** Next.js 15 (App Router), TypeScript, Prisma, Supabase Auth, Groq AI, Vercel

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0       | 1     | Critical — must fix before production |
| P1       | 4     | High — significant risk, fix soon |
| P2       | 7     | Medium — quality/reliability issues |
| P3       | 4     | Low — cleanup / polish |

---

## P0 — Critical

### P0-1: Unauthenticated Email Trigger Endpoint
**File:** `app/api/apply/confirmation-email/route.ts`  
**Issue:** `POST /api/apply/confirmation-email` accepts any email address + name and triggers a transactional email send with zero authentication. No rate limiting, no CAPTCHA, no session check.  
**Risk:** Anyone can use this as an open email relay to spam arbitrary addresses with WorkforceAP-branded emails. Violates CAN-SPAM / email abuse policies and damages sender reputation.

```ts
// Current — no auth, no rate limit
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(body);
  // ... sends email to parsed.data.email
}
```

**Fix:** Add rate limiting (IP-based) at minimum. Preferably require session or a signed token tied to a real application submission:
```ts
const { success } = await checkRateLimit(request.ip ?? 'anon', 'confirmation-email', 5, '1h');
if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
```

---

## P1 — High

### P1-1: Missing npm Packages Causing TypeScript Build Errors
**Files:** Multiple  
**Issue:** `npx tsc --noEmit` produces 13+ errors from missing type declarations:
- `@sentry/nextjs` — missing (used in 7 files including `next.config.ts`, all error boundaries)
- `@marsidev/react-turnstile` — missing (used in `app/employers/EmployerContactForm.tsx`)
- `tailwindcss` — missing types (`tailwind.config.ts:1`)

**Specific errors:**
```
app/(portal)/dashboard/error.tsx(5,25): error TS2307: Cannot find module '@sentry/nextjs'
app/employers/EmployerContactForm.tsx(176,13): error TS2769: No overload matches this call
tailwind.config.ts(1,29): error TS2307: Cannot find module 'tailwindcss'
```

**Risk:** Sentry error boundary is silently broken — runtime errors are not being captured. Turnstile CAPTCHA on employer contact form has type errors that may cause runtime failures.

**Fix:**
```bash
npm install @sentry/nextjs @marsidev/react-turnstile tailwindcss
# or if dev deps:
npm install -D tailwindcss
```

---

### P1-2: ~38 API Routes Missing try-catch Error Handling
**Files:** (representative sample)
- `app/api/partner/referral-members/route.ts`
- `app/api/partner/milestones/route.ts`
- `app/api/partner/export/referrals/route.ts`
- `app/api/employer/applications/route.ts`
- `app/api/employer/jobs/[id]/matches/route.ts`
- `app/api/member/delete-account/route.ts`
- `app/api/member/resume/route.ts`
- `app/api/member/matched-jobs/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/jobs/[id]/route.ts`
- `app/api/jobs/route.ts`

**Issue:** Out of 144 API routes, 38 have no `try/catch`. Any DB error, network failure, or unexpected input will cause an unhandled 500 with a raw stack trace leaked to the client (in dev) or a blank error in production.

**Risk:** Prisma throws descriptive errors including table/column names on failure. These propagate to the client when uncaught.

**Fix pattern for all affected routes:**
```ts
export async function GET() {
  try {
    // ... existing logic
  } catch (err) {
    console.error('[route-name] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

Critical case — `member/delete-account` deletes user data with no error handling:
```ts
// Current (no try-catch):
await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });

// Fix:
try {
  await prisma.user.update(...)
  return NextResponse.json({ ok: true });
} catch {
  return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
}
```

---

### P1-3: Soft Delete Only on Account Deletion — No Supabase Auth Cleanup
**File:** `app/api/member/delete-account/route.ts`  
**Issue:** Account deletion only sets `deletedAt` on the Prisma `User` record. The Supabase Auth user is never deleted. The deleted user can still log in via Supabase credentials, and the session cookie remains valid.

**Risk:** "Deleted" users can re-enter the portal by logging in again. GDPR/privacy risk if deletion is treated as full erasure.

**Fix:**
```ts
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

// After soft-delete:
const admin = createSupabaseAdminClient();
await admin.auth.admin.deleteUser(user.id); // removes Supabase Auth record
```

---

### P1-4: `app/api/auth/me/route.ts` — No Error Handling Around Promise.all
**File:** `app/api/auth/me/route.ts`  
**Issue:** The route calls `Promise.all([getProfileRole, getPartnerForUser, isSuperAdmin, getEmployerAccountForNav])` with no try-catch. A failure in any of these DB calls will throw an uncaught 500. This endpoint is called on every page load for nav badge state.

**Risk:** Any DB hiccup causes entire portal navigation to fail for all authenticated users simultaneously.

**Fix:**
```ts
try {
  const [role, partnerCtx, superAdmin, employerNav] = await Promise.all([...]);
  // ... return
} catch (err) {
  console.error('[auth/me] error:', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

---

## P2 — Medium

### P2-1: Large Unoptimized Images in /public
**Files:** `public/images/`  
**Issue:** Multiple large images served as static files without Next.js `<Image>` optimization:
- `logo-tight.png` — 558KB (should be <50KB as SVG or WebP)
- `logo.png` — 443KB
- `hero-people.jpg` — 350KB

**Risk:** Significant LCP (Largest Contentful Paint) impact. Logo images loaded on every page at full size.

**Fix:** 
1. Replace PNG logos with SVG format (typically <5KB)
2. Convert `hero-people.jpg` to WebP: `cwebp -q 75 hero-people.jpg -o hero-people.webp`
3. Ensure all `<img>` tags rendering these use `next/image` with `width`/`height` or `fill` props

---

### P2-2: Minimal Dynamic Imports — Heavy Client Components Not Lazy Loaded
**Files:** Throughout `components/` and `app/`  
**Issue:** Only 2 `dynamic()` imports exist across the entire codebase (Turnstile and ScrollAnimations). Components like `EmployerJobsBoard.tsx` (1017 lines), `ApplicationTrackerTable.tsx` (530 lines), and `AssessmentForm.tsx` (367 lines) are bundled eagerly.

**Risk:** Large initial JS bundles slow TTI (Time to Interactive), especially on the portal dashboard which loads multiple heavy components.

**Fix:** Add `next/dynamic` for heavy portal-only components:
```ts
const EmployerJobsBoard = dynamic(() => import('@/components/employer/EmployerJobsBoard'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```
Priority targets: `EmployerJobsBoard`, `ApplicationTrackerTable`, `AssessmentForm`, `AdminJobReview`, `DashboardHomeClient`

---

### P2-3: `NEXT_PUBLIC_SITE_URL` Used in Server-Side API Routes
**Files:** Multiple API routes and lib files  
**Issue:** `NEXT_PUBLIC_SITE_URL` (a client-side env var) is used in server-side contexts: `app/api/admin/members/create/route.ts`, `app/api/admin/partners/[id]/invite/route.ts`, `app/api/invite/accept/route.ts`, `lib/email.ts`, `lib/notifications/partner-notify.ts`.

**Risk:** `NEXT_PUBLIC_` vars are embedded at build time. If the site URL changes between environments (dev/staging/prod), the server-side invite/reset links will point to the wrong URL. Should use a server-only `SITE_URL` env var for server code.

**Fix:** Add `SITE_URL` as a separate server-only env var and use it in API routes. Keep `NEXT_PUBLIC_SITE_URL` only for client components.

---

### P2-4: `apply/confirmation-email` and `jobs/route.ts` Have No Rate Limiting
**Files:** `app/api/apply/confirmation-email/route.ts`, `app/api/jobs/route.ts`  
**Issue (jobs):** Public job search endpoint has no rate limiting. Keyword search (`?q=`) triggers a `LIKE` query against the jobs table without LIMIT validation — `salaryMin`/`salaryMax` parsed via `parseInt` but no range validation.  
**Issue (confirmation-email):** Covered in P0-1 above.

**Fix:** Add IP-based rate limiting on public search endpoints. Cap `salaryMin`/`salaryMax` to valid ranges.

---

### P2-5: `OrgBrandingStyle` CSS Injection — Partially Validated
**File:** `components/platform/OrgBrandingStyle.tsx`, `lib/platform/defaultOrgTheme.ts`  
**Issue:** `orgAccentCss()` validates `primaryColor` as a hex color (`/^#[0-9A-Fa-f]{6}$/`), which is correct. However the injected CSS is:
```ts
`:root { --org-accent: ${accent}; --color-accent: ${accent}; }`
```
If `orgAccentCss` validation is ever bypassed or the regex extended, this is a CSS injection vector.

**Risk:** Currently safe due to strict hex regex. Flagged as a watchpoint — any relaxation of the validator (e.g., allowing named colors or HSL) must be re-reviewed.

**Fix:** No immediate change needed. Add a comment documenting the security dependency on the hex-only regex. Consider a CSP header for inline styles.

---

### P2-6: No Unit Tests for API Routes or Core Lib
**Files:** `tests/e2e/` (5 files), `emails/enrollment-confirmation.test.ts` (1 file)  
**Issue:** The entire `app/api/` directory (144 routes) and `lib/` have zero unit tests. Test coverage is limited to:
- 5 Playwright e2e specs (auth, member portal, signup, revenue flows)
- 1 email template unit test

Critical paths with no test coverage:
- Auth flow (`lib/auth/server.ts`, `lib/auth/roles.ts`)
- AI tool rate limiting (`lib/rate-limit.ts`)
- Job import/bulk parsing (`lib/employer/jobImportBulk.ts`)
- Automation rules engine (`app/api/cron/automations/route.ts`)
- Invite accept flow (`app/api/invite/accept/route.ts`)

**Fix:** Add Vitest for unit tests. Priority:
1. `lib/auth/roles.ts` — role resolution logic
2. `lib/rate-limit.ts` — rate limit correctness
3. `app/api/invite/accept/route.ts` — complex invite validation logic
4. `lib/employer/jobImportBulk.ts` — job parsing/sanitization

---

### P2-7: Missing error handling in `app/api/partner/milestones/route.ts`
**File:** `app/api/partner/milestones/route.ts`  
**Issue:** 100+ line handler iterates over member data and queries `prisma.memberEvent` — all without try-catch. Date parsing from query params (`new Date(from)`) with no validation: `new Date('invalid')` returns `Invalid Date` which propagates silently into queries.

**Fix:**
```ts
const fromDate = from ? new Date(from) : null;
if (fromDate && isNaN(fromDate.getTime())) {
  return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
}
```
Plus wrap entire handler in try-catch.

---

## P3 — Low

### P3-1: Console.log in Production Library Code
**File:** `lib/employer/triggerEmployerJobAiMatch.ts:35`  
```ts
console.log(`[employer_match_auto] jobId=${jobId} triggered matches=${count}`);
```
**Fix:** Replace with structured logger or remove. Use `console.info` sparingly or a proper logger lib.

---

### P3-2: GTM ID Hardcoded as Default in Layout
**File:** `app/layout.tsx:13`  
```ts
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-53JCT6WN';
```
**Issue:** GTM ID falls back to hardcoded value if env var is missing. Staging/preview deployments will fire real GTM events into the production analytics container.  
**Fix:** Remove default fallback. If `NEXT_PUBLIC_GTM_ID` is not set, skip GTM injection entirely:
```ts
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
// Only inject if GTM_ID exists
```

---

### P3-3: `wap_logo.jpg` and Cursor JSON Files in Project Root
**Files:** `wap_logo.jpg`, `cursor-api-payload*.json`, `cursor-prompt-*.md`, `cursor-sprint-*.md`  
**Issue:** Root directory contains 20+ cursor/sprint planning files and a loose `wap_logo.jpg`. These are not excluded from deployment and inflate build artifacts.  
**Fix:** Move to `docs/` or `artifacts/`. Add to `.vercelignore`:
```
cursor-*.json
cursor-*.md
wap_logo.jpg
```

---

### P3-4: `{console.error(e.message` — Corrupted File in Root
**File:** Root directory contains a file literally named `{console.error(e.message` (visible in `ls` output)  
**Issue:** Appears to be a corrupted/accidentally created file.  
**Fix:**
```bash
rm '/home/claw/.openclaw/workspace/projects/workforceap-beta/{console.error(e.message'
```

---

## Verified Safe (No Issues Found)

- **Auth guards on portal routes:** `middleware.ts` correctly redirects unauthenticated users from `/dashboard`, `/partner`, `/employer`, `/admin`, etc.
- **Cron route auth:** All 6 cron routes verify `CRON_SECRET` header before executing.
- **Admin routes:** Admin API routes correctly call `requireAdmin(user.id)` before DB operations.
- **AI routes:** All 9 AI tool routes verify session + rate limit before OpenAI/Groq calls.
- **CSS injection in OrgBrandingStyle:** Hex-only regex prevents CSS injection.
- **dangerouslySetInnerHTML usage:** All 4 instances use static/controlled content (GTM script, JSON-LD schema objects, theme CSS var). No user-controlled HTML.
- **Sensitive env vars:** `OPENAI_API_KEY`, `GROQ_API_KEY`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are all server-only (no `NEXT_PUBLIC_` prefix).

---

## Recommended Fix Order

1. **[P0-1]** Add rate limiting to `/api/apply/confirmation-email` — 30 min
2. **[P1-1]** `npm install @sentry/nextjs` to restore error monitoring — 15 min
3. **[P1-3]** Add Supabase Auth deletion to delete-account route — 30 min
4. **[P1-4]** Wrap `auth/me` Promise.all in try-catch — 10 min
5. **[P1-2]** Batch add try-catch to 38 API routes — 2 hrs (can use sed/script)
6. **[P2-1]** Optimize logo images to SVG/WebP — 1 hr
7. **[P2-3]** Separate `SITE_URL` from `NEXT_PUBLIC_SITE_URL` — 1 hr
8. **[P3-4]** Remove corrupted root file — 5 min
9. **[P3-3]** Add cursor/sprint files to `.vercelignore` — 10 min

---

*Audit complete. 144 API routes scanned, 5 e2e tests reviewed, all components and lib files analyzed.*
