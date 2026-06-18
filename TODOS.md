# TODOS

Design and UX debt tracked from plan-design-review (2026-05-05, branch `split/pr2-coursera-launch-hardening`).

---

## ~~TODO-001: Coursera Hub — Mobile Layout Spec~~ ✓ COMPLETED

**What:** ~~Add a mobile layout for `/dashboard/coursera` (either a responsive breakpoint or a dedicated mobile component matching the Training page pattern).~~ `/dashboard/coursera` now redirects into `/dashboard/training`, the merged hub. The shared Training course pathway uses the established `md:wa-hidden` / `wa-hidden md:wa-block` mobile split and mobile-safe course cards.

**Why:** The Coursera hub is the member's primary launch point and progress view. Mobile-first members — likely a significant share — hit this on phones. The auto-fit grid collapses okay, but the course pathway list has no spec for narrow viewports: long course names (e.g. "Machine Learning: Regression and Classification") will truncate or overflow at 320px.

**Pros:** Consistent cross-device experience; no overflow or clipping surprises on phones.

**Cons:** ~30min of design work before implementation; may be moot if Training/Coursera pages are eventually merged (see Unresolved Decision #1).

**Context:** Training page already uses `md:wa-hidden` / `wa-hidden md:wa-block` split as the established pattern. Coursera hub should follow the same approach. The design review rated the Coursera hub at 5/10 for responsive behavior.

**Completed:** 2026-06-14. IA decision resolved as Option A: `/dashboard/coursera` redirects to `/dashboard/training`; course cards now explicitly guard long Coursera titles and CTAs at narrow widths.

---

## ~~TODO-002: Training Page — "0% Progress" First-Visit Framing~~ ✓ COMPLETED

**What:** ~~When a member lands on `/dashboard/training` for the first time with `completedCount === 0`, replace the cold "0/7 courses — 0%" stat display with a warm starting-line framing...~~

**Completed:** 2026-05-05 (commit `21811415 feat(training): canonical training truth`). The zero-state banner with "Your path starts here — Course 1 of N is unlocked and ready" and a "Start Course 1" CTA is already live in `app/(portal)/dashboard/training/page.tsx`.

---

## ~~TODO-003: Coursera Hub — "NOW" Badge Font Size~~ ✓ COMPLETED

**What:** ~~Change `font-size: '0.65rem'` on the "NOW" pill badge~~ → Changed to `0.75rem`.

**Completed:** 2026-05-05 (split/pr2-coursera-launch-hardening, commit 37cfe67e)

---

## ~~TODO-004: Coursera Launch E2E Integration Test~~ ✓ COMPLETED

**What:** ~~Add an E2E integration test for the Coursera launch flow using a test Coursera account or mocked OAuth flow.~~ Added a mocked route-level integration seam that drives `Request` → redirect behavior without live Coursera credentials.

**Completed:** 2026-06-14. Coverage lives in `lib/coursera/launchRouteCore.test.ts`; `app/api/member/coursera/launch/route.ts` now wires real Next/Auth/Prisma/Coursera dependencies into the injectable handler. Covered unauth redirect, DB course override deep link, active-dashboard-program resolution, safe course fallback, configured program URL redirect, and launch-failed fallback.

---

## Unresolved Design Decision #1: Training vs Coursera Hub Architecture

**Decision needed:** Is `/dashboard/training` the single source of truth for course progress, or are Training and Coursera two intentionally distinct pages with different jobs?

**Current state:** Both pages show course count + progress percentage + a Coursera launch button. The Coursera hub adds a sequential course pathway list and skillset progress. The Training page adds a course-by-course list with manual mark-done, "What happens after I start?" guidance, and a sync details section.

**If deferred:** Two pages with duplicate stats ship. Members ping counselors asking "which one do I use?" Counselors don't have a clear answer.

**Options:**
- **A)** Merge into Training as the hub; Coursera hub → redirect or lightweight utility page
- **B)** Keep separate but differentiate clearly: Training = progress + course list, Coursera = launch point + partner tools

**Recommended:** Option A (cleaner IA, eliminates stat duplication, single source of truth for members).

---

## ~~TODO-006: admin/token-links — P2 hardening follow-ups (post TODO-005)~~ ✓ Items 1-3 Completed; Item 4 Deferred

**What:** Adversarial review of PR #1657 closed the P1 but flagged P2s on `app/api/admin/token-links/route.ts`:
1. ~~**Existence oracle:** cross-tenant denial returns 404 only for nonexistent IDs; an existing Org-B member yields 403 — lets an Org-A admin enumerate valid user UUIDs. Collapse both to 404.~~ ✓ Fixed — `resolveActOnBehalf` returns 404 for both cases.
2. ~~**No audit log on link minting**~~ ✓ Fixed — `auditLog(...)` called after minting with full metadata.
3. ~~**No rate limit on minting**~~ ✓ Fixed — `checkAdminTokenLinksRateLimit(user.id)` added.
4. **RLS forward-compat:** `getSubjectOrganizationId` + the fullName lookup are deliberately cross-tenant raw Prisma reads; under FORCE RLS with an actor-org GUC the super_admin path will return null → 500. Track in the Sprint 3 FORCE RLS flip checklist.

**Status:** Items 1-3 completed 2026-06-17 (code already in master). Item 4 deferred to FORCE RLS flip sprint.

---

## TODO-007: admin/growth — wire real GA4 property ID

**What:** `app/admin/growth/page.tsx:38` has a placeholder GA4 property ID and the dashboard shows static demo data instead of live analytics.

**Why:** The growth dashboard is the primary admin tool for tracking acquisition, activation, and retention funnels. Placeholder data misleads decisions.

**Priority:** P2

**Fix shape:** Once GA4 workspace is provisioned, replace the placeholder ID on line 38 and wire the server-side GA4 Data API integration (the TODO block at lines 219 and 278 in the same file).

---

## TODO-016: partner/dashboard missing withApiGuc — ✓ Fixed PR #1867

**What:** `GET /api/partner/dashboard` was a bare `export async function GET()` without `withApiGuc`. It calls `loadPartnerReferralBundle` which queries Prisma.

**Fix:** Added `withApiGuc` wrapper, removed unused `prisma` import. PR #1867.

**Priority:** P2 (Sprint 3 blocker)

**Status:** Fixed 2026-06-17.

---

## TODO-017: ai/interview/results missing rate limit + withApiGuc — ✓ Fixed PR #1868

**What:** `GET /api/ai/interview/results` calls `chatCompletion` (Groq) without `checkAIToolRateLimit`, unlike the sibling `start` and `response` routes. Also calls `loadCoachContextBlock` → `getAICoachContext` which issues Prisma queries without `withApiGuc`.

**Fix:** Added `checkAIToolRateLimit(user.id)` + `withApiGuc` wrapper. PR #1868.

**Priority:** P2 (rate limit bypass + Sprint 3 FORCE RLS)

**Status:** Fixed 2026-06-17.

---

## TODO-027: admin/members/create — tenant-scope partner/subgroup FKs + notes cap + audit log ✓ Fixed PR #1946

**What:** `app/api/admin/members/create/route.ts` validated `partnerId` and `subgroupId` without scoping them to the actor's organization — an Org A admin could attach an Org B partner or subgroup to a newly-created member. Also: `notes` had no length cap. No audit log for member creation.

**Fix:** Fetched `organizationId` early; added `organizationId` filter to partner lookup and `leader.organizationId` filter to subgroup lookup; capped `notes` at 5000 chars; added `logAuditEvent` for `create_member`. PR #1946.

**Priority:** P1 (cross-tenant FK association)

**Status:** Fixed 2026-06-17.

---

## TODO-008: Waitlist API — enable after Prisma migration

**What:** `app/api/waitlist/route.ts` has the handler stubbed out with two `// TODO: Re-enable after Prisma schema migration` comments. The `ProgramWaitlist` model needs to be added to the Prisma schema and a migration committed.

**Why:** Program waitlists allow members to express interest in fully-subscribed programs, enabling counselors to manage overflow.

**Priority:** P3

**Fix shape:** Add `ProgramWaitlist` model to `prisma/schema.prisma`, run `prisma migrate dev`, commit the migration, and remove the stub comments in the route.

---

## TODO-021: Sprint 3 audit sweep — second wave (PRs #1924–#1928)

**What:** Continue the audit log sweep started in TODO-020. These routes gained `auditLog` calls via individual PRs awaiting gate-merge:

- **PR #1924** — `admin/users/[id]` DELETE/PATCH: `admin_user_delete`, `admin_user_update`; `admin/partners/[id]` PATCH: `admin_partner_update`; `admin/partners` POST: `admin_partner_create`; `admin/organization/logo` POST: `admin_org_logo_upload`
- **PR #1925** — `admin/employer-screening-packs` POST + `[id]` PATCH/DELETE; `admin/members/create` POST: `admin_member_create`; `admin/testimonials/[id]` PATCH/DELETE
- **PR #1926** — `admin/mentors/[id]` PATCH: `admin_mentor_status_update`; `admin/members/[id]/notes` POST: `admin_member_note_create`; `admin/members/[id]/edit-profile` PATCH: `admin_member_profile_update`
- **PR #1927** — `admin/members/[id]/wioa-review` PATCH: `admin_member_wioa_review`; `admin/milestone-cascades/synthetic` POST; `admin/placement-surveys/resend` POST
- **PR #1928** — `admin/feature-flags` POST/PATCH/DELETE: create, update, delete

**Remaining deferred** (lower priority — Coursera/cron/analytics/lifecycle routes, Sprint 3 FORCE RLS flip):
- `admin/email-templates/[id]` PATCH/DELETE, `admin/email-crons` mutations
- `admin/lifecycle/member/[id]` PATCH
- `admin/members/[id]/upload-resume` POST, `admin/members/[id]/interview` POST
- `admin/messages/thread/*` POST handlers
- `admin/users/[id]/free-email` POST
- ~15 Coursera admin routes, cron routes needing `withSystemGuc`

**Priority:** P2 (state-mutating routes already done; deferred are lower-risk or blocked on FORCE RLS)

---

## TODO-038: upload routes — derive Supabase contentType from validated extension — ✓ Fixed PR #1966

**What:** 4 upload routes (cert upload, admin upload-resume, member resume upload, counselor upload-resume) passed browser-supplied `file.type` as `contentType` to Supabase. Attacker could tag any upload with `text/html`, causing Supabase to serve it with that header.

**Fixed:** PR #1966. All 4 routes now derive MIME from validated extension (matching logos fix in PR #1964).

**Status:** Completed 2026-06-17. PR #1966 open / gate-merge pending.

---

## TODO-039: audit logs for deferred TODO-021 admin routes — ✓ Fixed PR #1967

**What:** 3 state-mutating admin routes from TODO-021 deferred list: `admin/messages/thread/[threadId]/staff POST` (staff message creation), `admin/users/[id]/free-email POST` (PII email mutation), `admin/members/[id]/interview PATCH` (interview status update).

**Fixed:** PR #1967. Both `auditLog` + `logAuditEvent` (fire-and-forget) added to all 3 routes.

**Status:** Completed 2026-06-17. PR #1967 open / gate-merge pending.

---

## TODO-036: admin/blog AI routes — rate limits + withApiGuc + logo MIME — ✓ Fixed PR #1964

**What:** All 5 admin blog AI endpoints (`generate`, `suggest-topics`, `from-ideas`, `review`, `draft`) called `chatCompletion` without `checkAIToolRateLimit`. `review` and `generate` also missing `withApiGuc`. Both logo upload routes used browser-supplied `file.type` as Supabase `contentType` instead of deriving from validated extension.

**Fixed:** PR #1964. Rate limits added to all 5 routes. `withApiGuc` added to `review` and `generate`. MIME derived from validated extension in both logo routes.

**Status:** Completed 2026-06-17. PR #1964 open / gate-merge pending.

---

## TODO-037: AI rate limits for interview, counselor, admin resume routes — ✓ Fixed PR #1965

**What:** 6 routes calling `chatCompletion` or `claudeChat` without `checkAIToolRateLimit`: `interview/session` (text fallback), `interview/history POST`, `counselor/feedback POST`, `admin/members/[id]/summary`, `admin/members/enhance-resume`, `admin/members/parse-resume`.

**Fixed:** PR #1965. Rate limit added to all 6 routes. `ai/interview/results` separately tracked in PR #1959.

**Status:** Completed 2026-06-17. PR #1965 open / gate-merge pending.

---

## TODO-040: withApiGuc sweep — auth/me, jobs/matches, quarterly-outcomes; request-help rate limit — ✓ Fixed PR #1968

**What:** `auth/me` (heavily polled role-check endpoint) and 3 analytics/reporting routes missing `withApiGuc`; `member/request-help` had no rate limit allowing counselor email spam.

**Fixed:** PR #1968. `withApiGuc` added to `auth/me`, `admin/jobs/[id]/matches`, `admin/partners/[id]/quarterly-outcomes`, `admin/reports/quarterly-outcomes`. `checkContactRateLimit(ip)` added to `member/request-help`.

**Status:** Completed 2026-06-17. PR #1968 open / gate-merge pending.

---

## TODO-041: prep-bundle open relay + audit logs — ✓ Fixed PR #1969

**What:** `member/prep-bundle/send` accepted arbitrary `memberEmail` in body, allowing any authenticated member to send WorkforceAP-branded emails to any address. Also missing `withApiGuc` and rate limit. `admin/email-templates/[id]` PATCH and `admin/members/[id]/upload-resume` POST missing audit logs.

**Fixed:** PR #1969. `memberEmail` removed from body (always send to authenticated user's own email). `checkContactRateLimit` and `withApiGuc` added. Dual audit trails added to email-templates PATCH and upload-resume POST.

**Status:** Completed 2026-06-17. PR #1969 open / gate-merge pending.

---

## TODO-042: withApiGuc for onet/webhooks/email-crons-preview; xapi batch size limit — ✓ Fixed PR #1970

**What:** `admin/onet/sync`, `admin/onet/search`, `admin/email-crons/[id]/template-preview`, and `admin/webhooks/process-retries` all call `requireAdmin`/`isAdmin` (Prisma) without `withApiGuc`. `xapi/statements` had no batch size cap — a large batch could exhaust memory/connections.

**Fixed:** PR #1970. `withApiGuc` added to all 4 routes. xAPI batch capped at 200 statements (400 if exceeded).

**Status:** Completed 2026-06-17. PR #1970 open / gate-merge pending.

---

## TODO-043: §H-DEP4 dual audit trail on PII bulk-export + export-data — ✓ Fixed PR #1971

**What:** `admin/members/bulk-export` had `auditLog` but not `logAuditEvent`. `admin/members/[id]/export-data` had `logAuditEvent` but not `auditLog`. Both PII exports require both for §H-DEP4.

**Fixed:** PR #1971. Missing half of each audit pair added as fire-and-forget calls.

**Status:** Completed 2026-06-17. PR #1971 open / gate-merge pending.

---

## TODO-044: audit trails for member self-delete + admin subgroup mutations — ✓ Fixed PR #1972

**What:** `member/delete-account` (irreversible self-deletion) and `admin/members/[id]/subgroup` (POST/DELETE subgroup assignment) had no audit logs.

**Fixed:** PR #1972. `auditLog` + `logAuditEvent` added to delete-account; `auditLog` added to subgroup POST/DELETE.

**Status:** Completed 2026-06-17. PR #1972 open / gate-merge pending.

---

## TODO-047: audit logs for enrollment-funding, milestone-cascades/synthetic, placement-surveys/resend — ✓ Fixed PR #1975

**What:** 3 admin routes missing audit logs: `enrollment-funding` (financial record mutation), `milestone-cascades/synthetic` (debug tool that modifies member progress), `placement-surveys/resend` (email send + token creation). All had `withApiGuc` but no `auditLog`.

**Fixed:** PR #1975. Fire-and-forget `auditLog` calls added to all 3.

**Status:** Completed 2026-06-17. PR #1975 open / gate-merge pending.

---

## TODO-046: withApiGuc for 9 Coursera admin routes + ai/interview/response — ✓ Fixed PR #1974

**What:** 9 Coursera admin routes (`auto-heal`, `b4b-programs`, `b4b-bindings-suggestions`, `map-unmatched`, `mappings`, `seed-canonical-mappings-from-b4b`, `seed-canonical-mappings-from-catalog`, `sync-b4b`, `self-test`) and `ai/interview/response` were missing `withApiGuc`. All call `isAdmin()` which queries Prisma without a GUC context.

**Fixed:** PR #1974. Completes Coursera admin GUC sweep from TODO-021 deferred list.

**Status:** Completed 2026-06-17. PR #1974 open / gate-merge pending.

---

## TODO-045: audit trail completeness — award-points, pipeline-stage, merge, reset-password, coursera-approval — ✓ Fixed PR #1973

**What:** 5 admin routes with incomplete dual audit trail:
- `award-points`: NO audit at all — admin/counselor point awards untracked
- `pipeline-stage`, `merge`, `reset-password`: had `logAuditEvent` (xAPI) but no legacy `auditLog`
- `coursera-enrollment-approval`: had `auditLog` but no `logAuditEvent` xAPI trail

**Fixed:** PR #1973. All 5 routes now emit both `auditLog` + `logAuditEvent` fire-and-forget per §H-DEP4.

**Status:** Completed 2026-06-17. PR #1973 open / gate-merge pending.

---

## TODO-048: withApiGuc for admin/blog/[id] GET/PATCH/DELETE — ✓ Fixed PR #1976

**What:** `admin/blog/[id]/route.ts` imported `withApiGuc` but all three handlers (GET, PATCH, DELETE) used bare `export async function`. `isAdmin()` queries Prisma — missing GUC context breaks FORCE RLS.

**Fixed:** Renamed handlers to `_GET`/`_PATCH`/`_DELETE`, exported each via `withApiGuc`. PR #1976.

**Status:** Completed 2026-06-17. PR #1976 open / gate-merge pending.

---

## TODO-049: §H-DEP4 dual audit trails on admin/users routes — ✓ Fixed PR #1977

**What:** 4 violations in admin user-management routes:
- `admin/users` POST: NO audit at all for creating admin/staff accounts (highest-risk user creation)
- `admin/users/[id]` DELETE: `auditLog` only; missing `logAuditEvent`
- `admin/users/[id]` PATCH: `auditLog` only; missing `logAuditEvent`
- `admin/users/[id]/reset-password` POST: `logAuditEvent` only; missing `auditLog` + request metadata

**Fixed:** Added dual audit trails to all 4 handlers. PR #1977.

**Status:** Completed 2026-06-17. PR #1977 open / gate-merge pending.

---

## TODO-055: §H-DEP4 dual audit trails sweep 7 — 6 routes — ✓ Fixed PR #1983

**What:** 6 routes with missing xAPI audit trail:
- `admin/feature-flags` POST: `auditLog` only → added `logAuditEvent`
- `admin/feature-flags/[id]` PATCH + DELETE: `auditLog` only → added `logAuditEvent` for both
- `admin/onet/mappings` POST (update + create paths) + DELETE: `auditLog` only → added `logAuditEvent` after each mutation
- `admin/token-links` POST: `auditLog` only → added `logAuditEvent`
- `q/[token]/submit` bound-link path: no audit → added both `auditLog` + `logAuditEvent`; null-actor path skips `logAuditEvent` (non-nullable AuditActor.id)
- `admin/members/[id]/placed-outcome` POST: `auditLog` only → added `logAuditEvent`

**Fixed:** PR #1983. All 6 routes now emit both audit trails per §H-DEP4.

## TODO-054: §H-DEP4 dual audit trails sweep 6 — 5 routes — ✓ Fixed PR #1982

**What:** 5 routes missing one of the two required audit calls:
- `admin/data-retention` POST run_cleanup: no audit at all → added both `auditLog` + `logAuditEvent`
- `admin/mentors/[id]` PATCH: `auditLog` only → added `logAuditEvent`
- `admin/partner-payouts` GET: `auditLog` only → added `logAuditEvent`
- `counselor/inbox-zero/dismiss` POST: `auditLog` only → added `logAuditEvent`
- `member/coursera/enroll-in-course` (`writeEnrollAudit` helper): `auditLog` only → added `logAuditEvent`

**Fixed:** PR #1982. All 5 routes now emit both `auditLog` + `logAuditEvent` fire-and-forget per §H-DEP4.

## TODO-053: §H-DEP4 dual audit trails sweep 5 — 9 admin/members routes — ✓ Fixed PR #1981

**What:** 9 admin/members routes with mismatched audit trails:
- `members/[id]/pipeline-stage` PATCH: `logAuditEvent` only → added `auditLog`
- `members/[id]/export-data` GET: `logAuditEvent` only → added `auditLog`
- `members/merge` POST: `logAuditEvent` only → added `auditLog`
- `members/[id]/reset-password` POST: `logAuditEvent` only → added `auditLog`
- `members/[id]/wioa-review` PATCH: `auditLog` only → added `logAuditEvent`
- `members/[id]/workspace-email` POST+DELETE: `auditLog` only → added `logAuditEvent` for both
- `members/[id]/readiness` PATCH: `auditLog` only → added `logAuditEvent`
- `members/[id]/coursera-enrollment-approval` PATCH: `auditLog` only → added `logAuditEvent`
- `members/bulk-export` POST: `auditLog` only → added `logAuditEvent`

**Status:** Completed 2026-06-17. PR #1981 open / gate-merge pending.

---

## TODO-052: §H-DEP4 dual audit trails sweep 4 — milestone/placements/employers/partners/subgroups/employer — ✓ Fixed PR #1980

**What:** 8 routes with mismatched audit trails:
- `admin/milestone-cascades/[id]/approve`: `auditLog` only → added `logAuditEvent`
- `admin/milestone-cascades/[id]/dismiss`: `auditLog` only → added `logAuditEvent`; also added `user.organizationId` to cascade select for orgId
- `admin/placements`: `auditLog` only (POST create + PATCH update) → added `logAuditEvent` for both
- `admin/employers`: `auditLog` only → added `logAuditEvent`
- `admin/partners/[id]`: `auditLog` only → added `logAuditEvent`
- `admin/subgroups/[id]`: `auditLog` only (PATCH + DELETE) → added `logAuditEvent` for both; renamed `_request` to `request` in DELETE
- `employer/loi`: `logAuditEvent` only → added `auditLog`
- `employer/outcomes`: `logAuditEvent` only → added `auditLog`

**Status:** Completed 2026-06-17. PR #1980 open / gate-merge pending.

---

## TODO-051: §H-DEP4 dual audit trails sweep 3 — members + outcomes routes — ✓ Fixed PR #1979

**What:** 7 violations:
- `members/create`: `logAuditEvent` only (from #1946); added `auditLog`
- `members/[id]/delete`: `logAuditEvent` only; added `auditLog`
- `members/[id]/program`: dead import — no audit calls at all; added both
- `members/[id]/reset-assessment`: `logAuditEvent` only; added `auditLog`
- `outcomes/route`: `logAuditEvent` only; added `auditLog`
- `outcomes/pdf`: `logAuditEvent` only + missing `orgId`; added `auditLog`, fixed `orgId`
- `outcomes/snapshot`: `logAuditEvent` only; added `auditLog`

**Status:** Completed 2026-06-17. PR #1979 open / gate-merge pending.

---

## TODO-050: §H-DEP4 dual audit trails on partner/job routes — ✓ Fixed PR #1978

**What:** 5 violations in partner and job management routes:
- `admin/partners/[id]/approve`: `logAuditEvent` only; missing `auditLog`
- `admin/partners/invite`: `auditLog` only; missing `logAuditEvent`
- `admin/partners/[id]/invite`: `auditLog` only; missing `logAuditEvent`
- `admin/jobs/[id]/approve`: `logAuditEvent` only; missing `auditLog`
- `admin/jobs/[id]/reject`: `logAuditEvent` only; missing `auditLog`

**Fixed:** Added missing audit log type to each handler. PR #1978.

**Status:** Completed 2026-06-17. PR #1978 open / gate-merge pending.

---

## Completed

- **TODO-017: ai/interview/results missing rate limit + withApiGuc** — rate limit + GUC wrapper added. Completed 2026-06-17. PR #1868.
- **TODO-016: partner/dashboard missing withApiGuc** — GUC wrapper added. Completed 2026-06-17. PR #1867.
- **TODO-006 items 1-3: admin/token-links P2 hardening** — existence oracle collapsed to 404, audit log + rate limit added. Confirmed in code 2026-06-17.
- **TODO-005: admin/token-links — cross-tenant subjectUserId minting** — `resolveActOnBehalf` gate added before `getSubjectOrganizationId`; silent `.catch(() => null)` orgId degradation removed; route asserted in `verify-high-risk-tenant-routes.cjs`; regression spec `tests/api/admin-token-links.spec.ts`. Completed 2026-06-12.
- **TODO-001: Coursera Hub — Mobile Layout Spec** — `/dashboard/coursera` is absorbed into the Training hub redirect; shared course cards wrap long Coursera course names and mobile CTAs safely at narrow widths. Completed 2026-06-14.
- **TODO-003: Coursera Hub — "NOW" Badge Font Size** — `font-size` changed from `0.65rem` → `0.75rem`. Completed 2026-05-05, PR split/pr2-coursera-launch-hardening.
- **TODO-004: Coursera Launch E2E Integration Test** — mocked route-level Request → redirect coverage added for `/api/member/coursera/launch`. Completed 2026-06-14.
