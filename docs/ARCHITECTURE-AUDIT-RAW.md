# WAP Architecture Audit — Raw Findings

**Date:** 2026-05-12
**Scope:** `/home/mike/.openclaw-dench/workspace/wap-repo` (branch `master`)
**Method:** `madge`, `grep`/`rg`, `find`, schema inspection, route handler scan.

---

## 1. Circular Dependencies

### CRIT-1.1 — Circular import in Coursera CSV import chain
- **Severity:** medium
- **Location:** `lib/coursera/csvImport.server.ts` ↔ `lib/coursera/csvImport.ts`
- **Issue:** `madge --circular` reports one cycle: server module re-imports the shared module which back-references the server module. Risk: undefined exports at module init, unpredictable load order under Next.js bundling.
- **Fix:** Move the shared types/parsing primitives into a third file (`csvImport.types.ts`) that both server + shared consume. Server side imports shared, never the other way.

### Info-1.2 — Madge reported 531 warnings during scan
- **Severity:** low
- **Issue:** High warning count usually indicates broken `tsconfig` path resolution or dynamic imports that defeat static analysis. Worth investigating in isolation; can mask additional cycles.
- **Fix:** Run `npx madge --extensions ts,tsx --warning lib app 2>warnings.log` and triage.

---

## 2. Duplicate Business Logic

### HIGH-2.1 — Match-score calculation duplicated across ≥5 files
- **Severity:** high
- **Locations:**
  - `lib/admin/runAdminJobMatchesGet.ts`
  - `lib/admin/adminJobMatchesPrismaDeps.ts`
  - `lib/ai/matchStudents.ts`
  - `lib/employer/matchScoreDisplay.ts`
  - `app/api/admin/jobs/[id]/suggest-matches/route.ts`
  - `app/api/ai/job-match-scorer/route.ts`
  - `app/api/employer/jobs/[id]/matches/route.ts`
- **Issue:** Job-match scoring logic spread across admin, employer, AI scorer, and per-route handlers. Drift between admin score vs employer-facing score is a real bug risk (and Mike has already shipped at least one bug fix here).
- **Fix:** Consolidate to a single `lib/matching/score.ts` exposing pure functions (`scoreCandidateAgainstJob`, `formatMatchScoreForDisplay`). Every caller imports — no per-route reimplementation.

### HIGH-2.2 — Date formatting scattered across 82 files
- **Severity:** medium
- **Location:** 82 files contain `toLocaleDateString` or `format(...'yyyy'...)` calls.
- **Issue:** `lib/formatDate.ts` exists but is bypassed by most code. Inconsistent output (locale, timezone) is a member-trust hazard ("when does my class start?").
- **Fix:** Audit `lib/formatDate.ts` API completeness; lint-rule (or codemod) to forbid raw `toLocaleDateString` outside the util. Especially critical for member-facing pages given the ICP (low-trust, mobile).

### MED-2.3 — Auth/session retrieval duplicated in ~all routes
- **Severity:** medium
- **Issue:** 327 route handlers; `lib/auth/server.ts` and `portalGuards.ts` exist, but routes still call session lookups inline (sample: `app/api/admin/blog/*`, `app/api/admin/email-crons/*`, `app/api/admin/employers/[id]/*`). No single `requireRole('admin')`-style guard used uniformly.
- **Fix:** Adopt one helper (`requireAdmin(req)`, `requireMember(req)`) that returns `{ user, member }` or throws a standard 401/403 response. Replace inline checks via codemod.

### MED-2.4 — Prisma `findUnique` for member/user duplicated in 65 places
- **Severity:** medium
- **Issue:** Same lookup-by-email or lookup-by-id repeated across routes. Easy to forget `select`, leading to over-fetching PII.
- **Fix:** Centralize in `lib/data/members.ts` / `lib/data/users.ts` with explicit allowed-select shapes per use case.

---

## 3. Prisma Schema Issues (`prisma/schema.prisma`, 2120 lines, 77 models)

### HIGH-3.1 — Missing `@unique` on contact/email fields
- **Severity:** high
- **Locations:**
  - `line 77`: `workspaceEmail` on (likely) Member — no `@unique`; collisions break workspace auto-provisioning.
  - `line 769`, `line 1058`, `line 1167`: `contactEmail` on Employer/Partner — no `@unique`. Two employers can register with the same contact email.
  - `line 1912`, `line 2012`: `externalEmail` — no `@unique`. Could allow duplicate external mappings.
  - `line 1990`: `courseraEmail` — no `@unique`. Already known integration; duplicates here would silently misroute enrollments.
- **Issue:** Without `@unique`, "find or create" code paths can silently produce duplicates, especially during CSV imports.
- **Fix:** Add `@unique` where business logic guarantees uniqueness; for soft-uniqueness, add `@@index` + explicit duplicate-detection in service layer.

### HIGH-3.2 — 80% of relations lack `onDelete` policy
- **Severity:** high
- **Stat:** 108 of 135 `@relation(...)` declarations have **no** `onDelete` clause. Default Prisma behavior is `SetNull` (optional) or `Restrict` (required) — but the implicit choice is rarely the intentional one.
- **Issue:** Cascading deletes / orphan cleanup is undefined. Deleting an Employer may leave dangling Jobs; deleting a Member may leave Applications referencing nothing or block deletion entirely (GDPR risk: `app/api/gdpr/` exists).
- **Fix:** Audit each relation: explicitly choose `Cascade`, `Restrict`, or `SetNull`. Critical for GDPR member-erasure path — verify it actually completes.

### MED-3.3 — 17 `Json` columns
- **Severity:** medium
- **Issue:** `Json` columns escape type safety and indexing. Common offenders are config blobs and onboarding answers that could be structured.
- **Fix:** Walk each `Json` field; for any field queried with `where: { json: { path: ... } }`, promote to a relational table.

### MED-3.4 — `email String @db.Text` at line 1122
- **Severity:** medium
- **Issue:** Email stored as `Text` rather than `String` (default `VARCHAR`). No length cap. If this is the messages table, attackers can stuff arbitrary text into an email field.
- **Fix:** Tighten to `String @db.VarChar(254)` per RFC 5321.

---

## 4. Error Handling

### HIGH-4.1 — 51 of 327 route handlers (≈16%) have no `try`/`catch`
- **Severity:** high
- **Notable offenders (member-facing or revenue path):**
  - `app/api/member/coursera/launch/route.ts` — Coursera launch; failure here = member can't access training.
  - `app/api/member/applications/[id]/messages/route.ts` — member chat to employer.
  - `app/api/member/resume/preview/route.ts`, `live-suggestions/route.ts` — resume coach.
  - `app/api/admin/lifecycle/member/[id]/route.ts` — member lifecycle ops.
  - `app/api/admin/reports/wioa/route.ts` — compliance reporting.
  - `app/api/cron/deploy-health/route.ts`, `verification/route.ts`, `at-risk-check/route.ts` — crons; unhandled throws may break scheduler.
  - `app/api/employer/jobs/[id]/route.ts`, `bulk-delete/route.ts` — employer revenue path.
- **Issue:** Unhandled Prisma errors surface as raw 500s with stack traces to clients. Worst case: revealing schema details.
- **Fix:** Adopt a `withRouteHandler(handler)` wrapper (similar to `tRPC`) that catches, logs to Sentry, maps known Prisma codes (P2025 → 404, P2002 → 409, P2003 → 400) and returns `{ error: { code, message } }`.

### HIGH-4.2 — 201 of 327 routes (≈61%) have NO logging at all
- **Severity:** high
- **Issue:** No `console.error`, `logger.`, or `Sentry.captureException` call. When something fails in prod, there's no breadcrumb.
- **Fix:** Bake observability into the `withRouteHandler` wrapper above.

### INFO-4.3 — Prisma error-code handling exists in 32 places
- **Severity:** info
- **Issue:** P2025/P2002/P2003 handled by *some* code, but not centralized. Combined with 4.1 above: most route handlers don't translate these to proper HTTP codes.
- **Fix:** Centralize Prisma-error → HTTP-error mapping.

---

## 5. Test Coverage

### HIGH-5.1 — Only 17 Playwright specs cover the entire portal
- **Severity:** high
- **Existing E2E:** auth, coursera launch, cross-portal routes, desktop layout, employer/partner auth, member portal (mvp/nav/all-routes), member signup, revenue flows, mobile sprint, ui-smoke-unauth, preview-audit, prod-smoke, xapi/coursera smoke, visual regression.
- **Gaps (no dedicated spec found):**
  - GDPR member-erasure flow (`app/api/gdpr/`)
  - Admin lifecycle drift / at-risk member workflows
  - WIOA reporting export
  - Employer payout/billing
  - Mentor letter/session flows
  - Notification preference toggles (NOTIFICATION-AUDIT.md exists but no test mirrors it)
- **Fix:** Add specs for each member-critical and compliance-critical path; one bug in WIOA reporting is grant-risk.

### MED-5.2 — Only 68 `*.test.ts` files vs ~1100 source files (≈6% unit coverage proxy)
- **Severity:** medium
- **Issue:** Most utility code in `lib/` lacks unit tests. `lib/` root has 10 utilities, only 2 are tested (`admin-programs-structure`, `super-admin-switcher-structure`). `lib/formatDate`, `lib/formatPhone`, `lib/csv`, `lib/audit`, `lib/rate-limit` — all untested.
- **Fix:** Prioritize unit tests for pure functions (formatDate, formatPhone, csv parsing, rate-limit token bucket) — high value, easy to write.

### MED-5.3 — Match-scoring logic untested in pure form
- **Severity:** medium
- **Issue:** `lib/employer/matchScoreDisplay.test.ts` exists, `lib/admin/runAdminJobMatchesGet.test.ts` exists — but `lib/ai/matchStudents.ts` (the AI scorer) has no test. Mike has already debugged one bug here.
- **Fix:** Add fixture-based unit tests for `matchStudents`, especially edge cases (empty skill list, partial matches).

---

## 6. Type Safety

### LOW-6.1 — 19 occurrences of `any` type in lib/app
- **Severity:** low
- **Issue:** Manageable count, but each `any` is a runtime risk. Common in JSON deserialization spots.
- **Fix:** Replace with `unknown` + zod parsing (you already use Zod in `lib/validation/`).

### INFO-6.2 — 1 `@ts-ignore`/`@ts-expect-error`
- **Severity:** info
- **Issue:** Low; just verify it's still needed.

---

## 7. Code Organization

### MED-7.1 — `lib/` root has dumping-ground signs
- **Severity:** medium
- **Floating files at `lib/`:** `audit.ts`, `csv.ts`, `diagnostics.ts`, `email.ts`, `formatDate.ts`, `formatPhone.ts`, `rate-limit.ts`, `referralSources.ts`, `supabase-admin.ts`, `supabaseCookieOptions.ts`.
- **Issue:** These are utilities but live alongside 40+ subdirectories. `email.ts` at root competes with `lib/email/` directory (if present). `supabase-admin.ts` and `supabaseCookieOptions.ts` should move into `lib/supabase/` or `lib/auth/`.
- **Fix:** Move each to a topic dir: `lib/format/{date,phone}.ts`, `lib/security/rate-limit.ts`, `lib/supabase/{admin,cookieOptions}.ts`, `lib/audit/index.ts`. Update imports via codemod.

### MED-7.2 — Largest dirs may benefit from sub-organization
- **Severity:** low
- **`lib/member/` (40 files), `lib/coursera/` (37), `lib/content/` (31), `lib/ai/` (27)** — at this size, sub-grouping by feature (e.g., `lib/member/{onboarding,resume,notifications}/`) keeps cognitive load manageable.

### INFO-7.3 — Junk files in repo root
- **Severity:** low
- **Files:** `prisma.())` (looks like a fat-finger from a shell paste), `error.log` (committed log?), `test-file.txt`, `next-build-output.txt`, `next-build-output-verify.txt`, `narration_A.mp3`, `narration_B.mp3`, `cursor-api-payload.json`.
- **Fix:** `.gitignore` build artifacts and logs; `git rm` the ones that aren't real assets.

### INFO-7.4 — Both `bun.lock` and `pnpm-lock.yaml` and `package-lock.json` present
- **Severity:** medium
- **Issue:** Three lockfiles = no single source of truth for installs. CI may produce different node_modules than dev. This is a real footgun.
- **Fix:** Pick one package manager; delete the other two lockfiles and document in README.

---

## Severity Roll-up

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 7 (2.1, 3.1, 3.2, 4.1, 4.2, 5.1, plus 2.2 borderline) |
| Medium | 9 |
| Low / Info | 7 |

## Top 5 Recommended First Strikes
1. **`withRouteHandler` wrapper** — solves 4.1 + 4.2 in one move. ≈1 day, huge ROI.
2. **Centralize match-scoring** (2.1) — eliminates a known bug-prone divergence.
3. **Schema `onDelete` audit** (3.2) — required before GDPR can be trusted.
4. **Single package manager** (7.4) — prevents next "works on my machine" incident.
5. **Add E2E specs for GDPR + WIOA + payouts** (5.1) — compliance/revenue safety net.
