# Member portal — per-page audit

**Environment:** `https://workforceap-beta.vercel.app` (and/or local) · **Test account:** super-admin is OK for route coverage; use a **member-only** account later for realistic empty states and nav.  
**Scope:** Member surfaces only: canonical URLs under `/dashboard/*` plus legacy entry points that **redirect** into the dashboard.

**Related:** [`PORTAL-UI-UX-AUDIT-FINDINGS.md`](./PORTAL-UI-UX-AUDIT-FINDINGS.md) (cross-role themes). Employer, partner, and counselor **sub-page** inventory (not the full member table) is summarized in [`PORTAL-UI-UX-ENHANCEMENTS.md`](./PORTAL-UI-UX-ENHANCEMENTS.md) § Route coverage.

---

## How to re-run the full live URL pass

Do **not** rely on parallel browser tabs for this list (navigations race). Use one of:

```bash
# Member-only → docs/member-pages-live-results.json
set PLAYWRIGHT_BASE_URL=https://workforceap-beta.vercel.app
set PLAYWRIGHT_MEMBER_EMAIL=your-test@email
set PLAYWRIGHT_PORTAL_PASSWORD=your-password
npm run audit:member-pages
```

**All portal surfaces (member + admin + employer + partner + counselor)** use the hardened five-role harness. It requires a trusted target policy plus a distinct `E2E_<ROLE>_*` pair for every selected role:

```bash
set PORTAL_AUDIT_MODE=local
set PLAYWRIGHT_BASE_URL=http://localhost:3000
# Optional locally: one section only
set PORTAL_AUDIT_SECTION=admin
npm run audit:portal
```

Writes a fresh success or failure artifact to **`test-results/portal-audit-results.json`**. See [`CROSS-PORTAL-AUDIT-PLAN.md`](./CROSS-PORTAL-AUDIT-PLAN.md).

Playwright (same env vars; skips if unset):

```bash
npx playwright test tests/e2e/member-all-routes.spec.ts
npx playwright test tests/e2e/cross-portal-routes.spec.ts
```

---

## 1. Legacy & alias URLs (not separate pages)

| Request path | Destination | Mechanism |
|--------------|-------------|-----------|
| `/account`, `/account/` | `/dashboard/account` | `next.config.ts` redirect |
| `/resources`, `/resources/` | `/dashboard/career-library` | `next.config.ts` redirect |
| `/help`, `/help/` | `/dashboard/help` | `next.config.ts` redirect |
| `/ai-tools`, `/ai-tools/:path*` | `/dashboard/ai-tools`, `/dashboard/ai-tools/:path*` | `next.config.ts` permanent redirect |
| `/career-brief`, `/career-brief/:path*` | `/dashboard/career-brief`, … | `next.config.ts` permanent redirect |
| `/learning` | `/dashboard/learning` | `next.config.ts` permanent redirect |
| `/weekly-recap` | `/dashboard/weekly-recap` | `next.config.ts` permanent redirect |
| `/applications` | `/dashboard/job-applications` | Server `redirect()` in `app/(portal)/applications/page.tsx` |
| `/resources/[id]` | `/dashboard/career-library/[id]` | Server `redirect()` |
| `/certifications` | `/dashboard/certifications` | Server `redirect()` |
| `/profile` | `/dashboard/profile` | Server `redirect()` |
| `/dashboard/assessments` | `/dashboard/assessment` | Server `redirect()` |
| `/dashboard/settings` | `/dashboard/profile#settings` | Server `redirect()` |
| `/dashboard/ai-tools/application-tracker` | `/dashboard/job-applications` | Server `redirect()` |

---

## 2. Canonical member routes — inventory & findings

**Legend — Live:** `script` = `npm run audit:member-pages` (recommended); **spot** = manual browser session used in Cursor (sequential only). **Finding codes:** **H1** = multiple `h1` / duplicate hero title; **NAV** = sidebar `listitem` labels concatenated without spaces in a11y tree; **SH** = shell/chrome differs (e.g. missing `Open menu` vs other pages); **TOK** = heavy inline styles vs shared portal tokens.

| Route | Document title (metadata) | Finding | Live |
|-------|---------------------------|---------|------|
| `/dashboard` | Member overview | H1 (multiple “Welcome back” / stacked sections); NAV | spot |
| `/dashboard/account` | Account settings | SH (light chrome vs e.g. Training); NAV | spot |
| `/dashboard/ai-tools` | AI Career Toolkit | SH earlier; NAV | spot |
| `/dashboard/ai-tools/application-tracker` | *(redirect)* | Use `/dashboard/job-applications` in nav/links | code |
| `/dashboard/ai-tools/cover-letter` | Cover Letter Builder | **H1** duplicate “Cover Letter Builder”; NAV | spot |
| `/dashboard/ai-tools/gap-analyzer` | Resume Gap Analyzer | Likely H1 pattern (same layout family as other AI tools) | script |
| `/dashboard/ai-tools/history` | AI Tool History | Same | script |
| `/dashboard/ai-tools/interview-coach` | AI Interview Coach | Same | script |
| `/dashboard/ai-tools/interview-practice` | Interview Practice Generator | **H1** duplicate “Interview Practice” (`h1` + breadcrumb + second `h1`); NAV | spot |
| `/dashboard/ai-tools/job-match-scorer` | Job Match Scorer | Same family | script |
| `/dashboard/ai-tools/linkedin-about` | LinkedIn About Section Generator | Same | script |
| `/dashboard/ai-tools/linkedin-headline` | LinkedIn Headline Generator | Same | script |
| `/dashboard/ai-tools/resume-analysis` | Resume Analysis | Same | script |
| `/dashboard/ai-tools/resume-rewriter` | Resume Rewriter | Same | script |
| `/dashboard/ai-tools/salary-negotiation` | Salary Negotiation Script | Same | script |
| `/dashboard/ai-tools/skill-mapper` | Skill Mapper | Same | script |
| `/dashboard/ai-tools/voice-interview` | Voice Interview | Same | script |
| `/dashboard/assessment` | *(no static metadata)* | Redirects to `/dashboard` when assessment already completed | script |
| `/dashboard/assessments` | *(redirect)* | → `/dashboard/skills-assessment` | code |
| `/dashboard/career-brief` | Weekly Career Brief | H1 pattern likely | script |
| `/dashboard/career-brief/[slug]` | Dynamic | Open from hub when briefs exist | spot |
| `/dashboard/career-library` | Career Resources | — | script |
| `/dashboard/career-library/[id]` | Dynamic | Open first card from library | spot |
| `/dashboard/certifications` | My Certificates | — | script |
| `/dashboard/counselor` | AI Career Counselor | — | script |
| `/dashboard/coursera` | Coursera courses | — | script |
| `/dashboard/guide` | Member guide | — | script |
| `/dashboard/help` | Help & Support | — | script |
| `/dashboard/job-applications` | Application Tracker \| WorkforceAP | Async list (“Loading…”); NAV | spot |
| `/dashboard/jobs` | Job Board | — | script |
| `/dashboard/jobs/[id]` | Dynamic | Open first job when list non-empty | spot |
| `/dashboard/learning` | The Learning Hub | — | script |
| `/dashboard/learning/find-your-career` | Find your career | — | script |
| `/dashboard/learning/interest-profiler` | O*NET Interest Profiler | — | script |
| `/dashboard/learning/wioa-qualification` | WIOA screening | — | script |
| `/dashboard/mentor` | *(no static metadata)* | Non-mentors → `/mentor/apply` | script |
| `/dashboard/mentors` | *(inline)* | **TOK** inline layout in `mentors/page.tsx` | script |
| `/dashboard/mentors/[mentorId]` | Dynamic | From roster | spot |
| `/dashboard/messages` | Messages | **H1** duplicate “Messages”; mobile footer vs bottom nav (site-wide) | spot |
| `/dashboard/profile` | My Profile | `#settings` hash from `/dashboard/settings` | script |
| `/dashboard/program` | My Program | — | script |
| `/dashboard/readiness` | Job Readiness Checklist | — | script |
| `/dashboard/resources` | Program resources | — | script |
| `/dashboard/resume` | My Resume | — | script |
| `/dashboard/skills-assessment` | Skills Assessment | — | script |
| `/dashboard/training` | My Training | **H1** duplicate “My Training” (hero + main) | spot |
| `/dashboard/weekly-recap` | Weekly Recap | — | script |

**Dynamic / data-dependent:** `/dashboard/career-brief/[slug]`, `/dashboard/career-library/[id]`, `/dashboard/jobs/[id]`, `/dashboard/mentors/[mentorId]` — audit when each entity exists; otherwise note “no rows to open.”

---

## 3. Cross-cutting member issues (fix once, benefit many routes)

| Priority | Theme | Where it shows up |
|----------|--------|-------------------|
| P0 | Fixed **bottom nav** overlaps **footer** on small viewports | Any member layout using `MobileBottomNav` — scroll to bottom on Connect/messages-style pages |
| P1 | **Duplicate `h1`** / double hero (PageHeader + section) | `/dashboard`, `/dashboard/training`, `/dashboard/messages`, `/dashboard/ai-tools/cover-letter`, `/dashboard/ai-tools/interview-practice`, likely other AI tool pages |
| P2 | **Sidebar nav** accessible names run together (`OverviewMy ProgramTraining`) | Most member pages with `WorkspaceShell` sidebar |
| P3 | **Shell inconsistency** (full header vs minimal) | `/dashboard/account` vs `/dashboard/training` vs `/dashboard/ai-tools` |
| P4 | **`/dashboard/mentors`** uses **inline styles** instead of shared portal layout tokens | `app/(portal)/dashboard/mentors/page.tsx` |

---

## 4. Output artifact from automated run

After a successful `npm run audit:member-pages`, see:

- `docs/member-pages-live-results.json` — `{ path, finalUrl, title, stuckLogin }` per route

If `stuckLogin` is `true`, credentials or `PLAYWRIGHT_BASE_URL` are wrong.

---

## 5. Changelog

| Date | Notes |
|------|--------|
| 2026-04-08 | Full route table + findings; added `scripts/audit-member-pages.mjs` and `npm run audit:member-pages`; Playwright `tests/e2e/member-all-routes.spec.ts`; spot-checks on `workforceap-beta.vercel.app` for key routes (sequential browser). |
