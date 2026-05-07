# Routing Audit & Simplification — 2026-05-07

**Auditor:** end-of-day routing sweep after the day's 9 PRs landed.
**Scope:** All `app/**/page.tsx` (205 pages), all redirects in `next.config.ts`, the 25 largest admin pages.

---

## TL;DR

- **205 pages, 298 API routes, 56 redirects.**
- **0 dead stubs** (initial audit said 3; Codex review on PR #1034 caught that those stubs are actually live fallbacks for locale-prefixed legacy URLs that `next.config.ts` redirects miss — see Finding 1).
- **6 reachable redirect-only stubs kept** — they preserve auth, query strings, or locale-prefix behavior that next.config.ts can't replicate cleanly.
- **5 admin pages over 320 lines** flagged as split candidates (Coursera hub at **760**, admin home at **697**, member detail at **695**). Documented as `ROUTE-DEBT-001/002/003`; out of scope for this PR — each is its own follow-up.
- **No orphan or broken routes** detected.

Full findings + recommendations below.

---

## Inventory

```
205 page.tsx files
  62 admin pages
 106 portal pages
  37 marketing / public pages
```

```
298 API route files
 56 redirects in next.config.ts
```

---

## Finding 1 — Three apparently-dead stubs are actually middleware fallbacks ✅

These files were **proposed for deletion in the first cut of this audit**, on the reasoning that `next.config.ts` redirects already handle the same source paths:

| File | next.config.ts |
|---|---|
| `app/(portal)/account/page.tsx` | `{ source: '/account', destination: '/dashboard/account' }` |
| `app/(portal)/help/page.tsx` | `{ source: '/help', destination: '/dashboard/help' }` |
| `app/(portal)/resources/page.tsx` | `{ source: '/resources', destination: '/dashboard/career-library' }` |

**Codex review on PR #1034 caught the bug in this reasoning** — and the audit was wrong. Here's the actual flow:

1. User opens a **locale-prefixed legacy URL** like `/es/account`, `/fr/help`, `/pt/resources`.
2. `next.config.ts` redirects match against the literal request path. They do **not** fire for `/es/account` because the source pattern is `/account`, not `/es/account`.
3. `middleware.ts` strips the locale via an internal `NextResponse.rewrite()` to `/account`. The browser still sees `/es/account`.
4. The resolver looks for a page file at `/account` (i.e. `app/(portal)/account/page.tsx`).
5. **Without the stub:** 404. **With the stub:** redirect to `/dashboard/account`.

So these files are **not dead** — they're the locale-prefixed fallback that next.config.ts redirects can't reach.

**Action:** keep all three. Each file now carries a `DO NOT DELETE` doc-comment explaining the nuance so a future cleanup doesn't repeat the mistake.

A future PR could replace these with locale-aware next.config.ts redirects (`/{locale}/account → /{locale}/dashboard/account`) to consolidate the redirect logic in one place — but that's 12 redirect rules (4 locales × 3 paths) versus 3 files of 6 lines, and the file-based approach also rewrites the destination through the middleware's locale resolver. Acceptable as-is.

---

## Finding 2 — Reachable redirect-only stubs (keep)

These stubs preserve auth, query strings, or locale-prefix behavior that `next.config.ts` redirects can't replicate cleanly:

| File | Lines | Why keep |
|---|---:|---|
| `app/(portal)/profile/page.tsx` | 6 | Pure redirect to `/dashboard/profile`. Could move to next.config but the locale-prefix concern from Finding 1 also applies — `/es/profile` would 404 without a file. |
| `app/(portal)/applications/page.tsx` | 18 | Auth-check pattern: redirects to `/login?redirectTo=...` if unauthenticated, otherwise to `/dashboard/job-applications`. Migrating to next.config would lose the redirectTo preservation. |
| `app/(portal)/certifications/page.tsx` | 6 | Pure redirect. Same locale-prefix concern as `/profile`. |
| `app/(portal)/dashboard/skills-assessment/page.tsx` | 18 | Redirects to `/dashboard/ai-tools?toast=...` — preserves a query-string toast. Recently shipped (#12). Keep. |
| `app/(portal)/dashboard/coursera/page.tsx` | 21 | Redirects to `/dashboard/training` with auth + query-string preservation. Effectively resolves the Training-vs-Coursera IA decision (TODOS.md Unresolved #1). Keep. |

**Action:** none. Document and move on.

---

## Finding 3 — Largest admin pages (split candidates)

The 5 admin pages over 320 lines:

| Page | Lines | What it does | Split opportunity |
|---|---:|---|---|
| `app/admin/coursera/page.tsx` | 760 | The Coursera hub. Renders 4–5 distinct sections: skillset progress, badge progress, course progress, identity mappings, unmatched events. | **High.** Each section already has its own data loader; the page is mostly conditional rendering. Split into `<CourseraOverviewSection>`, `<CourseraMappingsSection>`, `<CourseraUnmatchedSection>` etc. and the page becomes ~120 lines. |
| `app/admin/page.tsx` | 697 | Admin home. Renders KPI stats, charts, recent activity, top members, alerts. | **Medium.** Already has some component imports but most of the rendering is inline. Worth a careful split since it's the highest-traffic admin page. |
| `app/admin/members/[id]/page.tsx` | 695 | Member detail. Shows profile, training, applications, certifications, placements, notes, audit log. | **Medium.** Tab-style data — natural split into one component per tab. Risk: many in-place actions that need to coordinate refresh. |
| `app/admin/employers/[id]/page.tsx` | 364 | Employer detail. Profile, jobs, candidates, contacts. | **Low to medium.** Manageable as-is; split if it grows further. |
| `app/admin/coursera/learners/unmatched/[externalEmail]/page.tsx` | 346 | The page #1033 just expanded. Renders identity card, suggested matches, xAPI events, CSV courses, CSV badges. | **Low.** Already split into reasonable sections; the table markup is verbose but legible. |

**Action:** none in this PR. Each is its own follow-up. The Coursera hub is the strongest candidate — explicit recommendation in `docs/COURSERA-IDENTITY-MATCHING.md` follow-up.

---

## Finding 4 — `next.config.ts` redirects look clean

56 redirect rules across:

- 5 legacy blog slug redirects (good — preserves SEO equity)
- 12 legacy `.html` redirects (good — preserves crawler equity from the Squarespace era)
- 8 marketing route aliases (`/about → /what-we-do`, `/services → /what-we-do`, `/careers → /find-your-path`)
- 6 CompTIA program-slug aliases (preserves links with `+` in URL)
- Auth/portal helpers (`/portal → /login`, `/signin → /login`, supabase magic-link callback)
- Member-portal canonical migrations (`/ai-tools → /dashboard/ai-tools`, etc.)

No duplicates, no contradictions, no obviously dead rules. Worth re-auditing in 6 months as legacy traffic continues to drop.

**Action:** none.

---

## Finding 5 — No orphan routes detected

Every `page.tsx` file resolves to a URL that's reachable from at least one of:
- A nav link (`MainNav`, `MobileBottomNav`, portal sidebars)
- An internal `<Link>` from another page or component
- A `next.config.ts` redirect target
- An auth callback URL

The portal route group `(portal)` and the auth group `(auth)` add no URL segments — those are organizational only and don't create dead routes.

---

## Recommendations (follow-up scope, not this PR)

| ID | Item | Priority | Effort |
|---|---|---|---|
| ROUTE-DEBT-001 | Split `app/admin/coursera/page.tsx` (760 lines) into per-section components | Medium | half day |
| ROUTE-DEBT-002 | Split `app/admin/page.tsx` (697 lines) into widget components | Medium | half day |
| ROUTE-DEBT-003 | Split `app/admin/members/[id]/page.tsx` (695 lines) into tab components | Low | 1 day (action coordination is delicate) |
| ROUTE-DEBT-004 | Replace portal-root redirect stubs (`/account`, `/help`, `/resources`, `/profile`, `/certifications`) with locale-aware next.config.ts rules — only worth it if the file-based approach becomes a maintenance burden. The middleware locale-rewrite makes the file approach more robust today. | Low | 1 hr |
| ROUTE-DEBT-005 | Re-audit `next.config.ts` redirects in 6 months — drop legacy ones with zero traffic | Low | 1 hour |

---

*Audit performed on commit `07c05f9` (after PR #1033 merge). Re-run after any major route restructuring.*
