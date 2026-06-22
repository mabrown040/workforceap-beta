# WorkforceAP Portal — UI/UX Redesign Plan & Rollout

**Status:** Phase 0 (design kit) shipped to prod via PR #2067 · Phase 1 (member dashboard) behind `?ui=kit` on preview
**Branch:** `feature/portal-design-system`
**Owner:** Mike Brown
**Last updated:** 2026-06-22

This is the single source of truth for the portal reskin: the design direction, the
token/component system, the per-persona screen plan, the migration strategy, and the
preview/staging model. Companion spec for the component contracts: `docs/PORTAL_DESIGN_KIT.md`.

---

## 1. Design direction (locked)

**"Gold × Stat-Dense", expressed as a token-driven hybrid — not a per-page redesign.**

| Decision | Value |
|---|---|
| Brand colors | crimson `#ad2c4d` (primary), gold `#a47f38` (accent), blue `#2b7bb9` (info/support), green `#4a9b4f` (success) |
| Member surface | **Bold + Calm** — gradient hero, progress ring, KPI strip, one clear "do this next". Warmer, motivational, low cognitive load. |
| Staff/data surface | **Dense Command** — compact density, sharp corners, KPI strips + data tables, CSV/charts. Power-user "control room". |
| Navigation | **Top-nav for members** (+ mobile bottom-tabs); **sidebar for staff/admin** (collapsible drawer on mobile). |
| "Pop" | A **token setting** (`--wa-pop`, accent/radius/density), never a per-page hack. Intentional emphasis is dialed centrally. |
| Mobile | **Must work.** Dense tables collapse to stacked cards; member nav becomes bottom-tabs. |
| Accessibility | WCAG AA focus rings, reduced-motion aware, SVG icons only. |

Mode switching is done with `data-surface="warm" | "dense"` on a wrapper; component classes
(`.wa-kit-*`) consume CSS custom properties so the same component flexes between surfaces.

---

## 2. Design system (built, in code)

- **`css/portal-tokens.css`** — `:root` tokens + `[data-surface="warm"|"dense"]` overrides
  (density / pop / radius swap; brand colors constant). Imported into `css/portal.css`.
- **`css/portal-kit.css`** — `.wa-kit-card`, `.wa-kit-tag--*`, `.wa-kit-table`, etc. consuming `var(--wa-*)`.
- **`components/portal/kit/`** — ~22 components + `index.ts` barrel:
  - Primitives: `DesignSurface` (mode seam + `useSurface`), `StatTile`, `KpiStrip`, `StatusTag`,
    `SectionHeader`, `ProgressRing`, `ProgressBar`, `Avatar`
  - Data/layout: `DataTable` (dense desktop → stacked cards mobile), `FeatureTile`, `QueueRow`,
    `WorkQueueItem`, `KanbanBoard`, `BarChartMini`/`RankBars`, `FormField`/`Toggle`, `ChatThread`,
    `UniversalSearch`, `AppShellSidebar` (staff), `AppShellMember` (top-nav)
  - Page: `MemberDashboardKit` (Phase 1 — real member dashboard on the kit)
- **`app/dev/kit`** — storybook-lite proof page (both surface modes). Returns 200 on preview,
  404 on production (hidden via `VERCEL_ENV === 'production'`).
- **`app/dev/dashboard`** — preview-only proof of the member dashboard with representative data
  (does NOT hit the live member-data layer, so it always renders fast). Use this to review the
  reskin without signing in.

---

## 3. Personas & screen matrix

Five personas; for each, its job-to-be-done is the validation checklist ("does this view serve the goal?").

| Persona | Goal | Home | Working screen 1 | Working screen 2 |
|---|---|---|---|---|
| **Member** | Feel progress, know next step, get hired | Dashboard | My Program (training) | Jobs Pipeline |
| **Employer** | Review candidates fast, fill roles | Overview | Candidate Pipeline (Kanban) | Work Queue |
| **Partner** | Prove impact, catch members needing help | Overview | Attention Queue (risk tiers) | Outcomes / Exports |
| **Counselor** | Know who needs me today, act in one click | Overview | Triage (red/yellow/blue) | At-Risk (0–100 scoring) |
| **Admin** | Run the org at a glance, drill when needed | Command Center ("Today") | Students | Board Outcomes |

Grounded in real routes/components:
- Employer Kanban = `EmployerKanban`/`EmployerPipelineClient`; Work Queue = `EmployerWorkQueueClient`.
- Partner Attention = `PartnerAttentionClient` (high/med/low/watch + next-best-action); Outcomes = CSV export presets.
- Counselor Triage = `triageFlags.ts` (red: `no_activity_10d`, `sla_breach_48h`; yellow: `sla_warning_24h`, `stale_training`; blue: `milestone_reached`); At-Risk = `atRiskScoring.ts`.

Static mockups (3 concepts × 5 personas) live on the lab server (`/home/claw/workforceap-concept-*.html`) and were used to lock the direction above.

---

## 4. Migration strategy — strangler pattern

**Never break the live portal.** Convert page-by-page behind a flag; default stays the current UI.

1. **Gate:** new UI renders only with `?ui=kit`. Default (no flag) = existing dashboard, zero member impact.
   - Implemented in `app/(portal)/dashboard/page.tsx`: when `requestedUi === 'kit'`, return `<MemberDashboardKit … />`
     fed by the **same** data the current dashboard computes.
2. **Validate** the gated page on preview (logged in, real demo data).
3. **Flip default** for that page only once approved (remove the `?ui=kit` gate).
4. **Repeat** per page. Order: **member dashboard → admin "Today" → remaining portal pages.**

### Phase status
- **Phase 0 — kit foundation:** ✅ shipped to prod (PR #2067, `f2a2ab0`). All additive; `/dev/kit` proof page.
- **Phase 1 — member dashboard:** ✅ built (`MemberDashboardKit`), live behind `?ui=kit` on preview. Awaiting sign-off to flip default.
- **Phase 2 — admin "Today":** next.
- **Phase 3+ —** remaining portal pages on the kit.

---

## 5. Preview / staging model (the gate)

**One non-prod Supabase for dev + Preview; the prod Supabase only for Production.**

```
Local dev ──────┐
                ├──► Supabase DEMO (esbdrgaonplpvzmtrdhw) ──► seeded org + test users
Vercel Preview ─┘         ▲
                          │ (same env vars, Preview scope)
                   migrate + seed once
Merge to master ──► Vercel Production ──► Supabase PROD (jqddnyuszufndwwezdwp)
```

- Any `*.vercel.app` preview URL is the test surface. No `demo.workforceap.org` or permanent demo branch required.
- Cookies do **not** carry from prod → sign in on the preview URL itself.

### How it's wired today (verified live 2026-06-22)
- Preview (branch `feature/portal-design-system`) **is** pointed at the DEMO project, **not** prod:
  - `NEXT_PUBLIC_SUPABASE_URL = https://esbdrgaonplpvzmtrdhw.supabase.co`
  - auth cookie issued: `sb-esbdrgaonplpvzmtrdhw-auth-token`
  - runtime queries hit the demo Postgres (confirmed in demo DB logs)
- Production keeps prod values. `vercel.json` `buildCommand`/`ignoreCommand` guard previews
  (only `feature/portal-*` branches build; prod never builds off these branches).
- `scripts/check-supabase-env.mjs` fails the build if a preview points at the prod ref
  (DEMO_REF `esbdrgaonplpvzmtrdhw`, PROD_REF `jqddnyuszufndwwezdwp`).

### Env vars (Preview scope) — demo project values
```
NEXT_PUBLIC_SUPABASE_URL        → demo project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   → demo anon key
SUPABASE_SERVICE_ROLE_KEY       → demo service role
POSTGRES_PRISMA_URL             → demo pooler (6543, pgbouncer=true)   ← see §6 hazard
POSTGRES_URL_NON_POOLING        → demo direct/session (5432)
```

### Test account (demo)
`mabrown040@gmail.com` is provisioned as `super_admin` in the demo project
(`auth.users` + `public.users` + `public.profiles.role='super_admin'`, uid `1111…1111`).

---

## 6. Infra findings & fixes (2026-06-21/22 session)

These were the real reasons the logged-in preview "didn't work":

1. **Vercel SSO deployment-protection wall** blocked the login `POST /api/auth/login`
   (share links only cover GET page views) → black screen after sign-in.
   **Fix:** disabled `ssoProtection` on the project (demo data; safe). Login verified: `POST → 302 → /admin`, token issued.

2. **Demo DB schema drift** — the demo was `db push`'d from a much older schema and was missing
   **40 tables** (chapters, courses, notifications, coursera_*, etc.) and **61 columns**
   (`counselors.affiliation`, `partners.brand_color`, `users.onboarding_current_step`, …).
   Authenticated queries 500'd → page hang/black.
   **Fix:** additively synced the demo schema to the current Prisma schema (created the 40 tables +
   61 columns; kept existing seed data). `/api/auth/me` and `/profile` now 200.
   **Durable fix:** run `npm run db:migrate:deploy` against the demo DB so it tracks migrations going forward.

3. **Prisma interactive transactions hang over the transaction-mode pooler (6543).** ⚠️
   `prisma.$transaction(async (tx) => …)` (used by `loadMemberCareerBriefBundle`, `getMemberState`,
   admin queries) never resolves over Supabase's **transaction pooler** — the DB sits idle, the
   function 504s. Single-query pages (`/profile`) work fine; any page with an interactive
   transaction (member dashboard, admin) hangs. Pinpointed with `[dashtime]` render markers.
   **Preview fix (shipped):** `PRISMA_FLATTEN_TX=1` (Preview scope) flattens interactive
   transactions into plain queries; each self-sets its GUC via the per-query middleware (the path
   single queries already use). Safe because RLS is enabled but **not forced** here. Prod unaffected
   (flag unset → original interactive-transaction behavior).
   **Durable fix (recommended):** point Prisma's `url` (`POSTGRES_PRISMA_URL`) at the **session
   pooler (port 5432)** for transaction support, instead of the 6543 transaction pooler — then the
   `PRISMA_FLATTEN_TX` hack can be retired.

---

## 7. Open gate items (TODO before this is a clean, mergeable preview gate)

- [ ] **CI on master is red:** `/dev/kit` static prerender calls `resolveOrgFromRequest()` →
      `getDefaultOrganizationId()` at **build time**, hitting `localhost:5432` (CI stubs `DATABASE_URL`).
      **Fix:** skip org resolution at build time (same pattern as `shouldSkipOptionalDbQueriesAtBuild`).
- [ ] Run `npm run db:migrate:deploy` (and optional `SEED_DEMO=true npm run db:seed:demo`) against the
      demo DB so it tracks Prisma migrations instead of the manual sync done this session.
- [ ] Decide durable pooler fix (§6.3): session pooler vs keep `PRISMA_FLATTEN_TX` for preview only.
- [ ] Reconcile draft PR #2066 (agent bootstrap) to this model: one non-prod Supabase for dev+Preview,
      one prod for Production — drop the `demo.workforceap.org` branch/domain requirement (not needed;
      any `*.vercel.app` preview is the test surface).
- [ ] Flip member dashboard `?ui=kit` → default once signed off; then Phase 2 (admin "Today").

---

## 8. Quick links

- Preview component kit: `…/dev/kit` on the current preview deployment (200 on preview, 404 on prod)
- Preview dashboard proof (sample data, always renders): `…/dev/dashboard`
- Logged-in dashboard on real demo data: `…/en/dashboard?ui=kit` (sign in first)
- Component contracts: `docs/PORTAL_DESIGN_KIT.md`
- Static concept mockups: `/home/claw/workforceap-concept-{calm,dense,bold}.html` (lab server)
