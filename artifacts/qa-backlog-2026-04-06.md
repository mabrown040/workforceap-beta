# QA Backlog — 2026-04-06

## Vercel Status
- Production: READY — 2026-04-06 14:41 CDT (PR #443 live on production, commit `5de3f362`)

## Audit P0/P1 Items
- [P0] `/dashboard/profile` crashes with Server Components render error — `app/(portal)/dashboard/profile/page.tsx` — **fixed** (PR #441 — program resolution + partner gate resilience + mobile profile link)
- [P0] 38+ API routes missing error handling — `audit-technical-code-2026-03-27.md` / `2026-04-04-kimi-site-audit.md` — **fixed** (PR #417)
- [P0] Career quiz results lack apply CTA — `app/find-your-path/FindYourPathClient.tsx` — **fixed** (commit `2602057`)
- [P0] Account deletion soft-delete only — `app/api/member/delete-account/route.ts` — **fixed** (hard-deletes via Supabase Auth)
- [P0] Unauthenticated email trigger endpoint — `app/api/apply/confirmation-email/route.ts` — **fixed** (rate-limited + protected)
- [P0] Admin pipeline page unprotected — `app/admin/pipeline/page.tsx` — **fixed** (merged via PR #435)
- [P0] Admin pages crash on DB errors — multiple admin pages — **fixed** (merged via PR #435)
- [P1] Apply form is client-side only — `app/apply/page.tsx` — **in-review** (`fix/apply-ssr-fallback` ready)
- [P1] Employer page CTAs are generic — `app/employers/page.tsx` — **in-review** (`fix/employer-ctas` ready)
- [P1] Jobs board no SSR / SEO — `app/(portal)/dashboard/jobs/page.tsx` — **open**
- [P1] Missing `@sentry/nextjs` package — `app/(portal)/dashboard/error.tsx` — **in-review** (`fix/install-sentry-nextjs` ready)
- [P1] Next.js image optimization not used for hero — `app/page.tsx` — **fixed** (merged via PR #428)
- [P1] Employer `/employer/pipeline` renders Jobs page instead of pipeline view — **open**
- [P1] Auth invite flow breaks on re-invite after soft-delete — `app/api/invite/accept/route.ts` — **fixed**
- [P1] Admin layout lacks branding error boundary — `app/admin/layout.tsx` — **fixed** (merged via PR #435)
- [P1] `/employers/dashboard` returns 404 — no HR manager dashboard exists at this path — **open**

## Open PRs
- #444 — fix: allow .txt file resume uploads — **READY**
- #425 — 🎨 Palette: Fix broken characters on signup form loading state — **BUILDING** (Vercel build failure / rate-limit)
- #424 — fix: Correct pdf-parse import path — **READY**
- #341 — 🎨 Palette: Add ARIA labels to icon-only edit buttons in profile — **READY**
- #313 — fix(ui): apply `wa-` tailwind prefix to missing display utilities — **READY**
- #311 — 🎨 Palette: Add copy feedback to Share buttons — **READY**
- #309 — Robust O*NET skill parsing, scoring normalization, and radar mapping fallbacks — **READY**
- #283 — 🎨 Palette: Make Delete Account Modal Accessible — **READY**
- #259 — fix: what-we-do mobile, dead CTAs, Take Action button — **BUILDING** (Vercel build failure / rate-limit)
- #250 — Stitch Gap Analysis and Pre-generated Prompts — **READY**
- #249 — 🎨 Palette: Enhance accessibility of Delete Account modal — **READY**
- #242 — ⚡ Optimize applicant-followup cron with Promise.all — **READY**
- #239 — 🧪 Add tests for URL parsing error boundary — **READY**
- #238 — 🧪 Add test for missing Supabase browser env vars — **READY**
- #237 — 🧪 Add missing env variables test for browser Supabase client — **READY**
- #228 — Replace hardcoded colors with CSS custom properties — **READY**
- #227 — Implement new Bento-grid design system and dashboard views — **READY**
- #226 — feat: visual redesign system & prelaunch metrics scrub — **READY**
- #223 — Apply M3 design tokens to marketing & portal CSS — **READY**
- #222 — feat: Stitch Homepage Redesign — Dark Theme + Bento Layout — **BUILDING** (CI validate + Preview QA failing)
- #221 — Redesign dashboard and portal pages with Material Design 3 tokens — **READY**

## Recently Merged
- #443 — 🎨 Palette: Improve Form Accessibility in ParentalConsentForm — **MERGED** (deployed to production, commit `5de3f362`)
- #442 — fix(readiness): server-render live checklist + resilient API — **MERGED** (deployed to production, commit `8368f72f`)
- #441 — fix(portal): program resolution, partner gate resilience, mobile profile link — **MERGED** (deployed to production, commit `4a4418ca`)

## Active Branches (no open PR yet)
- `fix/cron-hardening` — READY (1 commit)
- `fix/voice-interview-optional-camera` — OPEN (1 commit)
- `fix/hero-blur-placeholder` — OPEN (1 commit)
- `fix/status-lookup-auth` — OPEN (1 commit)
- `fix/interview-voice-auth` — OPEN (1 commit)
- `feat/marketing-journey-nav-portal` — OPEN
- `feat/post-423-portal-voice-resume` — OPEN
- `feat/portal-unified-chrome` — OPEN
- `cursor/coach-suggestion-consistency-4cb8` — OPEN
- `cursor/application-status-lookup-554d` — OPEN
- `palette/fix-signup-loading-text-351118119760681353` — OPEN
- `cursor/admin-jobs-server-crash-8446` — OPEN

## Smoke Test Queue
- [ ] Member portal smoke test — **rolled**
- [ ] Mobile viewport pass on dashboards — **rolled**
- [ ] API error-boundary check — **rolled**
- [ ] Post job form submission — **rolled**
- [ ] Messages route data load — **rolled**
- [x] Dashboard profile page load — **fixed** (PR #441, #442)

## Roll / Close Rules
- End of week (Sunday): any unfinished items roll to next week or are marked CLOSED.
- **Updated:** 2026-04-06 16:56 CDT
