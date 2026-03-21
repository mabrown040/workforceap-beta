# WorkforceAP — comprehensive platform review (repo-first)

**Date:** 2026-03-21  
**Scope:** Next.js 15 App Router app — public marketing site, member/partner/employer portals, admin, 100+ API routes, shared CSS, auth (Supabase), Prisma/Postgres.  
**Method:** Static codebase review (structure, representative routes, middleware, roles, cron, tests). **Not** a live penetration test or accessibility certification.

---

## Executive summary (CEO / product lens)

The product is **broad and ambitious**: a full funnel from discovery (programs, quiz, comparison, salary guide, jobs) through apply and multi-role portals, plus employer job workflows and a deep admin surface. Recent work improved **decision-support UX** (journey nav, comparison tool, login consolidation) and **abuse/cost guardrails** on employer AI import.

**Strengths:** Clear separation of marketing vs portal layouts; employer APIs generally **scope by `employerId`**; cron routes use **shared-secret** pattern; public jobs API filters to appropriate statuses; root layout includes **skip link**, metadata base, and analytics hooks; **error boundaries** exist at root, portal, and admin.

**Risks:** **Single global stylesheet** (~10k lines) increases regression cost. **Middleware is session-only** — real authorization lives in each API handler; completeness is a manual verification problem. **E2E coverage exists but is narrow** relative to route count. **Email and storage** remain high-impact audit surfaces (see linked security backlog).

**Bottom line:** The platform is **launch-capable** with strong UX momentum, but **operational maturity** (automated security/regression tests, CSS modularization, observability) should be the next investment tier after clearing the prioritized security backlog.

---

## 1. Surface inventory

| Area | Scale (approx.) | Notes |
|------|-----------------|--------|
| App `page.tsx` routes | ~100 | Public + auth + 3 portals + admin |
| API `route.ts` handlers | ~109 | Admin, member, employer, subgroup, AI, cron, auth |
| Middleware | 1 | Login gate for portal/admin **paths** only |

Representative **public** decision stack: `/`, `/programs`, `/programs/[slug]`, `/find-your-path`, `/program-comparison`, `/salary-guide`, `/jobs`, `/apply` (+ results / account creation).

---

## 2. User experience & information architecture

### 2.1 Public site

- **Positive:** Program discovery is intentionally linked (journey nav, comparison with shareable `?compare=` state, salary guide framing). Nav consolidates guest entry to **Sign in** with portal routing on `/login`.
- **Watch:** Keep **naming consistency** (Member vs Student, program titles vs slugs) synchronized in `lib/content/*` and validation schemas — drift breaks trust.
- **Watch:** Long **FAQ** and **jobs** filter UIs — periodic mobile pass under **640px** width on any new controls.

### 2.2 Member portal

- **Positive:** Dashboard hub pattern; AI tools behind authenticated APIs with rate limiting when Redis is configured.
- **Gap:** Information scent between **Learning**, **Training**, **Resources**, and **Program** can still confuse new users — consider a single “Your path” summary row linking the three.

### 2.3 Employer portal

- **Positive:** Card-based job board, bulk actions, import flows with fallbacks for brittle ATS pages.
- **Watch:** Import is **powerful** — ensure in-product copy sets expectations on review queue and parsing quality (already partially addressed).

### 2.4 Partner / subgroup (`/partner`, `/my-group`)

- **Positive:** Partner shell aligned with other portals; subgroup APIs show intentional scoping patterns in sampled routes.
- **Gap:** **Parity of polish** with employer/member — verify empty states, loading skeletons, and mobile drawers on all partner views.

### 2.5 Admin

- **Positive:** Rich operational tooling (members, jobs pipeline, partners, blog AI, invites).
- **Risk:** **Cognitive load** — new admins need in-app orientation or runbooks; consider lightweight “what this page does” leads on dense screens.

---

## 3. Accessibility & inclusive design

| Item | Observation |
|------|-------------|
| Skip link | Present in root layout (`#main-content`). |
| Focus / modals | Main nav implements mobile open/close and focus handling; duplicate in-drawer close was removed (merged fix). |
| Error pages | Branded system pages; digest shown for support correlation. |
| Forms | Prior passes fixed several `aria-*` issues — **regression-proof** with lint rules or component checklist on new forms. |
| **Not verified in this pass** | Full keyboard order on every admin table, color contrast on all dark hero variants, screen reader announcements on dynamic comparison table. |

**Recommendation:** Schedule a **manual WCAG 2.2 AA spot-check** (axe + VoiceOver/NVDA) on: apply flow, login, employer job editor, admin member detail.

---

## 4. Performance & front-end health

- **`css/main.css` ~10,000+ lines:** Maintainability and cache behavior are fine short-term; long-term, split by **portal vs marketing** or CSS modules for high-churn areas to reduce accidental global overrides.
- **Images:** Next/Image in use; verify `sizes` on hero and leadership grids remain accurate as layouts change.
- **Third-party:** GTM + Vercel Analytics/Speed Insights in root layout — align with **privacy policy** and cookie messaging if required for jurisdictions you serve.

---

## 5. Security, privacy, compliance

**Authoritative deep-dive:** `artifacts/workforceap-hardening-audit-2026-03-21.md` (API authz matrix, email surface, storage, employer import).

**Additional observations from this review:**

| Topic | Notes |
|-------|--------|
| Middleware | Confirms **authenticated** user for portal/admin **routes**; does **not** enforce role (e.g. member hitting `/admin` URL may get a page that then fails API calls — verify UX). |
| Cron | Sampled `app/api/cron/weekly-recap/route.ts` — **Bearer CRON_SECRET** gate; replicate pattern audit across **all** cron/automation routes. |
| Public APIs | `GET /api/jobs` — appropriate filtering for public listings; confirm no draft/pending leakage in query branches. |
| Events | `POST /api/events` requires login + Zod — good shape; consider **rate limit** if volume grows. |
| Roles | `lib/auth/roles.ts` combines **profile.role** and **userRole** table — document **source of truth** for new features to avoid split-brain. |

---

## 6. Engineering & maintainability

- **Strengths:** Zod on many POST bodies; Prisma for data layer; shared helpers (`getRouteErrorDetails`, Groq error mapping for blog AI).
- **Debt:** **109 API files** without a generated **OpenAPI** spec — internal docs or typed client would speed partner integrations and QA.
- **Error handling:** Mix of generic 500s and structured errors — standardize **public-safe messages** vs **dev `detail`** fields (pattern already emerging on some routes).

---

## 7. Testing & quality gates

| Mechanism | Status |
|-----------|--------|
| `npm run build` | Primary gate (TypeScript + Next build). |
| Unit tests | Not a major theme in repo layout. |
| E2E (Playwright) | `tests/e2e/*.spec.ts` — **5 files** vs **100+** routes; expect **selector drift** unless CI runs regularly with installed browsers. |

**Recommendations:**

1. **CI:** Run `npm run build` + Playwright smoke (home, login, apply start, employer jobs list if seed data allows) on every PR.  
2. **API:** Scripted checks for **401/403** on a **golden list** of sensitive endpoints without auth and with wrong-role cookies (can be incremental).

---

## 8. Prioritized roadmap

### P0 — Before claiming “security reviewed”

1. Execute live checks from `workforceap-hardening-audit-2026-03-21.md` (cross-role API, employer isolation, resume URLs).  
2. Email + template destination audit (`lib/email.ts`, ~618 lines).  
3. Confirm **all** cron/automation routes require **CRON_SECRET** (or equivalent).

### P1 — Launch hardening & trust

1. Admin/onboarding micro-copy for dense pages.  
2. WCAG spot-check passes on critical funnels.  
3. Employer import: in-dashboard notice when **fallback/scrape** parsing was used (if not already visible everywhere).  
4. Observability: structured logging + **correlation id** for AI/import failures (Rippling-class issues).

### P2 — Scale & maintainability

1. Split or modularize `main.css` by domain.  
2. OpenAPI or internal API catalog.  
3. Expand Playwright coverage for portal regressions.

---

## 9. Appendix — key file pointers

| Concern | Location |
|---------|----------|
| Route protection (first gate) | `middleware.ts` |
| Roles / employer / partner context | `lib/auth/roles.ts` |
| Rate limits | `lib/rate-limit.ts` |
| Global layout / a11y entry | `app/layout.tsx` |
| Public jobs | `app/api/jobs/route.ts` |
| Employer job scoping sample | `app/api/employer/jobs/[id]/route.ts` |
| Employer import | `app/api/employer/jobs/import-bulk/route.ts`, `import/route.ts` |
| Email | `lib/email.ts` |
| Security backlog | `artifacts/workforceap-hardening-audit-2026-03-21.md` |

---

*This document is intended to pair with live QA and, where needed, legal/compliance review — not to replace them.*
