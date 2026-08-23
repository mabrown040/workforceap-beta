# Go-live, scale, and UI — living list

**Status:** living checklist. Grow it. Do not treat a checked idea as a license to land code.  
**Branch:** `cursor/scale-audit-plan-942e`  
**Date started:** 2026-08-23  
**Human gate:** pick a row before anyone ships it.

This is **not** another audit. Scale sequencing lives in [`docs/SCALE-FIX-PLAN.md`](SCALE-FIX-PLAN.md) (phases 0–17). Deep-beat evidence lives in [`docs/FULL-REPO-AUDIT.md`](FULL-REPO-AUDIT.md) (`run_20260823_deep`). This file adds **go-live blockers** and **UI enhancements** that those plans only mention in passing, plus scale leftovers that are not “the next Prisma cut.”

**How to use**

- Check a box when the work is *done in prod*, not when someone wrote a plan.
- If a row is already a phase, **link the phase** — do not paste the phase.
- Product/copy rows that touch Locked or Approval Required areas must say so (`docs/PRODUCT_STAKES.md`).
- Tokens stay `--wa-*` / Astryx cascade. Do not invent hex palettes.

---

## 1. Already decided (from audits)

Pointers only. Ranker: `AUDIT_RUN_ID=run_20260823_deep node scripts/audit-rank.mjs`.

| Phase | What | Status |
|---|---|---|
| 0 | Request-scoped Prisma **count** logs (no SQL in prod) | planned |
| 1 | Skip anonymous `getSession()` / layout `getUser()` | planned |
| 2 | Dashboard query budget + Coursera off render | planned — **see §2 nuance** (kit is now default) |
| 3 | Admin `isAdminInOrg` + pagination | planned · gated on second org |
| 4 | `ensureAppUserProvisioned` uses request org | planned · gated on second org |
| 5 | Apply / signup / AI `failClosedLimit` | planned |
| 6 | i18n catalog split + branding `unstable_cache` | planned · wait unless marketing perf is a goal |
| 7 | Cron diet (nudge overlap + Coursera triple-sync) | planned |
| 8 | Forced RLS + non-owner role + Prisma 6 | **do-not-do** until dedicated milestone |
| 9 | Astro enroll shadow / heroicons / marketing `npm ci` | hygiene |
| 10 | Public WIOA voice `failClosedLimit` | planned |
| 11 | Apply signup writes request org (not default org) | planned · gated on second org |
| 12 | Scope-proxy honesty (`PlacementRecord` / `CourseProgress` / `Application`) | planned · gated on second org |
| 13 | Admin SSR lists same scope as APIs | planned · gated on second org |
| 14 | Super-admin no `findFirst` any-tenant / no upsert-on-navigate | planned · gated on second org |
| 15 | GDPR delete removes storage blobs | planned · legal calendar |
| 16 | Employer / counselor / partner `take: 5000` caps | planned |
| 17 | CI honesty + tests that pin the claims | planned |

**Do-not-do (explicit):** `WAP_RLS_GUC_ENABLED=true` alone. That is how the 2026-06-18 portal 504s happened (`docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md`, `lib/db/prisma.ts`).

**Already shipped (do not re-list as TODO):** kit tokens / dark `light-dark()` (`docs/KIT_GUIDE.md`); cookie banner + GTM consent default (`components/CookieConsentBanner.tsx`, `app/layout.tsx`); apply skeletons + confirmation flow; member dashboard **kit is default** (`app/(portal)/dashboard/page.tsx`); admin members **page size 50** (`app/admin/members/page.tsx`); skip links (`app/layout.tsx`, `marketing/src/layouts/Layout.astro`); enroll Next route + no-cost stake (`app/enroll/[school]/page.tsx`). See `docs/COMPLETED-WORK-LOG.md`.

---

## 2. Scale — still open beyond the top slice

Traffic on **one org**. Query-count cuts stay in the phase table. These are the other levers.

### Caching / Redis

- [ ] **Confirm Upstash is actually on in production.** `lib/cache.ts` `getCache` / `getCacheOrFetch` no-op without `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. `getMemberState` caches 300s only when Redis exists (`lib/member/getMemberState.ts`). `/api/health` reports redis `skipped` when unset (`app/api/health/route.ts`). Missing Redis also fail-opens spend limiters (Phase 5 / 10).
- [ ] **Shared default-org id across isolates.** Today `cachedDefaultOrgId` is process-lifetime per lambda (`lib/tenant/organization.ts`). Cold start = Prisma. Phase 1 optionally lifts this to `unstable_cache`; a Redis key is the isolate-proof version.
- [ ] **Custom-domain branding cache.** `getDefaultOrgBranding` is `unstable_cache` 1h. `getRequestOrgBranding` hits Prisma whenever `x-wap-org-id` is set (`lib/platform/defaultOrgTheme.ts`). Phase 6. Do not ship before a second host is real.

### Connection strategy

- [ ] **Runtime stays on transaction pooler `:6543` + `connection_limit=1`.** Session `:5432` caps ~15 and exhausts under serverless (`docs/HANDOFF.md`). Verify Vercel Production + Preview both use `POSTGRES_PRISMA_URL` with `pgbouncer=true`. Do not “fix 504s” by raising the limit.
- [ ] **Do not treat Preview as proof of prod transactions.** Preview flattens `$transaction` (`PRISMA_FLATTEN_TX` / `VERCEL_ENV=preview` in `lib/db/prisma.ts`). Interactive-tx bugs hide there.

### Dashboard loader (nuance vs Phase 2)

- [ ] **Default path is already kit** (`requestedUi !== 'legacy'` in `app/(portal)/dashboard/page.tsx`). Lean path is ~12 Prisma ops in one `Promise.all` + a progress `count` — not the 24-call fan-out. Phase 2 still applies to: (a) extract that batch into `loadMemberDashboardHome`, (b) **`?ui=legacy` still has 24 `prisma.` + Coursera auto-sync + B4B**, (c) `maxDuration = 60` is a timeout bandage, (d) `loading.tsx` comment still describes the legacy B4B path (`app/(portal)/dashboard/loading.tsx`).
- [ ] **Delete or staff-flag `?ui=legacy`** on member / employer / counselor / partner / admin once kit is the only supported home (Phase 16 sibling). Super-admin still never reaches employer/partner/counselor kit — `getEmployerForUser` null → redirect (`docs/HANDOFF.md`).

### i18n / HTML tax

- [ ] **Split catalogs** — Phase 6. `messages/en.json` is 184KB on every Next HTML request. `fr` / `pt` are live URLs (~200KB) but not in `REVIEWED_LOCALES` (`lib/i18n/config.ts`). Do not advertise those locales.
- [ ] **Anonymous auth tax** — Phase 1. Public Next HTML still `getSession()` + layout `getUser()` fallback.

### Images / CDN

- [ ] **Keep `next/image` deviceSizes cap at 1920** (`next.config.ts`). `/images/*` Cache-Control is 1 day. `public/images` ~6.9MB is acceptable. Do not add uncompressed heroes (Phase 9).
- [ ] **Astro marketing images are a separate pipeline** (`marketing/` build copied into `public/` by `vercel.json` `buildCommand`). LCP preload exists on the Astro home hero (`marketing/src/pages/index.astro`). Next leftover marketing CSS still ships hex dark overrides (`css/main.css` `html.dark`) for routes that may no longer be the public home.

### ISR vs dynamic

- [ ] **Public marketing is Astro static** (zero-JS default). Next still owns apply / auth / find-your-path / enroll / portal. Do not ISR portal or admin (`export const dynamic = 'force-dynamic'` on `app/admin/layout.tsx` and many staff pages).
- [ ] **Program comparison is no longer a Next client matrix.** `marketing/src/pages/program-comparison.astro` is a static table (no `client:` island). AGENTS.md still points at `/en/program-comparison` as the credential-free smoke test — that path is stale. Smoke the Astro page at `/program-comparison`.
- [ ] **Sitemap `revalidate = 86400`** is the main ISR-ish Next surface (`app/sitemap.ts`). Fine.

### Background jobs / cron diet

- [ ] **28 crons share the pooler with SSR** (`vercel.json`). Phase 7. Overlap: `inactive-nudge` + `inactivity-nudge` + `at-risk-alerts` (includes retention nudges) + `course-accountability`. Coursera: `coursera-sync` / `coursera-b4b-sync` / `coursera-training-sync` / `coursera-auto-heal`.
- [ ] **No job queue.** Heavy work is “Vercel cron hits `/api/cron/*`.” Digest `take: 2000 * partnerIds.length` (`app/api/cron/partner-outcome-digest/route.ts`) can out-eat user traffic. Cap in Phase 3/7.
- [ ] **Admin “trigger cron” can hit prod origin** if `NEXT_PUBLIC_SITE_URL` is unset (defaults `https://www.workforceap.org` — `docs/FULL-REPO-AUDIT.md` stream C). Confirm the env on every Vercel env.
- [ ] **`/api/health` Prisma-pings on every public probe** (`app/api/health/route.ts`). Fine for uptime; it is still a pooler checkout. Rate limiter here is fail-open.

### Admin / employer list loaders (UI + data)

- [ ] **Still unbounded on several staff pages** (Phase 3 / 13 / 16): `app/admin/training-progress/page.tsx` `take: 5000/5000/20000`; `app/admin/counselors/page.tsx` assignments `take: 20000`; employer `jobs` / `pipeline` / `matches` `take: 5000`; partner home applications `take: 5000`. **Members list is already `pageSize = 50`** — do not “paginate” it again; it is still **unscoped** (`isAdmin()`).

---

## 3. Go-live readiness

Production blockers that are **not** “query count.” Check against Vercel Production + prod Supabase (`jqddnyuszufndwwezdwp` in `docs/HANDOFF.md`), not Preview/demo.

### 3.1 Secrets / env matrix

Source of truth: `.env.example` + `docs/ENVIRONMENT-VARIABLES.md` (last audited 2026-05-13 — refresh when this list ships). Confirm **Production** (and Preview separately).

| Need | Vars | If missing |
|---|---|---|
| [ ] App boots / pages render | `POSTGRES_PRISMA_URL` (`:6543`, `connection_limit=1`), `POSTGRES_URL_NON_POOLING` (migrate only), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | HTTP 500 on every page (`lib/tenant/organization.ts` via `app/layout.tsx`) |
| [ ] Canonical links / cron trigger origin | `NEXT_PUBLIC_SITE_URL` | Emails + admin cron trigger fall back to `workforceap.org` |
| [ ] Cron auth | `CRON_SECRET` | Cron routes fail-closed (good) — jobs do not run |
| [ ] MFA trust cookies | `AUTH_TRUST_COOKIE_SECRET` | Staff MFA trust broken |
| [ ] Staff MFA on | `STAFF_MFA_ENFORCEMENT=1` | Staff can skip MFA |
| [ ] Placement survey tokens | `PLACEMENT_SURVEY_TOKEN_SECRET` | Survey cron / links fail |
| [ ] Email | `RESEND_API_KEY`, `EMAIL_FROM` | Contact 503; apply confirmation / nudges silent |
| [ ] Rate limits + cache | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Caches miss; apply/AI/voice **fail open** |
| [ ] Donate (public) | Zeffy URL is hardcoded in `marketing/src/pages/donate.astro` — **not Stripe** | AGENTS.md “Donate needs Stripe” is stale |
| [ ] Employer / org billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` | Employer webhook / Connect / org onboard |
| [ ] Career quiz / profiler | `ONET_API_KEY` | UI renders; scoring “not configured” |
| [ ] Voice | `ELEVENLABS_API_KEY` + agent IDs | Voice mint fails or bills if limiter fail-open (Phase 10) |
| [ ] Coursera | `COURSERA_*` / B4B — **prod-only**; keep off Preview (`docs/HANDOFF.md`) | Dashboard cron / B4B degrade |
| [ ] Sentry | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, org/project/auth for source maps | Errors only in Vercel logs |
| [ ] Analytics | `NEXT_PUBLIC_GTM_ID` — layout falls back to **`GTM-53JCT6WN`** if unset (`app/layout.tsx`) | Confirm that container is *ours* |
| [ ] Turnstile | `NEXT_PUBLIC_CAPTCHA_ENABLED` + site/secret | Apply/public forms weaker |
| [ ] Preview safety | `RATE_LIMIT_ALLOW_MISSING_UPSTASH` **must not** be on Production (CI sets it) | Fail-open in prod |
| [ ] QA bypass | `WAP_RATE_LIMIT_QA_BYPASS` off in prod; default secret is `wap-qa-dev-secret-do-not-use-in-production` (`lib/rate-limit.ts`) | Anyone who knows the default can bypass |

### 3.2 Auth / session / email / donate

- [ ] **Supabase Auth SMTP → Resend** (`docs/EMAIL_SETUP.md`). Confirm signup + reset templates use WorkforceAP copy, not Supabase defaults. SPF / DKIM / DMARC on `workforceap.org` (or the `EMAIL_FROM` domain).
- [ ] **Apply confirmation email path** (`app/api/apply/confirmation-email/route.ts`) fail-closed limiter — still needs Resend.
- [ ] **Session story:** middleware `getSession()` on public HTML (Phase 1) vs `getUser()` on protected. Cookie expiry UX on `/apply` and Astro `/` after Phase 1.
- [ ] **Donate go-live** is Zeffy (`tests/api/donate-page.spec.ts` asserts the Zeffy URL in `marketing/src/pages/donate.astro`). Stripe is employer/org/Connect, not the public donate button.
- [ ] **Turnstile** on apply signup if you will take paid/public traffic.

### 3.3 Observability

- [ ] **Sentry DSNs on Production** (server + browser). `SentrySetUser` is already in `app/layout.tsx`.
- [ ] **504 / timeout alert.** The 2026-06-18 outage was portal pages hitting `maxDuration` while `/api/health` stayed green (`docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md`). Alert on Vercel runtime timeouts for `/dashboard`, `/admin`, `/counselor` — not only health 200.
- [ ] **Burn-rate alerts are not wired.** `docs/SLO-AND-STATUS.md`: “No burn rate alerting infrastructure exists yet.” `/status` page is **unbuilt**. `/api/health/slo` is admin-only and honestly returns `unknown` without `VERCEL_ANALYTICS_TOKEN`.
- [ ] **Cron health:** `app/admin/crons/page.tsx` + `cron_executions`. Watch `smoke-test`, `deploy-health`, `coursera-training-sync`, `at-risk-check` (`docs/DEPLOYMENT-CHECKLIST.md`).
- [ ] **Phase 0 counter** before claiming a dashboard/layout win.

### 3.4 Backups and migrate

- [ ] **Postgres:** Supabase daily backups, 7-day retain, PITR on Pro (`docs/SECURITY-HARDENING.md` §20). **No documented recovery drill** (`docs/SECURITY-CHECKLIST.md` item 40).
- [ ] **Storage is not auto-backed up.** `member-resumes` / `member-files` / voice recordings need S3 replication or scheduled export.
- [ ] **Do not run naive `prisma migrate deploy` on local or a drifted DB.** Duplicate `partner_users` migrations (`20260319100000` + `20260320000000`) → `P3018` / `42P07`. Local: `db:push` + `db:seed`. Prod: `build:with-migrate` → `scripts/safe-migrate.cjs` (`AGENTS.md`). Preview migrate-on-build is still a HANDOFF TODO.
- [ ] **`docs/DEPLOYMENT-CHECKLIST.md` still says “run `npx prisma migrate deploy`”** as a human step — that contradicts the safe-migrate path. Fix the checklist when someone next deploys (doc-only).

### 3.5 Legal / consent / cookies

- [ ] **GDPR delete leaves blobs** — Phase 15. `app/api/gdpr/delete/route.ts` nulls profile paths; does not delete Storage objects.
- [ ] **Cookie banner exists** (`components/CookieConsentBanner.tsx` via `DeferredRootChrome`). Accept / Decline only (no category picker). Hidden on portal prefixes. GPC auto-declines. `role="dialog"` **without** `useFocusTrap`. Accept button uses `#fff` (not a token). Portal users who never hit a public page stay `unset` in `localStorage`.
- [ ] **`ParentalConsentForm` is unmounted** (`components/forms/ParentalConsentForm.tsx`). Live path is tokenized `app/consent/[token]` + `GuardianConsentForm`. Do not resurrect the orphan form in a “cleanup” PR that also changes copy.
- [ ] **Privacy / terms pages** are Astro (`LOCALEABLE_PATH_PREFIXES` comment in `lib/i18n/config.ts`). Confirm they match the banner links `/privacy` `/terms`.

### 3.6 Rate limits (fail-open)

Fail-**closed** today: auth, contact, confirmation email, forgot-password (`lib/rate-limit.ts`).  
Fail-**open** without Redis: **apply signup**, **AI tools**, **member + public voice**, partner signup, careers GET, invite accept, health, xAPI, placement survey, WIOA public, webhooks, org onboard, questionnaire, Coursera identity, messages, bulk email, admin invites.

- [ ] Phase 5 (apply / AI) + Phase 10 (**public voice**, ~$0.30/min).
- [ ] Decide which other public POSTs must fail-closed before launch ads.

### 3.7 Tenant / second org

**Cannot go multi-org or custom-domain school until:** Phase 3 + 4 + 11 + 12 + 13 + 14, plus branding cache. Isolation is `withTenantScope` + route discipline; RLS is not forced; `Application` / `PlacementRecord` / `CourseProgress` have no `organizationId`. Apply + healer always default org.

- [ ] Stay single-tenant (`organizations.slug = workforceap`) until that cut ships.
- [ ] Super-admin impersonation cookie is **unsigned UUID** (`docs/FULL-REPO-AUDIT.md` stream G) — Phase 14.

### 3.8 Feature flags / preview vs prod

- [ ] **Admin UI exists** (`app/admin/feature-flags/`, `FeatureFlagsKit`). Client hook `hooks/useFeatureFlag.ts` fetches `/api/feature-flags` — **no production call sites** besides the hook itself. Flags are not a launch kill-switch until something reads them.
- [ ] `/api/feature-flags` is **not** in middleware `TENANT_API_PATHS` backstop (audit stream A). Route does call `getUser()`.
- [ ] Preview flatten-tx (§2) — do not certify transaction semantics on Preview.

### 3.9 Content / seed vs real org

- [ ] **Demo vs prod Supabase** is a hard split (`scripts/check-supabase-env.mjs`). Preview must not point at prod.
- [ ] Seed (`npm run db:seed`) upserts default org `workforceap`, roles, programs, demo jobs, blog. Prod needs **real** org branding, programs, staff, counselors — not demo rows.
- [ ] Employer / partner / counselor **kit homes unverified as those personas** (`docs/HANDOFF.md` TODO). Super-admin redirects off those pages.
- [ ] `fr` / `pt` copy unreviewed — do not put those URLs in ads (`lib/i18n/config.ts`).

### 3.10 Domain / branding / Caddy

- [ ] Custom-domain cache is a 60s Edge `Map` (`lib/tenant/customDomainCache.ts`) — per isolate. Branding uncached when header set.
- [ ] `Caddyfile` is 18 lines, one host, no extra headers (audit). Fine if Vercel is the public edge; not a multi-host story.
- [ ] Root `DEPLOY.md` is the **old static-site** LXC guide — not the Vercel app. Use `docs/DEPLOYMENT-CHECKLIST.md` + `docs/HANDOFF.md`.

### 3.11 Support / admin runbooks

Present: `docs/DEPLOYMENT-CHECKLIST.md`, `docs/COUNSELOR-RUNBOOK.md`, `docs/runbooks/CONCORDIA-LAUNCH.md`, `docs/runbooks/production-paid-funnel-smoke.md`, `docs/INCIDENT-RESPONSE-PLAN.md`, `docs/coursera-go-live-runbook.md`.

- [ ] Incident **Technical Lead / Communications / Legal are TBD** (`docs/INCIDENT-RESPONSE-PLAN.md`).
- [ ] No public `/status` page.
- [ ] Admin members / pipeline / crons / Coursera health are the ops surfaces — confirm at least one staff login can reach them after MFA.

### 3.12 Docs drift (cheap, do with the next doc PR)

- [ ] `docs/PRODUCT_STAKES.md` still cites `app/page.tsx` and `ProgramsContent.tsx` — homepage / programs are Astro (`marketing/src/pages/index.astro`, `programs.astro`). Locked *intent* still holds.
- [ ] AGENTS.md “`/en/program-comparison` interactive Next tool” is stale.
- [ ] AGENTS.md “Donate needs Stripe” is stale (Zeffy).
- [ ] `docs/HANDOFF.md` still describes `?ui=kit` as the opt-in; member + admin kit are default.

---

## 4. UI enhancements

Design-review checklist applied mentally (hierarchy, contrast, empty/loading, mobile, a11y, AI-slop). **No new hex palettes.** Product stakes called out.

### What NOT to restyle

- Locked: programs stay **visually open** (`marketing/src/pages/programs.astro` “fully expanded”). No accordions.
- Locked: homepage hero stays **grounded** if “Empowering People. Advancing Futures.” stays (`marketing/src/pages/index.astro` mission card).
- Locked: public members do not self-serve program/class switch.
- Locked: prefer “no cost to members” / funded-by-grants — no casual “free.”
- Approval required: homepage CTA hierarchy; apply **1–2 business day** promises (`messages/en.json` apply confirmation + hero); dashboard progress words (`recommended` / `unlocked` / `in progress`).
- **Kit composites stay kit** (`DataTable`, `KpiStrip`, `QueueRow`, …). **Do not nest Astryx primitives inside those composites.** Kit *pages* may use Astryx Card/Button/EmptyState (`docs/KIT_GUIDE.md` §9) — `MemberHomeKit` already does. New overlays → Astryx. Do not hand-write `html.dark` color blocks; consume `--wa-*`.
- Astro marketing is **light theme only** (`marketing/AGENTS.md`). Do not add a dark mode there.
- Do not merge Astro + Next enroll “for cleanup.”

### 4.1 Marketing (Astro + leftover Next)

- [ ] **CTA stacking on the home hero.** Primary apply + secondary find-your-path + donate pill + scroll cue (`marketing/src/pages/index.astro`). Design audit 2026-05-21 already flagged competing primaries on the old Next home. Approval required to change CTA hierarchy.
- [ ] **1–2 business day follow-up** is repeated on Astro home (“A real team follows up in 1–2 business days”) and throughout `messages/en.json`. Ops must support it (`PRODUCT_STAKES.md`).
- [ ] **Program comparison lost interactivity.** Old Next client (select 2+ → matrix) is gone; Astro page is a static comparison table (`marketing/src/pages/program-comparison.astro`). If the interactive tool is still the smoke test, restore a small island — do not rebuild as a SaaS card grid.
- [ ] **Find-your-path is still Next** (`app/(decision-journey)/find-your-path/`) with `ProgramsDecisionJourneyNav` linking to Astro `/programs` and `/program-comparison`. Check tab chrome + locale: Astro routes are **not** in `LOCALEABLE_PATH_PREFIXES`.
- [ ] **Next `css/main.css` still has hundreds of `html.dark` hex overrides** (`#0b0d10`, `#12151a`, …) for leftover marketing classes. Kit/portal should not need them. Either delete dead rules or they will fight Astryx/`--wa-*` on hybrid pages.
- [ ] **Cookie banner vs mobile bottom nav.** Banner adds `14rem` body padding when `#mobile-bottom-nav` exists (`CookieConsentBanner.tsx`). Decision-journey still mounts `DynamicMobileBottomNav`. Easy to double-pad apply + marketing.
- [ ] **Mobile marketing tabs** (`components/MobileBottomNav.tsx` MARKETING_TABS): Home, Quiz, Programs, Apply — no Donate, no Compare. Donate is a home pill only.

### 4.2 Apply / enroll

- [ ] **`PreLaunchTag` (“Pilot Program”) still on organic + paid apply** (`app/apply/OrganicApplyPage.tsx`, `PaidApplyVariant.tsx`). Remove or rewrite before a public go-live if you are no longer a pilot.
- [ ] **Hero gradient hardcodes `#2a0a14`** next to tokens (`OrganicApplyPage.tsx` `sPage.hero`). Contrast work already happened (branch history); leftover raw hex. Prefer `color-mix` / tokens — do not paint a new palette.
- [ ] **Loading / error are in good shape** (`app/apply/loading.tsx`, `error.tsx`, `ApplyPageSkeleton.tsx`, create-account / status / results). Keep; do not restyle for fun.
- [ ] **Confirmation copy** is Approval Required (`app/apply/confirmation/page.tsx` + `messages/en.json` `confirmationStep2*`).
- [ ] **Enroll** Next page is stake-safe and `force-dynamic` (`app/enroll/[school]/page.tsx`). Astro `enroll/concordia` still ships (Phase 9 hygiene). Do not merge.
- [ ] **Apply signup limiter fail-open** is a conversion + abuse row (Phase 5), not a visual one.

### 4.3 Dashboard (member)

- [ ] **Kit home is the product.** `MemberHomeKit` + `MemberDoThisNextCard` (`components/portal/kit/pages/member/MemberHomeKit.tsx`). Empty pipeline uses `emptyTitle="No active applications"` (title only — add a next action if launch members have no jobs yet).
- [ ] **Dynamic chunks load with `null`** (`MemberCareerPathSection`, cert modal, placement strip, PWA — `app/(portal)/dashboard/page.tsx`; same in `DesktopDashboard.tsx`). Prefer a kit-sized skeleton, not a layout pop-in (CLS).
- [ ] **`DashboardSkeleton` is still the route `loading.tsx`.** Fine if it matches kit layout; the file comment still talks about B4B / `getMemberState` — update the comment when Phase 2 lands.
- [ ] **Member mobile chrome is the sticky-top workspace nav**, not bottom tabs (`MobileBottomNav` `variant="portal"` is a no-op). Do not reintroduce a fifth bottom tab.
- [ ] **Progress language** — Approval Required. Do not imply completion early.

### 4.4 Admin

- [ ] **Tables that hydrate 5k–20k rows** will feel broken even if scoped later. Training-progress + counselors assignments are the worst (`app/admin/training-progress/page.tsx`, `app/admin/counselors/page.tsx`). Members table is the model: `pageSize` 50 + `PortalPagination` + empty “Add member” (`components/admin/MembersTable.tsx`).
- [ ] **Dense surface** is correct (`DesignSurface` dense). Do not “card-wrap” list rows (`docs/KIT_GUIDE.md`).
- [ ] **Admin layout fallback** already exists (`app/admin/layout.tsx` “temporarily unavailable”). Keep.
- [ ] **Feature-flags empty state** exists (`emptyTitle="No feature flags yet"`). Flags are unused in product UI — do not build a flags settings page for launch cosmetics.

### 4.5 Employer / partner / counselor

- [ ] **Kit homes exist; persona verification does not** (`docs/HANDOFF.md`). Seed one employer + partner + counselor demo user and walk `?ui=legacy` off.
- [ ] **Sibling pages still `take: 5000`** — jobs / pipeline / matches / counselor legacy / partner applications. UI will jank before the pooler dies. Phase 16 + cursor pagination.
- [ ] **Empty states are mostly warm** (`PortalEmptyState` / kit `emptyTitle`). Partner “No referred members yet” is the launch-day employer/partner screen — give it a single CTA (referral link / post a job).

### 4.6 Dark mode / contrast

- [ ] **Portal kit:** tokens are `light-dark()` — do not add `html.dark` overrides (`docs/KIT_GUIDE.md` §3).
- [ ] **Astro marketing:** light only. Dark OS users on `/` will see light. That is a decision, not a bug — document it or add a *marketing* theme later (not `--wa-*` kit work).
- [ ] **Hybrid Next pages** (apply, find-your-path, leftover `.home-*` classes) still use raw hex in `html.dark` (`css/main.css`). Highest contrast risk for logged-in users who toggle dark then hit apply.
- [ ] **Cookie Accept `#fff`** and employer signup `color: '#6e6a66'` (`app/employers/signup/page.tsx`) ignore tokens.

### 4.7 Loading / error / empty (cross-cutting)

- [ ] Prefer `useAnnounce` over per-component `aria-live` (`docs/KIT_GUIDE.md` §8).
- [ ] Apply / dashboard / admin already have route `loading.tsx` or skeletons. Gaps: dynamic `loading: () => null` on dashboard widgets; some admin kit pages only title-empty.
- [ ] Error boundaries: dashboard + portal entry exist. Do not add a new generic “Something went wrong” without a next step.

### 4.8 A11y that can block go-live (not a full audit)

- [ ] **Cookie dialog** has `role="dialog"` and no focus trap / no `aria-modal` (`CookieConsentBanner.tsx`). Use kit `useFocusTrap` or Astryx `Dialog`.
- [ ] Skip links exist. Icon-only controls need names (kit rule).
- [ ] Apply consents are labeled (`ApplyCreateAccountForm.tsx`). Keep.
- [ ] Do not run a drive-by full a11y rewrite. Fix blockers on apply + cookie + admin tables (labels, focus, live regions).

---

## 5. Recommended next cuts

Ordered. Each: why / evidence / blast / depends-on. Human still picks.

### Ship this week (single-tenant traffic + spend)

1. **Phase 1 — anonymous auth tax.** Why: every public HTML hit talks to GoTrue. Evidence: `middleware.ts`, `app/layout.tsx`. Blast: session freshness on `/` and `/apply`. Depends: none.
2. **Confirm Upstash + fail-closed spend (Phase 5 + 10).** Why: apply/AI/public voice fail open; voice is priced. Evidence: `lib/rate-limit.ts`, `app/api/public/wioa-qualification/voice-session/route.ts`. Blast: Preview 429s if Redis missing. Depends: Upstash on Production (and Preview or explicit allow-missing).
3. **Cap the fat `take`s (Phase 3 digest integer + Phase 16).** Why: 20k-row admin + 5k employer pages will 504 before member count does. Evidence: `training-progress/page.tsx`, `counselors/page.tsx`, employer `jobs`/`pipeline`/`matches`. Blast: staff see fewer rows until cursor lands. Depends: none (pagination UX can follow).
4. **Phase 2 loader for the default kit path + kill Coursera on render.** Why: kit is leaner than 24 but still a fan-out; legacy path is the old 504 shape. Evidence: `app/(portal)/dashboard/page.tsx`. Blast: member home fields. Depends: Phase 0 counter to prove the budget.
5. **Env matrix on Production (this list §3.1).** Why: pages 500 without DB; donate/email/Sentry/Upstash are independent. Evidence: `docs/ENVIRONMENT-VARIABLES.md`, `app/layout.tsx` GTM fallback. Blast: none (ops). Depends: human access to Vercel.
6. **Email deliverability rehearsal.** Why: apply promise is 1–2 days *and* email. Evidence: `docs/EMAIL_SETUP.md`, `messages/en.json` confirmation strings. Blast: none. Depends: Resend domain + Supabase SMTP.
7. **504 alert ≠ health 200.** Why: last outage hid behind a green health check. Evidence: `docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md`, `maxDuration = 60` on dashboard. Blast: paging noise. Depends: Sentry or Vercel alerts.
8. **Remove or rewrite `PreLaunchTag` on apply.** Why: “Pilot Program” undercuts go-live trust. Evidence: `OrganicApplyPage.tsx`, `PaidApplyVariant.tsx`. Blast: apply hero only. Depends: human copy call. Stakes: Approval Required if CTA/promise text moves.

### Before a second org or custom-domain school

9. **Phase 11 + 4 — apply + healer write the request org.** Evidence: `app/api/apply/signup/route.ts`, `lib/member/ensureAppUser.ts`. Blast: signup + login. Depends: tests (current signup test mocks default org).
10. **Phase 3 + 12 + 13 — admin scope + honest proxy + SSR = API.** Evidence: `app/admin/layout.tsx` `isAdmin()`, `lib/tenant/scopeProxy.ts`. Blast: every unscoped admin list. Depends: inventory `rg prisma. app/admin`.
11. **Phase 14 — super-admin fallback.** Evidence: `lib/auth/roles.ts` getEmployer/getPartner. Blast: support impersonation UX (empty state instead of upsert).
12. **Branding cache by org id (Phase 6 half).** Evidence: `getRequestOrgBranding`. Blast: custom-domain first paint. Depends: a real second host to verify.

### Post-live / legal calendar

13. **Phase 15 — GDPR storage delete** + storage backup story (`docs/SECURITY-HARDENING.md` §20).
14. **Phase 7 — cron diet** once you can see cron_executions volume.
15. **Phase 6 — i18n split** only if marketing Next HTML is still fat after Phase 1 (Astro home is already static).
16. **Phase 8 — RLS for real.** Last. Never the flag alone.
17. **Cookie dialog a11y + token colors** (`CookieConsentBanner.tsx`) when you next touch consent.
18. **Interactive compare** only if advisors still want the old matrix; otherwise update AGENTS.md and keep the Astro table.

---

## 6. Explicit do-not

- **`WAP_RLS_GUC_ENABLED=true`** without FORCE RLS + batched GUC in the same deploy + non-owner role (Phase 8).
- **Big-bang Prisma 6 / `$use` removal** except as part of Phase 8.
- **Merging Astro + Next enroll** (or Astro + Next programs) in a cleanup PR. Copy/stake risk (`rul_enroll_copy_stake`).
- **Painting new hex palettes** or UI/UX Pro Max hex dumps. Production color is `--wa-*` / cascade-bridged Astryx.
- **Mixing Astryx primitives inside kit composites** (`DataTable`, `KpiStrip`, `QueueRow`, …).
- **Accordion-ing the public programs catalog.**
- **Tightening apply follow-up promises** without ops.
- **Advertising `/fr` `/pt`** until review.
- **`prisma migrate deploy` locally** (duplicate `partner_users`).
- **Raising `connection_limit` or moving runtime to `:5432`.**
- **Treating Preview flatten-tx as production.**
- **Reopening `clm_hot_stamp_update`** (`wontfix`).
- **Shipping this list as a code PR that “just fixes a few.”** Human picks a row.

---

## 7. How to keep building this list

1. After each shipped phase, check the phase box in §1 and add a one-line “landed” note with SHA.
2. New incidents → a row in §3 with a path (see how 2026-06-18 created the 504 ≠ health item).
3. New UI polish → a row under the surface in §4 with a file path. No “make it pop.”
4. Do not re-run the four-auditor playbook unless you have **one or two new claims**. Prefer `rg` + this file.

**Related:** `docs/SCALE-FIX-PLAN.md` · `docs/FULL-REPO-AUDIT.md` · `docs/PRODUCT_STAKES.md` · `docs/KIT_GUIDE.md` · `docs/HANDOFF.md` · `docs/DEPLOYMENT-CHECKLIST.md` · `docs/COMPLETED-WORK-LOG.md`
