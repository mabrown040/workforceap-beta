# WorkforceAP full-repo audit

**Beat:** `run_20260823_deep`  
**Branch:** `cursor/scale-audit-plan-942e`  
**Prior beat (kept):** `run_20260823_0215` — scale-only, 11 clusters / 161 files  
**Ranker:** `AUDIT_RUN_ID=run_20260823_deep node scripts/audit-rank.mjs`  
**Playbook:** `.agents/skills/blast-radius-audit/SKILL.md`  
**Human gate:** which fixes ship. No product code was patched in this beat.

This document is the **full** audit. `docs/SCALE-FIX-PLAN.md` remains the
scale-sequenced plan and is **updated** (not replaced) with what this pass
adds to the scale picture.

---

## 1. Why this beat exists

The first full-codebase pass was rejected as too fast and too narrow. It
sampled hot paths (161 files) and re-ranked 17 scale claims. This beat
walks the real tree: **1092** `app/` modules, **656** `lib/`, **587**
`components/`, **463** API `route.ts`, **283** `page.tsx`, **176** prisma
files, **302** test files.

Map before → after: **11 clusters / 161 files → 46 clusters / 2997 unique files**.
Product-tree coverage (`app|lib|components|prisma|scripts|tests|messages|i18n|marketing|emails|content|shared|css|pages|supabase|hooks` + root config) is **0 missing**.

---

## 2. Coverage table

| Tree | Walked? | How | Intentionally skipped? |
|---|---|---|---|
| `app/` all route groups (marketing, dashboard, admin, employer, partner, counselor, api, auth, enroll, org, mentor, q, survey, consent, wioa, dev) | yes | cluster + `ent_cluster_app_tree` (1101 files) | no |
| `lib/` (auth, db, tenant, jobs, email, stripe, onet, rate-limit, coursera, member, counselor, employer, partner, ai, cron, gdpr, xapi, …) | yes | domain clusters + `ent_cluster_lib_tree` (659) | no |
| `components/` (portal kit, admin, marketing, employer, counselor) | yes | `ent_cluster_components_tree` (601) | no |
| `prisma/` schema + migrations + seeds | yes | `ent_cluster_prisma_db` | no |
| `messages/` + `i18n/` + `lib/i18n/` | yes | `ent_cluster_i18n_catalog` | no |
| `middleware.ts`, `next.config.ts` | yes | tenant_auth / ci_deploy | no |
| `vercel.json` crons (28 paths) | yes | `ent_cluster_jobs_cron` | no |
| `tests/` + `scripts/verify-high-risk-tenant-routes.cjs` | yes | `ent_cluster_tests` | no |
| `.github/workflows/*` | yes | `ent_cluster_ci_deploy` | no |
| `Caddyfile`, `DEPLOY.md` | yes | ci_deploy | no |
| `marketing/` Astro | yes | public_marketing | no |
| `emails/`, `content/`, `shared/`, `css/`, `pages/`, `supabase/`, `hooks/` | yes | `ent_cluster_content_shared` | no |
| `docs/` (except `PRODUCT_STAKES.md`, `KIT_GUIDE.md`) | no | narrative / historical | **yes** — not runtime |
| `.cursor/`, `.agents/`, `.stitch/`, `.openclaw/` | no | agent skills | **yes** |
| `artifacts/`, `audit-screenshots/`, `.qa/` | no | dated evidence | **yes** |
| `public/` binaries | no | images / static Astro output | **yes** — not source |
| `graph/` | self | this audit | not a product cluster |
| Root audit markdown (`AUDIT-2026-05-16.md`, `CEO-*`, `TODOS.md`) | sampled | used as prior context | not remapped |

Hottest files were **read fully**, not grepped by name:
`middleware.ts`, `app/layout.tsx`, `lib/db/prisma.ts`, `lib/auth/roles.ts`,
`lib/member/ensureAppUser.ts`, `lib/tenant/scopeProxy.ts`,
`lib/tenant/withTenantScope.ts`, `lib/rate-limit.ts`,
`app/(portal)/dashboard/page.tsx` (24 `prisma.`),
`app/admin/layout.tsx`, `app/admin/members/page.tsx`,
`app/admin/placements/page.tsx`, `app/admin/counselors/page.tsx`,
`app/admin/training-progress/page.tsx` (from 0215, re-checked),
`app/(portal)/employer/page.tsx`, `app/(portal)/counselor/page.tsx`,
`app/api/apply/signup/route.ts`, `app/api/gdpr/delete/route.ts`,
`app/api/public/wioa-qualification/voice-session/route.ts`,
`app/api/health/route.ts`, `app/api/admin/reports/wioa/route.ts`,
`app/api/admin/email-crons/[id]/trigger/route.ts`,
`lib/cron/authorizeCronRequest.ts`, `lib/cron/withCronLogging.ts`,
`.github/workflows/ci-gate.yml`, `vercel.json`, `Caddyfile`,
`prisma/schema.prisma` (`Application`, `PlacementRecord`, `CourseProgress`).

---

## 3. Stream notes (A–G)

### A. Request path / auth / tenant / middleware / i18n

**Symbols:** `middleware` (`middleware.ts:134`), `RootLayout` (`app/layout.tsx:128`),
`getUser` (`lib/auth/server.ts`), `isAdmin` / `isAdminInOrg` / `getEmployerForUser`
(`lib/auth/roles.ts:40,57,417`), `ensureAppUserProvisioned` (`lib/member/ensureAppUser.ts:40`),
`LOCALEABLE_PATH_PREFIXES` (`lib/i18n/config.ts:44`).

Confirmed 0215: spoofed `x-wap-org-id` / `x-wap-user-id` / `x-wap-host` are
stripped (`middleware.ts:144-146`). Public HTML still `getSession()`;
layout still `forwardedUserId ?? getUser()`. Middleware matcher skips only
static assets — every HTML/API request pays Edge work.

**New:** `TENANT_API_PATHS` is only member/employer/partner/counselor.
`/api/ai` (19 routes), `/api/gdpr`, `/api/leader`, `/api/subgroup`,
`/api/feature-flags`, `/api/public/*` have no Edge session backstop.
Current AI routes all call `getUser()`; the gap is the missing backstop.

i18n: `en.json` 184184 bytes every request (0215). Deep: `fr`/`pt` are
live URLs (~200KB each) but not in `REVIEWED_LOCALES`.
`messages/new-i18n-keys.json` (49515) is unused.

`/enroll` still not in `LOCALEABLE_PATH_PREFIXES` (accepted rule holds).

### B. Prisma / schema / migrations / queries / crons / pooler

**Symbols:** `createPrismaClient` (`lib/db/prisma.ts:76`), `TENANT_SCOPED_MODELS`
(`lib/tenant/scopeProxy.ts:45`), `withCronLogging` (`lib/cron/withCronLogging.ts:16`),
`authorizeCronRequest` (`lib/cron/authorizeCronRequest.ts:28`).

GUC layer still off; table owner; `relforcerowsecurity=false`. Do **not**
set `WAP_RLS_GUC_ENABLED`. Preview flattens `$transaction`.

**Schema:** `Application`, `PlacementRecord`, `CourseProgress` have **no**
`organizationId`. Isolation is parent FK only. `withTenantScope` cannot
inject a column that does not exist — and it does not even try (pass-through).

**Unbounded / huge takes (beyond 0215 training-progress):**

| Location | take | org filter? |
|---|---|---|
| `app/admin/training-progress/page.tsx` | 5000/5000/20000 | no (0215) |
| `app/admin/counselors/page.tsx` default | 500 + **20000** assignments | no |
| `app/admin/members` / students / users / wioa / programs / … | 5000 many | no |
| `app/api/admin/reports/wioa/route.ts` | 10000 users inside “scope” | proxy no-ops progress/placement |
| `app/(portal)/employer/{page,jobs,pipeline,matches}` | 5000 | employerId (not org) |
| `app/(portal)/counselor/page.tsx` legacy | 5000×3 | assignment |
| `app/(portal)/partner/page.tsx` | 5000 applications | partnerId |
| `app/api/cron/partner-outcome-digest` | 2000 × partnerCount | 0215 |

**Crons:** 28 `vercel.json` paths, all wrapped in `withCronLogging` except
the extra `verifyCronSecret` inside at-risk-alerts (defense in depth).
Auth fail-closed if `CRON_SECRET` unset. `allowVercelUserAgent` exists but
default wrapper does **not** enable it. Four overlapping nudge/email
scanners: `at-risk-alerts` (daily, includes `runMemberRetentionNudges` +
B4B HTTP), `inactive-nudge`, `inactivity-nudge`, `course-accountability`.

Local migrate still broken (duplicate `partner_users`). `db:push` + `db:seed`
is the local path. `supabase/` SQL is a second history.

### C. API routes + server actions + rate limits

**463** `route.ts`. Admin APIs often `isAdmin` + some `withTenantScope`.
Partner/employer APIs generally `getPartnerForUser` / `getEmployerForUser`
(good) — then super-admin fallbacks (bad).

Webhooks: Stripe `constructEvent` (good). Learning-completion
`verifyWebhookSecret` fail-closed on empty secret (good, tested).
Coursera REST verifies HMAC/shared secret.

**Fail-open limiters** (0215 apply/AI/voice plus deep):
`checkPublicVoiceSessionRateLimit`, partner signup, careers GET, invite
accept, public health, xAPI, placement survey, WIOA public, webhooks,
org onboard, questionnaire, Coursera identity, messages, bulk email,
admin invites. Fail-**closed**: auth, contact, confirmation email,
forgot-password.

CI sets `RATE_LIMIT_ALLOW_MISSING_UPSTASH=1`.

Token routes (`/api/q/[token]/submit`, placement-survey) are
token-as-credential, consume-before-write, IP limited (fail-open).

Admin cron trigger: global `requireAdmin` then server-side
`fetch(origin + path)` with `CRON_SECRET`. Origin defaults to
`https://www.workforceap.org` if `NEXT_PUBLIC_SITE_URL` unset.

### D. Portal / admin / employer / partner / dashboard

Dashboard home: **24** `prisma.` still (`rg -c`). No unit test pins the
budget. Coursera auto-sync still on render.

Admin layout: `isAdmin()` only. Partner admin pages scoped (0215).
Members / placements / students / users / counselors / training-progress
SSR **not** scoped. Member **export API** *is* scoped — staff use the page.

Employer/counselor **kit** homes are lean and default. `?ui=legacy` and
sibling pages (jobs/pipeline/matches/candidates) still `take: 5000`.

Counselor kit admin path uses `resolveAdminEnrolledMemberIds` →
`getActorOrganizationId` (org-scoped). The page **gate** is still
global `isAdmin()`.

Kit UI: not re-audited for a11y polish. No product-breaking kit a11y
claim. `docs/KIT_GUIDE.md` unread for this beat (no portal UI shipped).

### E. Public marketing / apply / enroll / donate / quiz

Apply signup: `getDefaultOrganizationId()` at `:367`. Turnstile +
fail-open apply limiter. Partner-ref cookie plant/clear still matches
(0215 proposed rule ready to accept).

Enroll Next route + flag reader still good (0215 verified). Astro
`enroll/concordia` still ships (hygiene).

Donate: no `app/api/donate/` tree (0215 seed was stale). Stripe webhook
is `app/api/stripe/webhook/route.ts` + employer webhook.

O*NET public quiz degrades 503 without `ONET_API_KEY` (correct).
Limiter fail-open.

GTM default `GTM-53JCT6WN` in root layout. CSP `unsafe-inline` /
`unsafe-eval` documented.

Product stakes (`docs/PRODUCT_STAKES.md`): this beat does not change
Locked areas. Unreviewed `fr`/`pt` copy is a stakes risk if those URLs
are advertised.

### F. Scripts, CI, deploy, env, flags, tests

CI required: tsc, `test:unit`, Material Symbols, tenant-route grep,
`next build`. **Advisory:** lint, vitest (`|| true`), knip.
`next.config.ts` `eslint.ignoreDuringBuilds: false` — build can fail
lint while the lint *job* is green-on-fail.

Tenant grep does **not** open SSR `page.tsx` list loaders.

**No tests** for: `ensureAppUserProvisioned` org source, dashboard
Prisma count, public voice fail-closed, apply request-org, GDPR blob
delete, scope-proxy pass-through.

Feature flags GET is authed; `filterVisibleFlags` hashes userId+key.
`/api/feature-flags` not in middleware backstop.

`/dev/**` pages call `notFound()` when `VERCEL_ENV === 'production'`
(kit page too; astryx layout too). `/dev/kit/layout.tsx` itself is not
gated — the page is.

Caddyfile: 18 lines, one host, no extra headers.

### G. Security adversarial

| Attack | Result |
|---|---|
| Spoof `x-wap-org-id` | Stripped in middleware. Only re-set on cached custom-domain + `x-wap-host`. |
| Spoof `x-wap-user-id` | Stripped; only set after `getUser()`. Layout still falls back to `getUser()` if header missing. |
| Cron UA spoof | Default `authorizeCronRequest` does **not** allow UA. Secret required. |
| Empty webhook secret | Learning-completion fail-closed. |
| Admin second-org | Layout `isAdmin()` + unscoped SSR lists + scope-proxy no-op on progress/placement. |
| Partner scope | APIs use `getPartnerForUser` + org checks on referrals (CI-pinned). |
| File upload | Resume/cert validate type+size; counselor upload tenant-checked (`staffMemberAccess` / `isAdminInOrg`). |
| Public voice spend | Unauthed + fail-open limiter. |
| Super-admin cookie | Unsigned UUID, httpOnly. Fallback upserts default-org preview rows; else first employer/partner in the table. |
| `/api/test/xapi-access-token` | 404 if `VERCEL_ENV` set. |
| QA bypass default secret | Still present (`clm_secrets_qa_bypass_default_secret`, 0215). |

---

## 4. Findings by severity (file:symbol)

### prod-break (ranked top slice + dropped)

| id | Evidence | Test? |
|---|---|---|
| `clm_hot_dashboard_query_fanout` | `app/(portal)/dashboard/page.tsx` — 24 `prisma.` + Coursera sync | **none** (count only) |
| `clm_hot_layout_auth_every_request` | `middleware.ts:300` `getSession`; `app/layout.tsx:135` `getUser` fallback | none |
| `clm_hot_public_voice_failopen` | `voice-session/route.ts` no `getUser`; `checkPublicVoiceSessionRateLimit` `:525` fail-open | none |
| `clm_hot_scope_proxy_false_safety` | `scopeProxy.ts:96-98`; WIOA `placementRecord` inside `withTenantScope` | tenant grep asserts *call*, not model set |
| `clm_secrets_admin_pages_unscoped` | `app/admin/layout.tsx:35` `isAdmin` | none on SSR |
| `clm_secrets_apply_always_default_org` | `signup/route.ts:367` `getDefaultOrganizationId` | test **mocks** default org |
| `clm_secrets_gdpr_delete_leaves_blobs` | `gdpr/delete/route.ts:75-119`; no storage in `lib/gdpr/` | none |
| `clm_secrets_orphan_user_default_org` *(below slice)* | `ensureAppUser.ts:54` | **none** |
| `clm_secrets_ssr_api_scope_split` *(below slice)* | members `page.tsx` vs export `route.ts` | grep covers API only |
| `clm_secrets_superadmin_fallback_upsert` *(below slice)* | `roles.ts:326-452` | none |

### ship-break

| id | Evidence | Test? |
|---|---|---|
| `clm_hot_admin_unbounded_scans` (0215) | training-progress 20k | none |
| `clm_hot_admin_counselors_20k` | `counselors/page.tsx:102` take 20000 | none |
| `clm_hot_employer_legacy_5000` | employer/counselor/partner take 5000 | none |

### latent / hygiene (selected)

Fail-open apply/AI (0215), i18n 184KB, custom-domain branding uncached,
RLS GUC fail-open, QA bypass secret, Prisma `$use`, marketing nested
`npm ci`, duplicate nudge crons (now **four** paths), consent form
unmounted, CHS seeds unwired, CI lint/vitest advisory, tenant grep SSR
gap, no query-budget tests, `?ui=legacy` still shipped, fr/pt unreviewed,
Caddy thin, CI `ALLOW_MISSING_UPSTASH`, `pages/_app.tsx`,
`new-i18n-keys.json`, dual schema histories, unsigned impersonation
cookie, CSP `unsafe-eval`, `/api/ai` middleware gap, public `/api/health`
Prisma ping, admin cron trigger → production origin, Astro enroll shadow,
`@heroicons` prod dep.

---

## 5. Sequenced fix plan (all domains)

Each cut is one PR when possible. Do not mix layout-auth, dashboard
loader, admin-scope, apply-org, and GDPR in one patch.

**Scale phases 0–9 stay as written in `docs/SCALE-FIX-PLAN.md`.** Deep
pass adds:

### Phase 10 — Public voice fail-closed (new, cheap, spend)

**Claim.** `clm_hot_public_voice_failopen`  
**Change.** `checkPublicVoiceSessionRateLimit` → `failClosedLimit`. Keep
boot throw. Preview must set Upstash or explicit allow-missing.  
**Verify.** New test: limiter null + production → 429.  
**Do not.** Lower the 20/10m window in the same PR.

### Phase 11 — Apply signup uses request org (new, with Phase 4)

**Claim.** `clm_secrets_apply_always_default_org` (+ healer #4)  
**Change.** Same org resolver as Phase 4. One PR for healer + signup, or
signup first (it is the write).  
**Verify.** Unit: custom-domain header → that org id; canonical host →
default.  
**Do not.** Ship without tests; current signup test mocks the default.

### Phase 12 — Scope proxy honesty (new, before second org)

**Claim.** `clm_hot_scope_proxy_false_safety`  
**Change.** Either add `organizationId` to PlacementRecord/CourseProgress
(schema, own PR) **or** stop calling `withTenantScope` on those models
and require `where: { user: { organizationId } }`. Extend CI grep to
fail if `db.placementRecord` appears inside `withTenantScope` without a
parent filter.  
**Do not.** Add models to `TENANT_SCOPED_MODELS` that lack the column —
the proxy would inject a nonexistent field and 500.

### Phase 13 — Admin SSR = admin API (extends Phase 3)

**Claims.** `clm_secrets_ssr_api_scope_split`, `clm_hot_admin_counselors_20k`  
**Change.** `members/page.tsx`, `placements/page.tsx`, `counselors/page.tsx`,
`students/page.tsx`, `users/page.tsx` get the same
`getActorOrganizationId` + cap as their APIs. Add those paths to
`verify-high-risk-tenant-routes.cjs`. Cap counselors assignments
`take: 200` + SQL aggregate.  
**Do not.** Trust `withTenantScope` on PlacementRecord.

### Phase 14 — Super-admin fallback (new)

**Claim.** `clm_secrets_superadmin_fallback_upsert`  
**Change.** Remove `anyActiveEmployer` / `anyActivePartner`. Remove
upsert-on-navigate. Impersonation = signed cookie only (mirror MFA
trust). Empty cookie → “pick an employer” empty state.  
**Verify.** Super-admin without cookie does not create rows.

### Phase 15 — GDPR blobs (new)

**Claim.** `clm_secrets_gdpr_delete_leaves_blobs`  
**Change.** Delete or lifecycle `member-resumes` / `member-files` objects
for that user id; anonymize or detach messages.  
**Verify.** Upload then delete; storage list empty.

### Phase 16 — Employer/counselor query caps (scale add)

**Claim.** `clm_hot_employer_legacy_5000`  
**Change.** Delete or staff-flag `?ui=legacy`. Cap jobs/pipeline/matches
`take: 200` + count. Partner home: `count` distinct instead of
`findMany take: 5000`.

### Phase 17 — CI honesty

**Claims.** `clm_dead_ci_lint_vitest_advisory`, `clm_dead_no_query_budget_tests`  
**Change.** Flip lint **or** document that only `next build` lints.
Add the missing unit tests for Phases 1–4 and 10–11 so the next audit
has a red verify.

---

## 6. Human gate

Nothing in this document ships until a human picks a row.

**Ship first (single-tenant, traffic / spend):**

1. Scale Phase 1 — skip anonymous `getSession` / layout `getUser`
2. Scale Phase 2 — dashboard query budget
3. Phase 10 — public voice fail-closed (if Upstash is in prod)
4. Digest/nudge/counselors `take` caps

**Ship before a second org or custom-domain school:**

5. Phase 11 + Scale Phase 4 — apply + healer org
6. Phase 12 + 13 + Scale Phase 3 — honest scope + SSR lists
7. Phase 14 — super-admin fallback

**Ship when legal/GDPR is on the calendar:**

8. Phase 15

**Wait:**

- `WAP_RLS_GUC_ENABLED` / FORCE RLS (Scale Phase 8)
- Prisma 6 `$use` removal except with Phase 8
- Rewriting i18n catalogs unless marketing perf is a goal
- Merging Astro + Next enroll
- Reopening `clm_hot_stamp_update` (`wontfix`)

---

## 7. What the first beat missed

1. Map was a hot-path sample (161 files). Employer, counselor, GDPR,
   public voice, CI, schema models, apply signup body, scope-proxy
   implementation, super-admin fallbacks were outside it.
2. `withTenantScope` *calls* were treated as isolation. The proxy
   implementation was not read.
3. Default-org was blamed on the healer only.
4. Fail-open was blamed on apply/AI, not the unauthenticated voice mint.
5. Admin unscoped was training-progress + placements; not the SSR/API
   split or counselors 20k.
6. Cron diet was two nudge jobs; there are four overlapping email
   scanners.
7. No CI / test-coverage pass.
8. No GDPR / upload / impersonation-cookie pass.
9. Ranker top slice of 5 was treated as the whole audit.

---

## 8. Back edge

Agents added **8** new `proposed` rules. Humans flip `proposed` →
`accepted`. Claims stay append-only. Frozen nodes
(`graph/SCHEMA.md`, `scripts/audit-rank.mjs`,
`scripts/audit-graph-check.sh`) were not edited.

Prior proposed rules whose checks already pass on master (still awaiting
accept): `rul_enroll_flag_must_serve`, `rul_admin_school_is_data_entry`,
`rul_partner_ref_clear_matches_plant`,
`rul_admin_partner_pages_tenant_scoped`.

---

## 9. Code patched

**None.** Graph + docs only.
