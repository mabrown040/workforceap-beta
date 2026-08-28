# Portal UI/UX audit — consolidated findings

This document captures a **full-surface inventory** plus **live verification** on `https://workforceap-beta.vercel.app` using a **super-admin test account** (intentional: one user can open member, admin, counselor, partner, and employer routes). It is meant to drive **prioritized fixes** in follow-up work—not to replace per-role QA before release.

**Related:** [`PORTAL-PRE-PR-AUDIT.md`](./PORTAL-PRE-PR-AUDIT.md) (pre-merge checklist and shell notes).

---

## 1. Testing context

| Item | Detail |
|------|--------|
| **Account** | Super-admin / elevated privileges **on purpose** for testing. |
| **Implication** | You will **not** see “access denied” on role-gated pages. **Single-role** sessions (member-only, employer-only, etc.) may still differ for redirects, empty states, and nav visibility. Re-verify critical flows with **dedicated test users** before release. |
| **Host used for live checks** | `workforceap-beta.vercel.app` (session/cookies tied to this origin). |
| **Preview deployments** | **Separate origin** → separate cookies. Sign in again on each preview URL to audit there, or rely on production/staging parity. |

---

## 2. Route inventory (codebase — complete)

Counts are from `app/(portal)/**/page.tsx`, `app/admin/**/page.tsx`, etc.

| Area | Approx. routes | Notes |
|------|------------------|--------|
| **Member** | ~61 static paths + dynamics | Under `/dashboard/**` plus `/account`, `/applications`, `/certifications`, `/help`, `/profile`, `/resources`, `/resources/[id]`. |
| **Admin** | 42 | `/admin` tree including dynamic segments (`/admin/members/[id]/lifecycle`, `/admin/blog/[id]/edit`, …). |
| **Partner** | 13 | `/partner/**` |
| **Employer** | 13 | `/employer/**` |
| **Counselor** | 6 | `/counselor/**` (not the same as **`/dashboard/counselor`**, which is the **member** surface for counselor-related content). |

> **Current-state note (2026-08-28):** `/dashboard/counselor` is Lilley, the member AI career coach. It uses member/program context and is not staff or caseload tooling. Historical snapshots below retain the wording that existed when this audit was run.

**Dynamic routes** (need a real ID from a list page): e.g. `/dashboard/jobs/[id]`, `/dashboard/career-library/[id]`, `/employer/jobs/[id]`, `/employer/candidates/[studentId]`, `/partner/members/[id]`, `/counselor/students/[memberId]`, `/admin/members/[id]`, etc.

---

## 3. What was verified in the browser (representative, not every URL)

Live navigation covered **hub pages** across roles to confirm shells load, primary content renders, and obvious layout/a11y issues appear in snapshots:

- **Member:** `/dashboard`, `/dashboard/training`, `/dashboard/ai-tools`, `/dashboard/messages`
- **Admin:** `/admin`
- **Counselor:** `/counselor`
- **Partner:** `/partner`
- **Employer:** `/employer`

**Sub-pages & rest of tree:** Hub screenshots and a **route-by-route note table** (employer, partner, counselor sub-pages; member/admin pointers; dynamic segments) live in [`PORTAL-UI-UX-ENHANCEMENTS.md`](./PORTAL-UI-UX-ENHANCEMENTS.md) § “Route coverage & sub-page notes.” Source of truth for URL lists: [`scripts/lib/portal-audit-paths.mjs`](../scripts/lib/portal-audit-paths.mjs).

**Not done:** Opening **every** static route in the table above, and **every** dynamic variant. Use the inventory + Playwright or a checklist pass to close that gap.

**Viewport:** Mobile width (**390×844**) used for overlap/footer checks on at least one member view.

---

## 4. Findings (prioritized)

### P0 — Layout / usability

| ID | Finding | Evidence / notes | Suggested direction |
|----|---------|------------------|---------------------|
| **F-01** | **Fixed bottom nav overlaps footer content** on mobile (Privacy / Terms / Contact partially hidden under the bar). | Observed on scrolled member view with bottom tab chrome. | Ensure **`MobileBottomNav` in-flow spacer** (or equivalent padding on `workspace-shell-main` / page templates) is **deployed on this host** and applied on **all** layouts that use the bottom nav—including tabbed shells (e.g. Connect/messages patterns). Re-test after deploy. |

### P1 — Accessibility & information architecture

| ID | Finding | Evidence / notes | Suggested direction |
|----|---------|------------------|---------------------|
| **F-02** | **Multiple `h1` / duplicate “hero” blocks** on several dashboards—same page reads like two stacked landing sections. | **Member dashboard:** repeated “Welcome back” style headings. **Training:** two **`h1` “My Training”**. **Messages:** **`h1` “Messages”** twice in the a11y tree. **Admin:** **`h1` “Admin Overview”** + **`h1` “Admin Dashboard”**. **Partner:** **`h1` “Test Students”** (org) + **`h1` “Partner overview”**. **Counselor:** two **`h1`** welcome variants. **Employer:** strong secondary hero under stats + **`h1` “Employer overview”**. | Enforce **one `h1` per page**; demote repeated titles to **`h2`/`h3`**; collapse duplicate assistant/hero rows into a single composable header. |
| **F-03** | **Repeated “voice assistant” / assistant blocks** (duplicate sections with similar headings). | Partner, employer, counselor snapshots show near-duplicate assistant regions. | Deduplicate component usage or consolidate into one sticky/collapsible module. |

### P2 — Copy / micro-UX

| ID | Finding | Evidence / notes | Suggested direction |
|----|---------|------------------|---------------------|
| **F-04** | **Missing space in greeting:** `Afternoon,Michael` | Counselor dashboard snapshot (accessibility tree). | Fix string formatting: `Afternoon, Michael` (and audit similar time-based greetings). |

### P3 — Navigation / assistive tech (verify visually)

| ID | Finding | Evidence / notes | Suggested direction |
|----|---------|------------------|---------------------|
| **F-05** | **Nav `listitem` labels concatenated without spaces** in the a11y tree (e.g. `OverviewMy ProgramTraining`, `WorkflowsAI Tools…`). | Member/partner/counselor snapshots. | Confirm whether this is **only** tree serialization or **visible** UI; ensure **visible labels** and **`aria-label`s** have proper spacing for screen readers. |

### P4 — Consistency

| ID | Finding | Evidence / notes | Suggested direction |
|----|---------|------------------|---------------------|
| **F-06** | **Shell chrome differs** between some member routes (e.g. full header with “Open menu” vs lighter top chrome on **AI Tools** snapshot). | Compare `/dashboard/training` vs `/dashboard/ai-tools` snapshots. | Align **WorkspaceShell** (or page-level wrappers) so every member route shares the same header/sidebar/breadcrumb behavior. |

### Privacy / QA process (non-code)

| ID | Finding | Notes |
|----|---------|--------|
| **F-07** | Admin “Recent signups” can expose **real email addresses** in the UI. | For screenshots, demos, and external audit docs, use **staging**, **redacted** data, or **test accounts** only. |

---

## 5. Code-adjacent items already tracked elsewhere

| Topic | Status |
|-------|--------|
| **Mobile bottom clearance** | Prior work added **`.portal-mobile-bottom-nav-spacer`** in `MobileBottomNav` for **non-marketing** variants; **marketing** routes keep existing padding. Confirm production/preview builds include this and re-run **F-01**. |
| **Shell / `data-portal-role` / grids** | See [`PORTAL-PRE-PR-AUDIT.md`](./PORTAL-PRE-PR-AUDIT.md). |

---

## 6. Recommended follow-up passes

1. **Deploy check:** Confirm spacer / shell fixes on the environment you audit (`workforceap-beta` vs branch previews).
2. **Per-role sign-in:** Run the same checklist with **member-only**, **employer-only**, **partner-only**, **counselor-only** test users.
3. **Dynamic routes:** For each `[id]` / `[slug]` route, open **one** real row from a list page.
4. **Automation:** Playwright + **stored `storageState`** per role; loop over a **CSV/JSON URL list** derived from §2; optional screenshot diff on key hubs.
5. **Work through findings:** Use **F-01–F-07** as tickets; close each with route + viewport + before/after screenshot.

---

## 7. Changelog

| Date | Change |
|------|--------|
| 2026-04-08 | Initial consolidated findings from codebase inventory + live super-admin session on `workforceap-beta.vercel.app`. |
| 2026-04-08 | Employer, partner, counselor hub screenshots added under `docs/portal-screenshots/`; heading + assistant spacing fixes recorded in [`PORTAL-UI-UX-ENHANCEMENTS.md`](./PORTAL-UI-UX-ENHANCEMENTS.md). |
| 2026-04-08 | Added sub-page / “rest of tree” coverage notes (employer, partner, counselor tables; member + admin pointers; dynamic segments) in [`PORTAL-UI-UX-ENHANCEMENTS.md`](./PORTAL-UI-UX-ENHANCEMENTS.md). |
| 2026-04-08 | Live sweep of employer/partner/counselor sub-pages + member/admin samples; findings and **one-shot fix task** in [`PORTAL-UI-ONE-SHOT-TASK.md`](./PORTAL-UI-ONE-SHOT-TASK.md). |
