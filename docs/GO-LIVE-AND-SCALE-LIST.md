# Go-live, scale, and UI — living list

**Status:** living checklist. Grow it. Do not treat a checked idea as a license to land code.  
**Updated:** 2026-08-24 on `cursor/sprint-wrap-golive-docs-942e` (copied forward from `cursor/scale-audit-plan-942e` so this PR is reviewable against master).  
**Date started:** 2026-08-23  
**Human gate:** pick a row before anyone ships it.

This is **not** another audit. Scale sequencing lives in [`docs/SCALE-FIX-PLAN.md`](SCALE-FIX-PLAN.md) on `cursor/scale-audit-plan-942e` until that docs PR lands (phases 0–17). Deep-beat evidence lives in `docs/FULL-REPO-AUDIT.md` on the same branch (`run_20260823_deep`). This file tracks **what the sprint actually shipped** vs **what is still open**.

**How to use**

- Check a box when the work is *in a reviewable branch* (name the branch). Uncheck or move to §Still open if it is not merged / not in prod yet.
- If a row is already a phase, **link the phase** — do not paste the phase.
- Product/copy rows that touch Locked or Approval Required areas must say so (`docs/PRODUCT_STAKES.md`).
- Tokens stay `--wa-*` / Astryx cascade. Do not invent hex palettes.

---

## Still open

Ops / human / do-not — not “write more Prisma.”

- **WS5 eligibility ops residual (Mike):** soft Sept 14 reminder copy sign-off before non-CHS blast; optional second reminder wave after Sept 14 (still no lockout). See `docs/WS5-ELIGIBILITY-OPS.md` on `cursor/apply-eligibility-ops-datasheet-942e`.
- **Remaining admin pages** if `cursor/admin-remaining-org-scope-942e` is still in flight — org-admin SSR lists that never called `resolveAdminPageTenant` / `withAdminPageScope`. Super-admin stays cross-tenant on purpose.
- **RLS GUC do-not.** Never flip `WAP_RLS_GUC_ENABLED=true` alone. That is how the 2026-06-18 portal 504s happened (`docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md`, `lib/db/prisma.ts`). Phase 8 is a dedicated milestone (FORCE RLS + batched GUC + non-owner role together).
- **Email deliverability rehearsal.** Resend domain + Supabase Auth SMTP + apply confirmation path (`docs/EMAIL_SETUP.md`). Ops must support the 1–2 business day promise.
- **Sentry 504 alerts in Vercel.** Last outage hid behind a green `/api/health`. Alert on runtime timeouts for `/dashboard`, `/admin`, `/counselor` — not only health 200.
- **Upstash in prod.** Confirm `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` on Production. Code can fail-close without Redis; caches and spend limits are still no-ops until Redis is actually on.
- **Phase 0** request-scoped Prisma count logs (no SQL in prod).
- **Phase 8 / 9 / 14** and **on-disk i18n catalog split** (file split still deferred; root picker already slices — this branch).
- **Apply signup still writes the default org** (`app/api/apply/signup/route.ts`) — Phase 11. `cursor/ensureuser-default-org-942e` covers healer / leftover provision, not this write.
- **`?ui=legacy`** still exists on member / employer / counselor / partner / admin homes.

---

## Shipped this sprint (code on branches — not necessarily merged or in prod)

| Branch | What landed |
|---|---|
| `cursor/scale-audit-plan-942e` | Living list + `SCALE-FIX-PLAN.md` + deep-beat graph (`run_20260823_deep`) |
| `cursor/phase1-anon-auth-tax-942e` | Phase 1 — skip anonymous `getSession()` / layout `getUser()` on public HTML |
| `cursor/dashboard-loader-extract-942e` | Phase 2 — `loadMemberDashboardHome` for the kit-default dashboard path |
| `cursor/admin-remaining-org-scope-942e` | Phase 3 / 13 remainder — `adminPageScope` + remaining admin SSR lists (still in flight if more pages appear) |
| `cursor/ensureuser-default-org-942e` | Phase 4 leftover + Phase 12 parent-FK scope on remaining models |
| `cursor/fail-closed-limits-and-caps-942e` | Phase 5 + 10 + 16 — fail-close voice/AI spend; cap training-progress / counselors / employer / digest takes |
| `cursor/leftover-limiter-failclose-942e` | Leftover abuse-sensitive limiters fail-closed without Redis |
| `cursor/cron-diet-branding-cache-942e` | Phase 6 branding half + Phase 7 cron diet (nudge overlap + Coursera stagger/caps) |
| `cursor/cap-remaining-takes-942e` | Remaining SSR `take`s that fail-closed did not claim |
| `cursor/bound-cron-analytics-scans-942e` | Leftover cron / Coursera / O*NET / admin-funder scans → caps or aggregates |
| `cursor/gdpr-blobs-and-limiters-942e` | Phase 15 — GDPR / member-delete remove storage blobs |
| `cursor/golive-ui-and-health-942e` | Health liveness vs ready probe; apply `PreLaunchTag` off Pilot copy; cookie a11y; apply dark tokens |
| `cursor/sprint-wrap-golive-docs-942e` | Phase 6 i18n **picker** half — root ships chrome + marketing client keys; portal/admin/apply/auth attach their own slices. Catalog JSON files are **not** split. |
| `cursor/apply-eligibility-ops-datasheet-942e` | WS5 — eligibility confirmation emails (WS4 fields), in-admin datasheet + CSV, non-CHS soft Sept 14 campaign (no lockout). Docs: `docs/WS5-ELIGIBILITY-OPS.md`. |

---

## 1. Already decided (from audits)

Pointers only. Ranker: `AUDIT_RUN_ID=run_20260823_deep node scripts/audit-rank.mjs` (on the audit branch).

| Phase | What | Status |
|---|---|---|
| 0 | Request-scoped Prisma **count** logs (no SQL in prod) | still open |
| 1 | Skip anonymous `getSession()` / layout `getUser()` | shipped on `cursor/phase1-anon-auth-tax-942e` |
| 2 | Dashboard query budget + Coursera off render | shipped loader extract on `cursor/dashboard-loader-extract-942e` — `?ui=legacy` still fat |
| 3 | Admin `isAdminInOrg` + pagination | partial — `cursor/admin-remaining-org-scope-942e` + `cursor/fail-closed-limits-and-caps-942e`; more pages may remain |
| 4 | `ensureAppUserProvisioned` uses request org | shipped leftover on `cursor/ensureuser-default-org-942e` |
| 5 | Apply / signup / AI `failClosedLimit` | shipped on `cursor/fail-closed-limits-and-caps-942e` + leftover limiter branch |
| 6 | i18n catalog **file** split + branding `unstable_cache` | picker shipped here; branding cache on `cursor/cron-diet-branding-cache-942e`; **file split still deferred** |
| 7 | Cron diet (nudge overlap + Coursera triple-sync) | shipped on `cursor/cron-diet-branding-cache-942e` |
| 8 | Forced RLS + non-owner role + Prisma 6 | **do-not-do** until dedicated milestone |
| 9 | Astro enroll shadow / heroicons / marketing `npm ci` | hygiene — still open |
| 10 | Public WIOA voice `failClosedLimit` | shipped on `cursor/fail-closed-limits-and-caps-942e` |
| 11 | Apply signup writes request org (not default org) | still open |
| 12 | Scope-proxy honesty (`PlacementRecord` / `CourseProgress` / `Application`) | shipped leftover on `cursor/ensureuser-default-org-942e` |
| 13 | Admin SSR lists same scope as APIs | partial — same as Phase 3 |
| 14 | Super-admin no `findFirst` any-tenant / no upsert-on-navigate | still open · gated on second org |
| 15 | GDPR delete removes storage blobs | shipped on `cursor/gdpr-blobs-and-limiters-942e` |
| 16 | Employer / counselor / partner `take: 5000` caps | shipped on `cursor/fail-closed-limits-and-caps-942e` + `cursor/cap-remaining-takes-942e` |
| 17 | CI honesty + tests that pin the claims | partial — each ship branch added tests; no dedicated CI-honesty PR |

**Do-not-do (explicit):** `WAP_RLS_GUC_ENABLED=true` alone. That is how the 2026-06-18 portal 504s happened (`docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md`, `lib/db/prisma.ts`).

**Already shipped before this sprint (do not re-list as TODO):** kit tokens / dark `light-dark()` (`docs/KIT_GUIDE.md`); cookie banner + GTM consent default (`components/CookieConsentBanner.tsx`, `app/layout.tsx`); apply skeletons + confirmation flow; member dashboard **kit is default** (`app/(portal)/dashboard/page.tsx`); admin members **page size 50** (`app/admin/members/page.tsx`); skip links (`app/layout.tsx`, `marketing/src/layouts/Layout.astro`); enroll Next route + no-cost stake (`app/enroll/[school]/page.tsx`). See `docs/COMPLETED-WORK-LOG.md`.

---

## 2. Scale — leftovers after the sprint cut

Traffic on **one org**. Query-count cuts stay in the phase table.

### Caching / Redis

- [ ] **Confirm Upstash is actually on in production.** `lib/cache.ts` `getCache` / `getCacheOrFetch` no-op without `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. `/api/health` reports redis `skipped` when unset. Code fail-close does not replace Redis for caches.
- [ ] **Shared default-org id across isolates.** Today `cachedDefaultOrgId` is process-lifetime per lambda (`lib/tenant/organization.ts`).
- [x] **Custom-domain branding cache** — `cursor/cron-diet-branding-cache-942e` (`lib/platform/orgBrandingCache.ts`). Still verify on a real second host.

### Connection strategy

- [ ] **Runtime stays on transaction pooler `:6543` + `connection_limit=1`.** Do not “fix 504s” by raising the limit.
- [ ] **Do not treat Preview as proof of prod transactions.** Preview flattens `$transaction`.

### Dashboard loader

- [x] **Kit-default loader extracted** — `cursor/dashboard-loader-extract-942e` (`lib/member/loadMemberDashboardHome.ts`).
- [ ] **`?ui=legacy` still has the 24-call + Coursera/B4B shape.** Delete or staff-flag once kit is the only supported home. Super-admin still never reaches employer/partner/counselor kit.

### i18n / HTML tax

- [x] **Root client picker sliced** — `cursor/sprint-wrap-golive-docs-942e`. `pickRootClientMessages` now ships chrome + marketing client keys (`programs` / `testimonials` / `careers`) + tiny `findYourPath`. Portal / admin / apply / auth attach nested `NextIntlClientProvider`s. On-disk `messages/en.json` is still 184KB (server import); it is **not** sent in full to every client.
- [ ] **On-disk catalog split** (marketing vs portal vs admin JSON files) — still deferred. `fr` / `pt` are live URLs but not in `REVIEWED_LOCALES`. Do not advertise those locales.
- [x] **Anonymous auth tax** — `cursor/phase1-anon-auth-tax-942e`.

### Images / CDN / ISR

- [ ] **Keep `next/image` deviceSizes cap at 1920.** Do not add uncompressed heroes.
- [ ] **Public marketing is Astro static.** Do not ISR portal or admin.
- [ ] **Program comparison is the Astro table** at `/program-comparison` (AGENTS.md `/en/program-comparison` smoke test is stale).
- [ ] **Sitemap `revalidate = 86400`** is the main ISR-ish Next surface. Fine.

### Background jobs

- [x] **Cron diet + leftover scan caps** — `cursor/cron-diet-branding-cache-942e`, `cursor/bound-cron-analytics-scans-942e`.
- [ ] **No job queue.** Heavy work is still “Vercel cron hits `/api/cron/*`.”
- [ ] **Admin “trigger cron” can hit prod origin** if `NEXT_PUBLIC_SITE_URL` is unset.
- [x] **Health split** — `cursor/golive-ui-and-health-942e` (cheap liveness vs Prisma/org ready). `/api/health` liveness should not be the 504 signal.

### Admin / employer list loaders

- [x] **Fat `take`s capped** on the pages the fail-closed + remaining-takes + bound-scans branches touched.
- [ ] **Remaining admin pages** may still be unscoped if the org-scope agent is still going. Members list is already `pageSize = 50` — do not paginate it again.

---

## 3. Go-live readiness (ops)

Production blockers that are **not** “query count.” Check against Vercel Production + prod Supabase (`jqddnyuszufndwwezdwp` in `docs/HANDOFF.md`), not Preview/demo.

### 3.1 Secrets / env matrix

Source of truth: `.env.example` + `docs/ENVIRONMENT-VARIABLES.md`. Confirm **Production** (and Preview separately).

| Need | Vars | If missing |
|---|---|---|
| [ ] App boots / pages render | `POSTGRES_PRISMA_URL` (`:6543`, `connection_limit=1`), `POSTGRES_URL_NON_POOLING` (migrate only), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | HTTP 500 on every page |
| [ ] Canonical links / cron trigger origin | `NEXT_PUBLIC_SITE_URL` | Emails + admin cron trigger fall back to `workforceap.org` |
| [ ] Cron auth | `CRON_SECRET` | Cron routes fail-closed (good) — jobs do not run |
| [ ] MFA trust cookies | `AUTH_TRUST_COOKIE_SECRET` | Staff MFA trust broken |
| [ ] Staff MFA on | `STAFF_MFA_ENFORCEMENT=1` | Staff can skip MFA |
| [ ] Placement survey tokens | `PLACEMENT_SURVEY_TOKEN_SECRET` | Survey cron / links fail |
| [ ] Email | `RESEND_API_KEY`, `EMAIL_FROM` | Contact 503; apply confirmation / nudges silent |
| [ ] Rate limits + cache | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Caches miss; confirm Production |
| [ ] Donate (public) | Zeffy URL is hardcoded in `marketing/src/pages/donate.astro` — **not Stripe** | AGENTS.md “Donate needs Stripe” is stale |
| [ ] Employer / org billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` | Employer webhook / Connect / org onboard |
| [ ] Career quiz / profiler | `ONET_API_KEY` | UI renders; scoring “not configured” |
| [ ] Voice | `ELEVENLABS_API_KEY`; optional `ELEVENLABS_*_AGENT_ID` overrides | Mint fails without the API key. Before go-live, verify `/api/counselor/session` resolves to active Lilley, returns member context, and passes an authenticated spoken/on-glass smoke. |
| [ ] Coursera | `COURSERA_*` / B4B — **prod-only**; keep off Preview | Dashboard cron / B4B degrade |
| [ ] Sentry | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Errors only in Vercel logs |
| [ ] Analytics | `NEXT_PUBLIC_GTM_ID` — layout falls back to **`GTM-53JCT6WN`** if unset | Confirm that container is *ours* |
| [ ] Turnstile | `NEXT_PUBLIC_CAPTCHA_ENABLED` + site/secret | Apply/public forms weaker |
| [ ] Preview safety | `RATE_LIMIT_ALLOW_MISSING_UPSTASH` **must not** be on Production | Fail-open in prod |
| [ ] QA bypass | `WAP_RATE_LIMIT_QA_BYPASS` off in prod | Anyone who knows the default can bypass |

### 3.2 Auth / session / email / donate

- [ ] **Email rehearsal** — Supabase Auth SMTP → Resend (`docs/EMAIL_SETUP.md`). SPF / DKIM / DMARC. Apply confirmation still needs Resend.
- [x] **Session tax on public HTML** — Phase 1 branch. Re-check cookie expiry UX on `/apply` and Astro `/` after merge.
- [ ] **Donate go-live** is Zeffy, not Stripe.
- [ ] **Turnstile** on apply signup if you will take paid/public traffic.

### 3.3 Observability

- [ ] **Sentry DSNs on Production** (server + browser).
- [ ] **504 / timeout alert in Vercel** for `/dashboard`, `/admin`, `/counselor` — not only health 200 (`docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md`).
- [ ] **Burn-rate alerts are not wired.** `/status` page is unbuilt.
- [ ] **Cron health** on `app/admin/crons/page.tsx` after the diet lands.
- [ ] **Phase 0 counter** before claiming a dashboard/layout win in prod.

### 3.4–3.12 still true

- Postgres backups / PITR / no recovery drill; storage not auto-backed up; use `build:with-migrate` not naive `prisma migrate deploy`.
- Cookie banner still Accept/Decline only; `ParentalConsentForm` stays unmounted.
- Stay single-tenant until Phase 11 + remaining admin scope + Phase 14 ship **and** merge.
- Demo vs prod Supabase split; `fr` / `pt` unreviewed.
- Incident Technical Lead / Communications / Legal are TBD.
- Docs drift: AGENTS.md program-comparison + Donate-needs-Stripe; `HANDOFF.md` `?ui=kit` opt-in is stale.

---

## 4. UI enhancements

**No new hex palettes. Do not mix Astryx inside kit composites. Do not restyle kit.**

### Shipped this sprint (UI / health)

- [x] **`PreLaunchTag` off Pilot Program copy** — `cursor/golive-ui-and-health-942e`.
- [x] **Cookie dialog a11y + apply dark tokens** — same branch.
- [x] **Health liveness vs ready** — same branch.

### Still product / design (not this sprint)

- Locked: programs stay visually open; homepage hero stays grounded; no casual “free”; no Astro+Next enroll merge.
- Approval required: homepage CTA hierarchy; apply 1–2 business day promises; dashboard progress words.
- CTA stacking on the Astro home hero; cookie banner vs mobile bottom nav padding; `?ui=legacy` delete; persona walkthrough of employer/partner/counselor kit homes.
- Next `css/main.css` leftover `html.dark` hex on hybrid pages — do not paint a new palette; delete dead rules when someone next touches that file.

---

## 5. Recommended next cuts (after this wrap)

1. **Merge + verify the ship branches** against master (this list’s table). Human picks order; no merge from this agent.
2. **Env matrix + Upstash on Production** (§3.1).
3. **Email rehearsal** + **Sentry/Vercel 504 ≠ health 200**.
4. **Remaining admin pages** if the org-scope branch is still going.
5. **Phase 11** — apply signup writes request org (blocked on second org / tests).
6. **Phase 0 counter** before claiming prod query wins.
7. **Phase 8 RLS** — last, never the flag alone.
8. **On-disk i18n catalog split** only if marketing Next HTML is still fat after the picker (Astro home is already static).

---

## 6. Explicit do-not

- **`WAP_RLS_GUC_ENABLED=true`** without FORCE RLS + batched GUC in the same deploy + non-owner role (Phase 8).
- **Big-bang Prisma 6 / `$use` removal** except as part of Phase 8.
- **Merging Astro + Next enroll** (or Astro + Next programs) in a cleanup PR.
- **Painting new hex palettes** or UI/UX Pro Max hex dumps.
- **Mixing Astryx primitives inside kit composites.**
- **Accordion-ing the public programs catalog.**
- **Tightening apply follow-up promises** without ops.
- **Advertising `/fr` `/pt`** until review.
- **`prisma migrate deploy` locally** (duplicate `partner_users`).
- **Raising `connection_limit` or moving runtime to `:5432`.**
- **Treating Preview flatten-tx as production.**
- **Reopening `clm_hot_stamp_update`** (`wontfix`).
- **Rewriting the member dashboard or restyling kit** from this wrap.

---

## 7. How to keep building this list

1. After each shipped phase, check the phase row in §1 and add the branch name.
2. New incidents → a row in Still open / §3 with a path.
3. New UI polish → a row under §4 with a file path. No “make it pop.”
4. Do not re-run the four-auditor playbook unless you have **one or two new claims**.

**Related:** `docs/SCALE-FIX-PLAN.md` (audit branch) · `docs/FULL-REPO-AUDIT.md` (audit branch) · `docs/PRODUCT_STAKES.md` · `docs/KIT_GUIDE.md` · `docs/HANDOFF.md` · `docs/DEPLOYMENT-CHECKLIST.md` · `docs/COMPLETED-WORK-LOG.md`

## Production cutover (2026-08-25)

Track A + B + WS5 (soft reminder) are on `master`. Runbook: [`docs/PRODUCTION-CUTOVER-ROLLOUT.md`](./PRODUCTION-CUTOVER-ROLLOUT.md). **Do not** enable `WAP_RLS_GUC_ENABLED`.
