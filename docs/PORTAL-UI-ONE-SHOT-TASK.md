# One-shot task: Portal sub-page UI — single heading outline + responsive shell + visual polish

**Status:** In progress (partially shipped) · **Evidence:** (1) Live **accessibility snapshots** and (2) **pixel screenshots** on `https://workforceap-beta.vercel.app` (authenticated employer session where noted), 2026-04-08 · **Companion:** [`PORTAL-UI-UX-ENHANCEMENTS.md`](./PORTAL-UI-UX-ENHANCEMENTS.md), [`PORTAL-UI-UX-AUDIT-FINDINGS.md`](./PORTAL-UI-UX-AUDIT-FINDINGS.md) (F-02, F-05).

**Visual artifact index:** [`portal-screenshots/README.md`](./portal-screenshots/README.md) — hub PNGs + `subpages-desktop/` captures; extend the table as you add routes.

---

## Problem (one sentence)

Most portal **sub-pages** render **two parallel layouts** (mobile + desktop) that each include a **`<h1>` / `PageHeader`**, so the accessibility tree can expose **multiple identical top-level titles** on one URL and the same content regions appear twice—this is the dominant UX/a11y defect across employer, partner, counselor, and member surfaces. **Visual polish** (contrast, duplicate heroes, spacing) should be validated with **viewport screenshots**, not only a11y trees.

---

## Audit method (use both)

| Layer | What to capture | When |
|--------|-----------------|------|
| **Visual** | PNG at **~1280×800** (desktop) and optionally **~390×844** (mobile); save under [`docs/portal-screenshots/`](./portal-screenshots/) and record in [`portal-screenshots/README.md`](./portal-screenshots/README.md). | Layout, typography, card emphasis, tour overlays, “does this look finished?” |
| **DOM / a11y** | Browser accessibility snapshot or screen reader — count `h1` with the same name, duplicate regions. | Heading hierarchy, F-02 verification after code changes |

Do **not** treat accessibility-tree dumps as a substitute for screenshots when the goal is **polish**; they answer different questions.

---

## Root cause

- Pattern: a **mobile** wrapper (`wa-block` / `wa-md:wa-hidden`) and a **desktop** wrapper (`wa-hidden wa-md:wa-block`), **both** containing `PageHeader` or `<h1>` with the same copy.
- Screen readers and automated audits see **2–3× `h1`** with the same text (e.g. “My Jobs”, “Messages”, “Job Match Scorer”).
- Secondary: **sidebar `listitem`** names still concatenate without spaces (`WorkflowsWork queue…`) — F-05.
- Tertiary: some **list rows** expose concatenated strings (e.g. name + email with no separator) in the a11y tree.

---

## Shipped in this initiative (changelog-backed)

| Change | Effect |
|--------|--------|
| **`/employer/jobs` — single shared `PageHeader`** (`app/(portal)/employer/jobs/page.tsx`) | One **`h1` “My Jobs”** for the route: responsive subtitle + responsive actions (mobile Post Job vs desktop Import + Post). Removed duplicate mobile/desktop headers and the extra **`wa-sr-only`** `h1`. Desktop body remains inside `PortalPageFrame` without a second title. |
| **`PageHeader` / `PortalPageFrame` subtitle type** | `subtitle` accepts **`ReactNode`** so responsive subtitle lines (mutually visible spans) are valid without duplicate headings. |
| **Employer applications — mobile cards** (`components/employer/MobileApplicationsClient.tsx`) | Job title line uses **`var(--color-on-surface-variant)`** + restrained weight/tracking instead of loud gold/uppercase emphasis (visual WCAG-friendly polish). |
| **Screenshot archive** | `docs/portal-screenshots/subpages-desktop/employer-applications.png`, `employer-guide.png` + [`portal-screenshots/README.md`](./portal-screenshots/README.md) index. |

**Re-audit note:** `/employer/jobs` was previously **3× “My Jobs”**; after the merge it should present **one** logical page title. Re-verify with a fresh snapshot after deploy.

---

## Evidence — employer sub-pages (static)

Visited on desktop viewport (~1280×800). Duplicate `h1` counts are from **browser accessibility snapshots** unless marked **re-test**.

| Path | Duplicate `h1` (before → after) | Screenshot | Notes |
|------|-----------------------------------|------------|--------|
| `/employer/applications` | **2×** “Applicants (1)” | Yes — [`subpages-desktop/employer-applications.png`](./portal-screenshots/subpages-desktop/employer-applications.png) | Dual `PageHeader`; mobile job-line polish shipped. Still needs **single-header** refactor. |
| `/employer/guide` | **0** | Yes — [`subpages-desktop/employer-guide.png`](./portal-screenshots/subpages-desktop/employer-guide.png) | Marketing-style guide; OK. |
| `/employer/jobs` | **3×** → **1×** (expected) | Pending re-capture | **Fixed:** unified `PageHeader` — confirm in snapshot + new PNG post-deploy. |
| `/employer/jobs/import` | **0** | No | Single hero “Add roles from your site”. |
| `/employer/jobs/new` | **2×** “Post New Job” | No | Mobile hero + desktop form header — still outstanding. |
| `/employer/matches` | **3×** “Match History” | No | Same dual-`PageHeader` family as pre-fix jobs. |
| `/employer/messages` | **3×** “Messages” | No | Plus duplicate “Inbox” **h2** in some trees. |
| `/employer/pipeline` | **3×** “Candidate Pipeline” | No | Pipeline cards duplicated in tree. |
| `/employer/settings` | **0** | No | Single “Company settings”. |
| `/employer/work-queue` | **0** | No | Single “Work queue”. |

**Hub** `/employer` was improved earlier (see enhancements doc); sub-pages above are **mixed** — jobs is done; others remain.

**Dynamic (not re-tested here):** `/employer/jobs/[id]`, `/employer/candidates/[studentId]` — spot-check from list rows.

---

## Evidence — partner sub-pages (static)

| Path | Duplicate `h1` | Screenshot | Notes |
|------|------------------|------------|--------|
| `/partner/attention` | **0** | No | Single “Attention queue”. |
| `/partner/exports` | **0** | No | Single “Exports”. |
| `/partner/guide` | **0** | No | Single hero. |
| `/partner/members` | **n/a** | No | **Redirects** to `/partner/referred-members`. |
| `/partner/messages` | **2×** “Messages” | No | Subtitles differ slightly but both `h1`. |
| `/partner/milestones` | **2×** “Milestones” | No | Loading placeholders duplicated in tree. |
| `/partner/outcomes` | **0** | No | Single “Outcomes snapshot”. |
| `/partner/referred-members` | **2×** “Referred members” | No | Dual header. |
| `/partner/resources` | **2×** “Partner resources” | No | Entire contact + link blocks duplicated. |
| `/partner/settings` | **0** | No | Single “Settings”. |

**Redirect:** `/partner/members` → `/partner/referred-members` — ensure nav links point to **referred-members** directly.

---

## Evidence — counselor sub-pages (static)

| Path | Duplicate `h1` | Screenshot | Notes |
|------|------------------|------------|--------|
| `/counselor/guide` | **0** | No | Single hero; optional metadata alignment. |
| `/counselor/messages` | **2×** “Student Messages” | No | Duplicate **h2** blocks. |
| `/counselor/resources` | **2×** “Resources” | No | Full section duplicated. |
| `/counselor/students` | **2×** “My students” | No | Empty state duplicated. |

---

## Evidence — member (sample)

| Path | Duplicate `h1` | Notes |
|------|------------------|--------|
| `/dashboard/training` | **2×** “My Training” | Breadcrumb + dual hero. |
| `/dashboard/ai-tools/job-match-scorer` | **2–3×** “Job Match Scorer” | `PageHeader` + hero `h1`. |

**Remaining member routes:** See grep for `PageHeader` + `<h1` under `app/(portal)/dashboard/ai-tools/`. Full table: [`MEMBER-PAGES-AUDIT.md`](./MEMBER-PAGES-AUDIT.md).

---

## Evidence — admin (sample)

| Path | Duplicate `h1` | Notes |
|------|------------------|--------|
| `/admin/members` | **0** | Simpler single-column pattern. |

**Other admin routes:** Spot-check any page using the same mobile/desktop dual wrapper as portals.

---

## Recommended fix (engineering) — status

1. **Extract a single title region** per route: **one** `h1` and optional subtitle **outside** breakpoint wrappers; inside wrappers use **non-heading** styled text or remove repeated titles. — **Partially done for `/employer/jobs`.**
2. **OR** **`aria-hidden="true"`** on the inactive breakpoint’s root when not active (client hook or verified CSS technique). — Not started at scale.
3. **OR** collapse to **one responsive column** per route — largest refactor, best long-term.
4. **Employer list/detail family:** apply the **same pattern as jobs** to `applications`, `matches`, `messages`, `pipeline`, `jobs/new`. — **Jobs done**; rest queued.
5. **Partner/Counselor messages & resources:** one `PageHeader` per route. — Queued.

**Do not** add more `wa-sr-only` `h1`s to mask duplicates; **remove** them when merging headers (as on jobs).

---

## Acceptance criteria

- [ ] For every static path in [`scripts/lib/portal-audit-paths.mjs`](../scripts/lib/portal-audit-paths.mjs) under **employer**, **partner**, and **counselor**, the page has **at most one `h1`** in the accessibility tree at desktop and mobile widths — **employer `/employer/jobs` expected to pass; others pending.**
- [ ] **Visual:** each static employer/partner/counselor sub-page has a **desktop PNG** on file (or explicitly waived) under [`docs/portal-screenshots/`](./portal-screenshots/) with row in [`portal-screenshots/README.md`](./portal-screenshots/README.md).
- [ ] No duplicate **visible** hero blocks for the same section (assistant rows tracked separately if required).
- [ ] Spot-check **dynamic** URLs when list data exists.
- [ ] Member **AI tool** routes: merge `PageHeader` + inline `h1` per cover-letter / interview-practice pattern.
- [ ] Optional: `npm run audit:portal` + manual SR spot-check on 3 routes.

---

## Suggested implementation order (updated)

1. ~~**Employer `jobs`**~~ — **Done** (unified header + remove sr-only duplicate).
2. **Shared primitive:** document the **`/employer/jobs` pattern** (shared header block + responsive subtitle/actions + single `PortalPageFrame` for desktop-only body) for copy-paste to other routes.
3. **Employer:** `applications`, `matches`, `messages`, `pipeline`, `jobs/new` (highest traffic after jobs).
4. **Partner:** `messages`, `milestones`, `referred-members`, `resources`.
5. **Counselor:** `messages`, `resources`, `students`.
6. **Member:** `/dashboard/training`, `/dashboard/messages`, then AI tools batch grep.
7. **Screenshots:** batch capture remaining static paths into `subpages-desktop/` / `subpages-mobile/` and update the README table (dismiss employer tour first if needed).

---

## Out of scope (separate tickets)

- Sidebar **F-05** listitem labeling (workspace nav component).
- **Partner** `/partner/members` redirect UX and default document title during redirect.
- **Employer** onboarding tour blocking screenshots — dismiss tour or use accounts with `tourCompletedAt` for clean PNGs.

**Visual polish (ongoing, not a separate ticket):** stat card emphasis, voice vs assistant duplication (**F-03**), remaining contrast tweaks — track via screenshots + code; **mobile applicant job title** line addressed in `MobileApplicationsClient`.

---

## 10-star bar — visual review + fixes to take (2026-04-08)

**What “10” means here:** one coherent **heading story** (no duplicate `h1`s), **WCAG AA**-friendly text on real backgrounds, **consistent** radii/spacing/controls across hubs and sub-pages, **no orphan layouts** or “developer default” empty states, and **hub** polish (tour, KPIs, voice block) that matches sub-page quality.

This section **merges** the structural backlog above with a **pixel-level** pass on archived PNGs (`portal-screenshots/`) and known code hotspots.

### Tier A — Structural (must ship for “done”)

| # | Fix | Why it reads as quality | Where |
|---|-----|---------------------------|--------|
| A1 | **Single `PageHeader` / one `h1` per route** for every split mobile/desktop page still listed in the evidence tables | Removes duplicate heroes and SR noise; matches Stripe-grade portals | Employer: `applications`, `matches`, `messages`, `pipeline`, `jobs/new`; partner: `messages`, `milestones`, `referred-members`, `resources`; counselor: `messages`, `resources`, `students`; member: `training`, `messages`, AI tools |
| A2 | **Sidebar F-05** — spaced labels in workspace nav (`Workflows` vs `Work queue`…) | Reads as broken in SR and in some audits | `components/portal/PortalShell.tsx` (or nav data source) |
| A3 | **Dynamic routes** spot-check — job, candidate, student detail | Duplicate title pattern on detail pages undermines A1 | `employer/jobs/[id]`, `employer/candidates/[studentId]`, `counselor/students/[memberId]`, etc. |

### Tier B — Contrast & color system (WCAG + brand cohesion)

| # | Fix | Visual evidence / code | Where |
|---|-----|------------------------|--------|
| B1 | **Remove “loud gold” for primary metadata** — job titles, status lines on **light** surfaces should use **`on-surface` / `on-surface-variant`**, with gold only for intentional highlights | PNGs: employer hub **Recent Applicants** job line still uses `var(--color-gold)`; mobile applicant cards: status **reviewing** still pairs gold text with pale yellow bg — verify contrast | `app/(portal)/employer/page.tsx` (~recent applicant job title); `MobileApplicationsClient.tsx` (status chip text/bg) |
| B2 | **Partner KPI “Certificates” number** — gold `0` on gray reads decorative and may fail contrast | `partner-desktop-1280.png` | `app/(portal)/partner/page.tsx` — `PortalKpiCard` with `accent="gold"`; consider **`accent` token** that uses darker numeral on light mode |
| B3 | **Employer hub stat semantics** — large **red** numerals can read as “error” | `employer-mobile-390.png` | Tone down to **brand accent** or **on-surface** with label carrying meaning; avoid alarm red for neutral counts |
| B4 | **Desktop applicants table** already uses accent links — keep **no gold** in table cells; re-screenshot after A1 | Confirm in `EmployerApplicationsClient.tsx` |

### Tier C — Layout, density, rhythm

| # | Fix | Visual evidence | Where |
|---|-----|-----------------|--------|
| C1 | **Employer guide — third step card orphan** (2+1 grid leaves dead space) | `employer-guide.png` | `app/(portal)/employer/guide/page.tsx` — **3 columns** from `md` up, or **single column** stack with max-width; align step icon treatments (01 solid vs 02/03 pink) for **one system** |
| C2 | **Employer hub — voice assistant card** — reduce vertical fluff; align **Start voice session** width to content or grid | `employer-mobile-390.png` / desktop hub | `app/(portal)/employer/page.tsx` (voice section) |
| C3 | **Primary CTA strip** (“Review N candidates”) — **border radius** and shadow aligned with cards above | Hub PNGs | Same file — match `border-radius` tokens to `portal-card` |
| C4 | **Partner hub — header control row** — unify **height, padding, border** for Test badge, theme toggle, Partner dropdown, external link | `partner-desktop-1280.png` | Portal header components / `partner/page.tsx` wrapper |
| C5 | **Partner — KPI vertical rhythm** — slightly more **margin between cards** so they scan as four distinct tiles | Same PNG | `partner/page.tsx` grid gaps |
| C6 | **Counselor hub — empty roster** — replace “dashed box developer default” with **soft filled surface** + icon, consistent with other portal empty states | `counselor-desktop-1280.png` | `app/(portal)/counselor/page.tsx` |
| C7 | **Counselor — assistant row** — larger tap target / type scale; optional **chevron** instead of only “(tap to open)” | Same | Hub assistant strip |

### Tier D — Product chrome & copy

| # | Fix | Notes |
|---|-----|--------|
| D1 | **Onboarding tour** — **Back** disabled state contrast**; ensure Skip/Next hit areas match | `employer-desktop-1280.png` (tour open) | Tour client component + tokens |
| D2 | **Voice vs assistant (F-03)** — one clear “assistant” entry per viewport; shorten redundant **“Employer assistant” / “Employer voice assistant”** copy on hub | Employer hub |
| D3 | **Partner `/partner/members` redirect** — nav targets **`referred-members`** directly; title flash | Listed in out-of-scope but affects perceived polish |

### Tier E — Coverage & regression safety

| # | Fix | Notes |
|---|-----|--------|
| E1 | **Screenshot matrix** — every static path in `portal-audit-paths.mjs` (employer/partner/counselor) has **desktop + one mobile** PNG in `docs/portal-screenshots/` after changes | [`portal-screenshots/README.md`](./portal-screenshots/README.md) |
| E2 | **Optional:** `npm run audit:portal` in CI on preview | Catches route drift |

### Suggested sequencing to “10” (compressed)

1. **A1** (duplicate headers) — highest leverage for trust + a11y.  
2. **B1–B3** (gold/red/stat semantics) — fastest visible upgrade on hubs + applicants.  
3. **C1, C4, C6** (guide grid, partner header, counselor empty) — layout wins in screenshots.  
4. **C2, C3, C5, C7** — density and micro-alignment.  
5. **A2, D1–D3, E1** — chrome, tour, and proof.

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 2026-04-08 | Audit sweep | Initial evidence from live snapshots + code pointers. |
| 2026-04-08 | Follow-up | **Visual audit** method + screenshot README; **`/employer/jobs`** unified header shipped; **PageHeader** `ReactNode` subtitle; **MobileApplicationsClient** job title styling; evidence tables updated with **shipped** / **screenshot** columns and revised implementation order. |
| 2026-04-08 | Visual + plan | **§ 10-star bar** — tiered backlog (A–E) from hub/sub-page PNG review + code hotspots; sequencing for contrast, layout, chrome, and screenshot coverage. |
