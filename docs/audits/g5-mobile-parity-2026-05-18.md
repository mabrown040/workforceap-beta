# G5 Mobile Parity Audit — Top-10 Routes

**Date:** 2026-05-18 (captured 2026-05-19 UTC)  
**Branch:** `g5/mobile-parity-audit` (audit-only; no product code changes)  
**Environment:** Production — `https://www.workforceap.org` (locale prefix resolves to `/en/...`)  
**Viewports:** iPhone SE class **375×667**, iPhone 11 class **414×896**  
**Method:** Headless Chromium (Playwright) DOM probes for horizontal overflow, in-viewport interactive bounding boxes &lt;44×44px, fixed/sticky chrome, and computed body copy &lt;16px; plus cross-reference of authenticated portal findings from [`LIVE-PORTAL-AUDIT-2026-04-26.md`](../LIVE-PORTAL-AUDIT-2026-04-26.md) and hub PNGs in [`portal-screenshots/`](../portal-screenshots/README.md).

---

## Executive summary

| Severity | Count | Themes |
|----------|-------|--------|
| **P1** | 6 | Sub-16px marketing/PDJ copy; cookie banner over fixed bottom nav; portal footer overlap (authenticated); dashboard mobile tab strip truncation |
| **P2** | 8 | 14px funnel/support copy; duplicate portal DOM on mobile; employer/partner hub duplicate heroes |
| **P3** | 4 | Language toggle 13px; icon+label concatenation in PDJ tabs; login portal-switcher link density |

**Horizontal overflow:** None of the ten routes showed `scrollWidth > innerWidth + 4px` at either viewport in the unauthenticated pass.

**Tap targets (in-viewport):** No interactive control rendered below 44×44px on the marketing/login surfaces probed (CSS `min-height` on `.btn` and nav patterns generally holds). **Exception class:** PDJ journey tabs meet 44px height but use **~10.4px labels** — readable-size failure, not hit-area failure.

**Authenticated gap:** `/dashboard`, `/employer`, and `/counselor` redirect to `/login` without session cookies. Portal-specific mobile breakage below is sourced from April 2026 live portal audit + hub screenshots at ~390×844 (closest archived captures to 375/414).

---

## Screenshot index (reference paths — not captured in this pass)

Canonical naming for future captures:

| Route | 375×667 | 414×896 | Notes |
|-------|---------|---------|-------|
| `/` | [`screenshots/g5/home-375x667.png`](screenshots/g5/home-375x667.png) | [`screenshots/g5/home-414x896.png`](screenshots/g5/home-414x896.png) | Marketing bottom nav visible |
| `/apply` | [`screenshots/g5/apply-375x667.png`](screenshots/g5/apply-375x667.png) | [`screenshots/g5/apply-414x896.png`](screenshots/g5/apply-414x896.png) | Funnel; no marketing bottom nav |
| `/apply/create-account` | [`screenshots/g5/apply-create-account-375x667.png`](screenshots/g5/apply-create-account-375x667.png) | [`screenshots/g5/apply-create-account-414x896.png`](screenshots/g5/apply-create-account-414x896.png) | |
| `/login` | [`screenshots/g5/login-375x667.png`](screenshots/g5/login-375x667.png) | [`screenshots/g5/login-414x896.png`](screenshots/g5/login-414x896.png) | |
| `/dashboard` | [`screenshots/g5/dashboard-375x667.png`](screenshots/g5/dashboard-375x667.png) | [`screenshots/g5/dashboard-414x896.png`](screenshots/g5/dashboard-414x896.png) | Requires member session |
| `/programs` | [`screenshots/g5/programs-375x667.png`](screenshots/g5/programs-375x667.png) | [`screenshots/g5/programs-414x896.png`](screenshots/g5/programs-414x896.png) | |
| `/find-your-path` | [`screenshots/g5/find-your-path-375x667.png`](screenshots/g5/find-your-path-375x667.png) | [`screenshots/g5/find-your-path-414x896.png`](screenshots/g5/find-your-path-414x896.png) | |
| `/employer` | [`screenshots/g5/employer-375x667.png`](screenshots/g5/employer-375x667.png) | [`screenshots/g5/employer-414x896.png`](screenshots/g5/employer-414x896.png) | Use [`../portal-screenshots/employer-mobile-390.png`](../portal-screenshots/employer-mobile-390.png) until G5 captures exist |
| `/partners` | [`screenshots/g5/partners-375x667.png`](screenshots/g5/partners-375x667.png) | [`screenshots/g5/partners-414x896.png`](screenshots/g5/partners-414x896.png) | Marketing `/partners` (not `/partner` portal) |
| `/counselor` | [`screenshots/g5/counselor-375x667.png`](screenshots/g5/counselor-375x667.png) | [`screenshots/g5/counselor-414x896.png`](screenshots/g5/counselor-414x896.png) | Use [`../portal-screenshots/counselor-mobile-390.png`](../portal-screenshots/counselor-mobile-390.png) until G5 captures exist |

---

## Global chrome (all marketing routes with `main-nav`)

| Issue | 375×667 | 414×896 | Evidence |
|-------|---------|---------|----------|
| **Fixed top nav** | `main-nav` ~81px tall, `z-index: 1000` | Same | Reduces usable viewport; hero CTAs need `scroll-padding-top` (present on `html` for bottom nav, verify top for anchor jumps). |
| **Cookie / consent layer** | Fixed `div`, ~154px tall, `z-index: 9999`, sits ~429–583px from top on 667px viewport | Same pattern, lower on 896px tall screen | Obscures mid-page content and competes with bottom nav on home/programs/FYP. Dismiss before auditing “final” funnel screenshots. |
| **Marketing bottom nav** | `#mobile-bottom-nav` fixed, ~72px + safe area | Same | Present on `/`, `/programs`, `/find-your-path`. **Absent** on `/apply`, `/apply/create-account`, `/login`, `/partners` (correct for funnel). |
| **Footer vs bottom nav** | When scrolled to footer, footer content extends under fixed bottom nav (`navTop` &lt; `footerBottom`) | Same | Confirms [`F-01`](../PORTAL-UI-UX-AUDIT-FINDINGS.md) pattern on marketing pages with bottom nav — last footer links need clearance via `padding-bottom` on `#main-content` (see `css/marketing.css` `--wap-mobile-bottom-nav-clearance`). Re-verify Privacy/Terms row is tappable after scroll. |

---

## Route-by-route findings

### `/` (homepage)

**Resolved URL:** `/en`  
**Screenshots:** [`screenshots/g5/home-375x667.png`](screenshots/g5/home-375x667.png), [`screenshots/g5/home-414x896.png`](screenshots/g5/home-414x896.png)

| Check | 375×667 | 414×896 |
|-------|---------|---------|
| Overflow | Pass | Pass |
| Tap targets &lt;44px (in viewport) | Pass | Pass |
| Fixed blockers | Top nav, cookie banner, `#mobile-bottom-nav` | Same |
| Font scale | **Fail** — hero step pill labels ~13.8px; trust line bullets 14px; language toggle 13px | **Fail** — same pattern |

**Notes:** Hero body uses `clamp()` that can render below 16px on narrow widths (see [`design-audit-2026-05-05.md`](../archive/design-audit-2026-05-05.md) §5). Two hero paragraphs plus three step pills before primary CTA increases cognitive load on 375px.

---

### `/apply`

**Resolved URL:** `/en/apply`  
**Screenshots:** [`screenshots/g5/apply-375x667.png`](screenshots/g5/apply-375x667.png), [`screenshots/g5/apply-414x896.png`](screenshots/g5/apply-414x896.png)

| Check | 375×667 | 414×896 |
|-------|---------|---------|
| Overflow | Pass | Pass |
| Tap targets | Pass (primary CTAs use `.btn` min-height) | Pass |
| Fixed blockers | Top nav + cookie banner only (no marketing bottom nav) | Same |
| Font scale | **Warn** — sidebar “Application Progress”, step labels, and “What happens next?” list at **14px** | Same |

**Notes:** Nav still shows “Apply Now” while user is in funnel (known P2 from design audit). Live audit [#21–22](../LIVE-PORTAL-AUDIT-2026-04-26.md): step 3 labels show `*` but first/last/email not `required` — mobile Safari validation gap.

---

### `/apply/create-account`

**Resolved URL:** `/en/apply/create-account`  
**Screenshots:** [`screenshots/g5/apply-create-account-375x667.png`](screenshots/g5/apply-create-account-375x667.png), [`screenshots/g5/apply-create-account-414x896.png`](screenshots/g5/apply-create-account-414x896.png)

| Check | 375×667 | 414×896 |
|-------|---------|---------|
| Overflow | Pass | Pass |
| Tap targets | Pass | Pass |
| Fixed blockers | Top nav + cookie banner | Same |
| Font scale | **Warn** — body copy ~14.4px; footer legal **12px** | Same |

**Notes:** Default state shows “couldn't find saved program choices” warning — long 14.4px paragraphs on narrow column. Footer column links at 14px.

---

### `/login`

**Resolved URL:** `/en/login`  
**Screenshots:** [`screenshots/g5/login-375x667.png`](screenshots/g5/login-375x667.png), [`screenshots/g5/login-414x896.png`](screenshots/g5/login-414x896.png)

| Check | 375×667 | 414×896 |
|-------|---------|---------|
| Overflow | Pass | Pass |
| Tap targets | Pass — password visibility control **48×44px** | Pass |
| Fixed blockers | Top nav + cookie banner | Same |
| Font scale | **Warn** — trust chips 13px; “Get started”, “Staff login”, portal destination links **14px**; cookie copy 13.6px | Same |

**Notes:** “Choose portal destination” Counselor/Employer links are text-sized at 14px but row padding may still meet 44px — verify visually in screenshots. Cookie banner can cover lower form fields on 667px height before scroll.

---

### `/dashboard` (member portal)

**Unauthenticated probe:** Redirects to `/en/login?redirectTo=%2Fdashboard` — findings below require **member session** (see screenshot paths).

**Screenshots:** [`screenshots/g5/dashboard-375x667.png`](screenshots/g5/dashboard-375x667.png), [`screenshots/g5/dashboard-414x896.png`](screenshots/g5/dashboard-414x896.png)

| Check | 375×667 | 414×896 | Source |
|-------|---------|---------|--------|
| Overflow | Not re-tested authenticated | Not re-tested | — |
| Tap targets | Course row buttons intended ≥44px in CSS; cramped horizontal layout | Same | Live audit #41 |
| Fixed blockers | Portal `MobileBottomNav` + top tab strip | Same | Live audit #20, #60; F-01 |
| Font scale / layout | **Fail** — mobile tab strip shows only 3 of 4 tabs (Jobs hidden); duplicate DOM blocks | Same at 414 width likely | Live audit #5–8, #20 |

**P1 mobile breakage (authenticated):**

1. **Top tab strip truncation** — at 375px only Home / My Program / AI Toolkit visible; Jobs tab dropped with no overflow affordance ([#20](../LIVE-PORTAL-AUDIT-2026-04-26.md)).
2. **Bottom nav overlaps footer** — Privacy/Terms partially hidden ([#F-01](../PORTAL-UI-UX-AUDIT-FINDINGS.md)).
3. **Training/program course rows** — status + title + two buttons on one row; labels wrap (`Open in / Coursera`) ([#41–42](../LIVE-PORTAL-AUDIT-2026-04-26.md)).
4. **Duplicate responsive trees** — two welcome blocks, two training lists in DOM ([#5–6](../LIVE-PORTAL-AUDIT-2026-04-26.md)) — increases scroll length and confuses screen-reader order on mobile.

---

### `/programs`

**Resolved URL:** `/en/programs`  
**Screenshots:** [`screenshots/g5/programs-375x667.png`](screenshots/g5/programs-375x667.png), [`screenshots/g5/programs-414x896.png`](screenshots/g5/programs-414x896.png)

| Check | 375×667 | 414×896 |
|-------|---------|---------|
| Overflow | Pass (page-level); PDJ nav uses **horizontal scroll** intentionally | Pass |
| Tap targets | PDJ tabs measure **~54px tall** (pass hit area) | Same |
| Fixed blockers | Top nav, cookie, `#mobile-bottom-nav`, sticky `programs-quiz-sticky` (~44px) | Same |
| Font scale | **Fail** — `.pdj-nav__label` computed **~10.4px** (`0.65rem` in `ProgramsDecisionJourneyNav.tsx`) | Same |

**Notes:** Four-up PDJ tab row requires horizontal swipe on 375px — acceptable if scroll affordance is visible (scrollbar hidden). Category chips / `text-label-upper` at 12px for section eyebrows.

---

### `/find-your-path`

**Resolved URL:** `/en/find-your-path`  
**Screenshots:** [`screenshots/g5/find-your-path-375x667.png`](screenshots/g5/find-your-path-375x667.png), [`screenshots/g5/find-your-path-414x896.png`](screenshots/g5/find-your-path-414x896.png)

| Check | 375×667 | 414×896 |
|-------|---------|---------|
| Overflow | Pass | Pass |
| Tap targets | PDJ tabs ~54px tall | Same |
| Fixed blockers | Top nav, cookie, `#mobile-bottom-nav` | Same |
| Font scale | **Fail** — PDJ labels ~10.4px; quiz chip 11.2px; body 14.4px | Same |

**Notes:** Shares PDJ nav component with `/programs`. Primary CTAs use `.btn` at 15px font (acceptable with 44px min-height).

---

### `/employer` (employer portal hub)

**Unauthenticated probe:** Redirects to `/en/login?redirectTo=%2Femployer`.

**Screenshots:** [`screenshots/g5/employer-375x667.png`](screenshots/g5/employer-375x667.png), [`screenshots/g5/employer-414x896.png`](screenshots/g5/employer-414x896.png) — interim: [`../portal-screenshots/employer-mobile-390.png`](../portal-screenshots/employer-mobile-390.png)

| Check | 375×667 | 414×896 | Source |
|-------|---------|---------|--------|
| Overflow | — | — | Re-test with employer session |
| Tap targets | KPI / assistant rows generally ≥44px in portal CSS | Same | `css/portal.css` |
| Fixed blockers | Workspace shell + `MobileBottomNav` | Same | F-01 |
| Font scale / IA | **Warn** — duplicate `h1`/hero blocks; assistant duplication | Same | F-02, F-03 |

**Notes:** Login gate shows portal switcher links (Counselor/Employer) at 14px. Sub-pages (e.g. `/employer/applications`) historically had dual mobile/desktop `PageHeader` — see [`PORTAL-UI-ONE-SHOT-TASK.md`](../PORTAL-UI-ONE-SHOT-TASK.md).

---

### `/partners` (marketing partners landing)

**Resolved URL:** `/en/partners`  
**Screenshots:** [`screenshots/g5/partners-375x667.png`](screenshots/g5/partners-375x667.png), [`screenshots/g5/partners-414x896.png`](screenshots/g5/partners-414x896.png)

| Check | 375×667 | 414×896 |
|-------|---------|---------|
| Overflow | Pass | Pass |
| Tap targets | Pass on sampled CTAs | Pass |
| Fixed blockers | Top nav + cookie only (**no** marketing bottom nav) | Same |
| Font scale | **Warn** — eyebrows 11.2–12px; partner logo chips 14px; step copy 14–15.2px | Same |

**Notes:** Long signup form at bottom — verify field `font-size: 16px` on inputs to prevent iOS zoom (global rule in `main.css` @ mobile). Partner **portal** is `/partner` (not in top-10 list).

---

### `/counselor` (counselor portal hub)

**Unauthenticated probe:** Redirects to `/en/login?redirectTo=%2Fcounselor`.

**Screenshots:** [`screenshots/g5/counselor-375x667.png`](screenshots/g5/counselor-375x667.png), [`screenshots/g5/counselor-414x896.png`](screenshots/g5/counselor-414x896.png) — interim: [`../portal-screenshots/counselor-mobile-390.png`](../portal-screenshots/counselor-mobile-390.png)

| Check | 375×667 | 414×896 | Source |
|-------|---------|---------|--------|
| Overflow | — | — | Re-test authenticated |
| Tap targets | Portal CSS enforces 44px on primary controls | Same | `css/portal.css` |
| Fixed blockers | Bottom nav + shell header | Same | F-01 |
| Font scale / copy | **Warn** — `Afternoon,Michael` missing space (F-04); duplicate welcome/assistant | Same | PORTAL-UI-UX-AUDIT-FINDINGS |

---

## Prioritized fix backlog (mobile parity only)

| Priority | Route(s) | Issue | Suggested fix |
|----------|----------|-------|----------------|
| P1 | `/programs`, `/find-your-path` | PDJ tab labels **10.4px** | Raise mobile `.pdj-nav__label` to **≥12px** (prefer 14px); keep `min-height: 44px`. |
| P1 | `/`, `/programs`, `/find-your-path` | Cookie banner + bottom nav stack | Raise dismiss prominence; defer bottom nav until consent resolved, or add bottom inset to banner. |
| P1 | `/dashboard` (+ portal) | Footer hidden under bottom nav | Verify `--wap-mobile-bottom-nav-clearance` on all portal layouts ([`marketing.css`](../marketing.css) workspace-shell rules). |
| P1 | `/dashboard` | Jobs tab missing at 375px | Scrollable tab strip or “More” overflow menu. |
| P2 | `/`, `/apply` | Body/support copy at 14px | Bump member-facing paragraphs to **16px** on `max-width: 767px`. |
| P2 | `/apply`, `/apply/create-account` | Funnel redundancy / validation | Suppress nav Apply CTA; fix required fields on step 3. |
| P2 | `/login` | 13–14px secondary copy | Align trust chips to 14px minimum; consider 16px on primary labels. |
| P2 | `/dashboard` | Cramped course action rows | Stack title / actions vertically on mobile. |
| P3 | `/partners` | 11.2px eyebrows | Increase to 12–14px for low-vision readers. |
| P3 | `/employer`, `/counselor` | Duplicate heroes | Single `h1` + collapsible assistant per hub. |

---

## Re-test checklist

1. Capture PNGs into `docs/audits/screenshots/g5/` using the index names above (both viewports, cookie dismissed).
2. Re-run automated probe with `.env.e2e.local` credentials against staging for `/dashboard`, `/employer`, `/counselor`.
3. Confirm footer link tap targets with bottom nav visible after full scroll on `/` and `/dashboard`.
4. Open PDJ nav on `/programs` at 375px — confirm horizontal scroll is discoverable.

---

## Machine-readable probe output

Full JSON from the 2026-05-19 production pass is available at `/tmp/g5-mobile-parity-report.json` on the audit runner (not committed).

*Audit-only deliverable for G5 mobile parity gate.*
