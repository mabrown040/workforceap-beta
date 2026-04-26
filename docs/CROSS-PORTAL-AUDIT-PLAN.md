# Cross-portal audit — execution plan

This plan coordinates **route coverage**, **automation**, **manual UX**, and **role-appropriate QA** across **member**, **admin**, **employer**, **partner**, and **counselor** surfaces. It builds on [`MEMBER-PAGES-AUDIT.md`](./MEMBER-PAGES-AUDIT.md) and [`PORTAL-UI-UX-AUDIT-FINDINGS.md`](./PORTAL-UI-UX-AUDIT-FINDINGS.md).

---

## 1. Objectives

| Goal | Success criteria |
|------|------------------|
| **No broken static routes** | Every static path loads without an unauthenticated redirect to `/login` for a user who should have access. |
| **Dynamic routes spot-checked** | At least one real ID/slug per dynamic pattern is opened from a list page. |
| **UX consistency** | Shell (`WorkspaceShell`), heading hierarchy, mobile bottom clearance, focus states — tracked in findings docs, not only in automation. |
| **Repeatable runs** | One command reproduces the route pass; output is committed or archived for comparison. |

---

## 2. Inventory (automation scope)

| Surface | Static paths (automated) | Dynamic paths (manual / spot-check) |
|---------|--------------------------|-------------------------------------|
| Member | 41 | 4 patterns |
| Admin | 33 | 9 patterns |
| Employer | 12 | 2 patterns |
| Partner | 12 | 2 patterns |
| Counselor | 5 | 1 pattern |

**Source of truth:** `scripts/lib/portal-audit-paths.mjs` — update when adding `page.tsx` routes.

**Subagent verification (2026-04-08):** Parallel codebase walks confirmed admin JSON array and employer/partner/counselor path sets align with `app/admin` and `app/(portal)/{employer,partner,counselor}`.

---

## 3. Phases

### Phase A — Automated static route pass (required each release)

1. Set environment variables (same pattern as Playwright e2e):
   - `PLAYWRIGHT_BASE_URL` — e.g. `https://workforceap-beta.vercel.app` or `http://localhost:3000`
   - `PLAYWRIGHT_MEMBER_EMAIL`
   - `PLAYWRIGHT_PORTAL_PASSWORD`
2. Run **`npm run audit:portal`** (all sections) or restrict with `PORTAL_AUDIT_SECTION=admin` (etc.).
3. Inspect **`docs/portal-audit-results.json`**: any `stuckLogin: true` means that path bounced to login — investigate role gating vs middleware.
4. Optional: **`npx playwright test tests/e2e/cross-portal-routes.spec.ts`** with the same env (skips if unset).

**Account note:** A **super-admin** test user exercises every surface in one run. For **realistic** checks, repeat Phase A with **single-role** accounts (member-only, employer-only, …) and expect some rows to redirect or show access messaging — document those as expected.

### Phase B — Dynamic routes (manual checklist)

For each entry in `DYNAMIC_PATHS` in `portal-audit-paths.mjs`:

1. Open the parent list/index route.
2. Click through to one detail URL (or paste a known ID from staging DB).
3. Record in [`CROSS-PORTAL-PAGES-AUDIT.md`](./CROSS-PORTAL-PAGES-AUDIT.md) (spot-check table) or ticket.

### Phase C — Visual / UX pass (sampled)

Per surface, at **390px** and **1280px** width:

- Scroll to bottom: footer not hidden under fixed bottom nav (member/employer/partner/counselor where applicable).
- One form page: labels, errors, primary action visible.
- One data-dense page: table/card grid does not force horizontal page scroll.

Use [`PORTAL-PRE-PR-AUDIT.md`](./PORTAL-PRE-PR-AUDIT.md) for shell-specific checks.

### Phase D — CI integration (optional)

- Add a **scheduled** or **manual** workflow that sets GitHub secrets for `PLAYWRIGHT_*` and runs `npm run audit:portal` against staging.
- Do **not** block PRs on full portal audit unless secrets and stable test users are guaranteed.

---

## 4. Commands reference

| Command | Purpose |
|---------|---------|
| `npm run audit:portal` | All static paths, all sections → `docs/portal-audit-results.json` |
| `PORTAL_AUDIT_SECTION=admin npm run audit:portal` | Admin only (PowerShell: `$env:PORTAL_AUDIT_SECTION='admin'; npm run audit:portal`) |
| `npm run audit:member-pages` | Member only → `docs/member-pages-live-results.json` |
| `npx playwright test tests/e2e/cross-portal-routes.spec.ts` | Same coverage as audit script, Playwright runner |

---

## 5. Subagent playbook (for future Cursor runs)

Use **parallel explore** subagents to:

1. **Diff-check** `portal-audit-paths.mjs` vs `glob **/page.tsx` under `app/admin` and `app/(portal)` — after large route refactors.
2. **Find** new `redirect()` or `next.config` redirects that change canonical URLs — update §Legacy tables in member/cross-portal docs.
3. **Scan** for new `MobileBottomNav` or layout wrappers on a surface — trigger Phase C for that surface only.

---

## 6. Deliverables checklist

- [x] Shared path data: `scripts/lib/portal-audit-paths.mjs`
- [x] Runner: `scripts/audit-portal-routes.mjs` + `npm run audit:portal`
- [x] Member script refactored to reuse shared member paths
- [x] Playwright: `tests/e2e/cross-portal-routes.spec.ts`
- [x] Summary doc: `docs/CROSS-PORTAL-PAGES-AUDIT.md`
- [ ] Run `npm run audit:portal` in CI or locally with secrets and commit `portal-audit-results.json` when stable

---

## 7. Changelog

| Date | Change |
|------|--------|
| 2026-04-08 | Initial cross-portal plan, unified audit runner, subagent route verification. |
