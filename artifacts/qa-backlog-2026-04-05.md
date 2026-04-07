# QA Backlog — 2026-04-05

## Vercel Status
- Production: READY — 2026-04-05 23:46 CDT (latest deploy ready on master, commit `19821faf`)
- No BUILD_ERROR in recent production runs.

## Audit P0/P1 Items
- [P0] 38+ API routes missing error handling — `audit-technical-code-2026-03-27.md` / `2026-04-04-kimi-site-audit.md` — **fixed** (PR #417)
- [P0] Career quiz results lack apply CTA — `app/find-your-path/FindYourPathClient.tsx` — **fixed** (commit `2602057`)
- [P0] Account deletion soft-delete only — `app/api/member/delete-account/route.ts` — **fixed** (hard-deletes via Supabase Auth)
- [P0] Unauthenticated email trigger endpoint — `app/api/apply/confirmation-email/route.ts` — **fixed** (rate-limited + protected)
- [P0] **Admin Pipeline page is completely unprotected** — `app/admin/pipeline/page.tsx` — **open** (no `getUser()` or `isAdmin()` check; anyone can access)
- [P0] **Admin pages crash on DB errors** — `app/admin/members/page.tsx`, `app/admin/page.tsx`, `app/admin/assessments/page.tsx`, `app/admin/jobs/[id]/page.tsx`, `app/admin/pipeline/page.tsx` — **open** (all Prisma queries are unguarded; missing try/catch)
- [P1] Apply form is client-side only — `app/apply/page.tsx` — **in-review** (`fix/apply-ssr-fallback` ready, 1 commit ahead)
- [P1] Employer page CTAs are generic — `app/employers/page.tsx` — **in-review** (`fix/employer-ctas` ready, 1 commit ahead)
- [P1] Jobs board no SSR / SEO — `app/(portal)/dashboard/jobs/page.tsx` — **open**
- [P1] Missing `@sentry/nextjs` package — `app/(portal)/dashboard/error.tsx` — **in-review** (`fix/install-sentry-nextjs` ready, 2 commits ahead)
- [P1] Next.js image optimization not used for hero — `app/page.tsx` — **fixed** (merged via PR #428)
- [P1] Employer `/employer/pipeline` renders Jobs page instead of pipeline view — **open**
- [P1] Auth invite flow breaks on re-invite after soft-delete — `app/api/invite/accept/route.ts` + `app/api/admin/members/[id]/delete/route.ts` — **fixed** (local changes, uncommitted: added Supabase auth hard-delete in admin delete + restored `deletedAt: null` in `acceptExistingUser`)
- [P1] Admin layout lacks branding error boundary — `app/admin/layout.tsx` — **open** (`cursor/-bc-bab68010-4e9f-44da-87f4-2d746fbb8ef9-d974` has a fix but not merged to master)

## Open PRs / Active Branches
- GitHub token invalid; unable to fetch PR list via API/CLI.
- **Inferred ready/open branches from remote:**
  - `fix-resume-parsing-11407106883505567270` — READY (2 commits)
  - `fix/apply-ssr-fallback` — READY (1 commit)
  - `fix/employer-ctas` — READY (1 commit)
  - `fix/install-sentry-nextjs` — READY (2 commits)
  - `fix/cron-hardening` — READY (1 commit)
  - `fix/voice-interview-optional-camera` — OPEN (1 commit)
  - `fix/hero-blur-placeholder` — OPEN (1 commit)
  - `fix/status-lookup-auth` — OPEN (1 commit)
  - `fix/interview-voice-auth` — OPEN (1 commit)
  - `feat/marketing-journey-nav-portal` — OPEN
  - `feat/post-423-portal-voice-resume` — OPEN
  - `feat/portal-unified-chrome` — OPEN
  - `cursor/pdf-parse-import-path-cf79` — OPEN
  - `cursor/coach-suggestion-consistency-4cb8` — OPEN
  - `cursor/application-status-lookup-554d` — OPEN
  - `palette/fix-signup-loading-text-351118119760681353` — OPEN
  - `cursor/admin-jobs-server-crash-8446` — OPEN (relevant to broken admin pages)
  - `cursor/-bc-bab68010-4e9f-44da-87f4-2d746fbb8ef9-d974` — OPEN (contains admin layout hardening)
- **Recently merged:** #434, #433, #432, #431, #430, #429, #428, #427, #423, #421, #420

## Smoke Test Queue
- [ ] Member portal smoke test — **rolled**
- [ ] Mobile viewport pass on dashboards — **rolled**
- [ ] API error-boundary check — **rolled**
- [ ] Post job form submission — **rolled**
- [ ] Messages route data load — **rolled**

## Roll / Close Rules
- End of week (Sunday): any unfinished items roll to next week or are marked CLOSED.
- **Today is Sunday 2026-04-05.** Unfinished P1 items and smoke tests rolled to next week.
- **Updated:** 2026-04-05 23:46 CDT
