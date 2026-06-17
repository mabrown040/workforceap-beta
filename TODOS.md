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

## TODO-029: admin GUC batch 2 — 10 routes missing withApiGuc ✓ Fixed PR #1948

**What:** Ten admin routes called Prisma without `withApiGuc`: `messages/stats`, `reports/quarterly-outcomes`, `onet/sync`, `jobs/[id]/matches`, `reports/wioa/generate`, `coursera/sync-b4b`, `coursera/map-unmatched`, `coursera/mappings`, `members/bulk-email`, `partners/[id]/quarterly-outcomes`.

**Fix:** Added `withApiGuc` to all 10. PR #1948.

**Priority:** P2 (Sprint 3 FORCE RLS blocker)

**Status:** Fixed 2026-06-17.

---

## TODO-008: Waitlist API — enable after Prisma migration

**What:** `app/api/waitlist/route.ts` has the handler stubbed out with two `// TODO: Re-enable after Prisma schema migration` comments. The `ProgramWaitlist` model needs to be added to the Prisma schema and a migration committed.

**Why:** Program waitlists allow members to express interest in fully-subscribed programs, enabling counselors to manage overflow.

**Priority:** P3

**Fix shape:** Add `ProgramWaitlist` model to `prisma/schema.prisma`, run `prisma migrate dev`, commit the migration, and remove the stub comments in the route.

---

## Completed

- **TODO-017: ai/interview/results missing rate limit + withApiGuc** — rate limit + GUC wrapper added. Completed 2026-06-17. PR #1868.
- **TODO-016: partner/dashboard missing withApiGuc** — GUC wrapper added. Completed 2026-06-17. PR #1867.
- **TODO-006 items 1-3: admin/token-links P2 hardening** — existence oracle collapsed to 404, audit log + rate limit added. Confirmed in code 2026-06-17.
- **TODO-005: admin/token-links — cross-tenant subjectUserId minting** — `resolveActOnBehalf` gate added before `getSubjectOrganizationId`; silent `.catch(() => null)` orgId degradation removed; route asserted in `verify-high-risk-tenant-routes.cjs`; regression spec `tests/api/admin-token-links.spec.ts`. Completed 2026-06-12.
- **TODO-001: Coursera Hub — Mobile Layout Spec** — `/dashboard/coursera` is absorbed into the Training hub redirect; shared course cards wrap long Coursera course names and mobile CTAs safely at narrow widths. Completed 2026-06-14.
- **TODO-003: Coursera Hub — "NOW" Badge Font Size** — `font-size` changed from `0.65rem` → `0.75rem`. Completed 2026-05-05, PR split/pr2-coursera-launch-hardening.
- **TODO-004: Coursera Launch E2E Integration Test** — mocked route-level Request → redirect coverage added for `/api/member/coursera/launch`. Completed 2026-06-14.
