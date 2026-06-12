# TODOS

Design and UX debt tracked from plan-design-review (2026-05-05, branch `split/pr2-coursera-launch-hardening`).

---

## TODO-001: Coursera Hub — Mobile Layout Spec

**What:** Add a mobile layout for `/dashboard/coursera` (either a responsive breakpoint or a dedicated mobile component matching the Training page pattern).

**Why:** The Coursera hub is the member's primary launch point and progress view. Mobile-first members — likely a significant share — hit this on phones. The auto-fit grid collapses okay, but the course pathway list has no spec for narrow viewports: long course names (e.g. "Machine Learning: Regression and Classification") will truncate or overflow at 320px.

**Pros:** Consistent cross-device experience; no overflow or clipping surprises on phones.

**Cons:** ~30min of design work before implementation; may be moot if Training/Coursera pages are eventually merged (see Unresolved Decision #1).

**Context:** Training page already uses `md:wa-hidden` / `wa-hidden md:wa-block` split as the established pattern. Coursera hub should follow the same approach. The design review rated the Coursera hub at 5/10 for responsive behavior.

**Depends on / blocked by:** Partially blocked by the unresolved Training vs Coursera IA decision. If the pages merge, this work is absorbed into the Training page redesign.

---

## ~~TODO-002: Training Page — "0% Progress" First-Visit Framing~~ ✓ COMPLETED

**What:** ~~When a member lands on `/dashboard/training` for the first time with `completedCount === 0`, replace the cold "0/7 courses — 0%" stat display with a warm starting-line framing...~~

**Completed:** 2026-05-05 (commit `21811415 feat(training): canonical training truth`). The zero-state banner with "Your path starts here — Course 1 of N is unlocked and ready" and a "Start Course 1" CTA is already live in `app/(portal)/dashboard/training/page.tsx`.

---

## ~~TODO-003: Coursera Hub — "NOW" Badge Font Size~~ ✓ COMPLETED

**What:** ~~Change `font-size: '0.65rem'` on the "NOW" pill badge~~ → Changed to `0.75rem`.

**Completed:** 2026-05-05 (split/pr2-coursera-launch-hardening, commit 37cfe67e)

---

## TODO-004: Coursera Launch E2E Integration Test

**What:** Add an E2E integration test for the Coursera launch flow using a test Coursera account or mocked OAuth flow.

**Why:** The launch route has 4 URL resolution paths, 3 error states (error redirect, no-program-url fallback, unauth redirect), and an optional `?course=slug` deep-link param. Unit tests cover the URL-building logic but not the full request→redirect flow. A regression in the route's auth check or redirect logic would only be caught by manual QA.

**Pros:** Catches regressions in the highest-trust moment of the training flow before they reach members.

**Cons:** Requires either a live test Coursera account (with real SSO credentials) or a complex mock OAuth server. Non-trivial setup that depends on external infrastructure.

**Context:** From the eng review: "The launch route has no test for any of these paths. This is the highest-impact page in the training flow." Unit tests for `buildCourseraLaunchUrl` were added in this sprint (config.test.ts). The route-level integration test was deferred here pending test credentials.

**Depends on / blocked by:** Coursera test account OR a mock SSO server implementation.

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

## Completed

- **TODO-005: admin/token-links — cross-tenant subjectUserId minting** — `resolveActOnBehalf` gate added before `getSubjectOrganizationId`; silent `.catch(() => null)` orgId degradation removed; route asserted in `verify-high-risk-tenant-routes.cjs`; regression spec `tests/api/admin-token-links.spec.ts`. Completed 2026-06-12.
- **TODO-003: Coursera Hub — "NOW" Badge Font Size** — `font-size` changed from `0.65rem` → `0.75rem`. Completed 2026-05-05, PR split/pr2-coursera-launch-hardening.

---
