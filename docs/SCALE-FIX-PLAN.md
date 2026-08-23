# WorkforceAP scale fix plan

**Audit beat:** `run_20260823_0215`  
**Branch:** `cursor/scale-audit-plan-942e`  
**Ranker:** `AUDIT_RUN_ID=run_20260823_0215 node scripts/audit-rank.mjs`  
**Playbook:** `.agents/skills/blast-radius-audit/SKILL.md`  
**Human gate:** which fixes ship. This document is the plan; it is not a license to land all phases in one PR.

---

## 1. Executive summary — what breaks first

The site is still operated as a **single tenant** (`organizations.slug = workforceap`) on Vercel serverless + Supabase transaction pooler (`POSTGRES_PRISMA_URL` :6543, `connection_limit=1` per isolate — `docs/HANDOFF.md`). That shape already 504’d the portal when the Prisma GUC middleware doubled checkouts (`lib/db/prisma.ts:88–99`). Scale risk is therefore not “we will need Kubernetes”; it is **per-request tax × concurrent isolates × a few fat queries**.

**Breaks first under traffic (same org, more users):**

1. **Member `/dashboard`** — 24 Prisma calls plus Coursera/B4B after the layout has already spent auth + org + i18n (`clm_hot_dashboard_query_fanout`).
2. **Every HTML request** — middleware `getSession()` + layout `getUser()` fallback, default-org lookup, branding, 184KB message catalog (`clm_hot_layout_auth_every_request`).
3. **Admin training-progress / cron digest** — 5k–20k row loads and `take: 2000 * partnerCount` (`clm_hot_admin_unbounded_scans`).

**Breaks first under more tenants (second org / custom domain):**

4. **Admin pages that still use global `isAdmin()` + unscoped `findMany`** — every member/placement/progress row is visible (`clm_secrets_admin_pages_unscoped`).
5. **Orphan auth users provisioned into the default org** (`clm_secrets_orphan_user_default_org`).
6. **Custom-domain branding** — uncached Prisma read on every request once `x-wap-org-id` is set (`clm_hot_custom_domain_branding_uncached`).
7. **RLS** — policies exist but are not forced; the app role is table owner. Isolation is `withTenantScope` plus route discipline, which the admin tree only partially follows (`clm_secrets_rls_guc_fail_open`).

**Breaks first under abuse / cost:**

8. Apply/signup/AI/voice limiters **fail open** without Upstash (`clm_hot_apply_ratelimit_failopen`). Voice is priced in the file at ~$0.30/min.

Do not “fix scale” by turning `WAP_RLS_GUC_ENABLED=true`. That is how the last 504s happened.

---

## 2. System map

### 2.1 Request path (HTML)

```
browser
  → Edge middleware.ts
       strip spoofed x-wap-org-id / x-wap-user-id / x-wap-host
       locale rewrite / enroll cookie plant
       customDomainCache.get(host)  // process Map, 60s TTL, Edge-local
       if Supabase env:
         protected/tenant-api → supabase.auth.getUser()
         else → supabase.auth.getSession()          // EVERY public page
       maybe forward x-wap-user-id
  → app/layout.tsx (Node)
       resolvedUserId = header ?? getUser()         // getUser if header missing
       if user:
         ensureAppUserProvisioned → default org     // extra reads/writes
         $transaction getProfileRole + user.orgId
       else:
         resolveOrgFromRequest → getDefaultOrganizationId()  // process cache
       getRequestOrgBranding()                      // cached only for default org
       getMessages() → messages/en.json (184KB)
       NextIntlClientProvider(pickRootClientMessages ≈ portal+admin+…)
  → page
```

Hottest files: `middleware.ts`, `app/layout.tsx`, `lib/auth/server.ts` (`getUser` = `supabase.auth.getUser()`), `lib/tenant/resolveOrgFromRequest.ts`, `lib/tenant/organization.ts`, `lib/platform/defaultOrgTheme.ts`, `i18n/request.ts`.

### 2.2 Hottest Prisma / pooler users

| Path | What it does | Why it scales badly |
|---|---|---|
| Root layout (authed) | `profile.findUnique` + `user.findUnique` in `$transaction`; `ensureAppUser` `user.findUnique` | Paid on every portal/admin/employer/partner render |
| `GET /dashboard` | ~24 `prisma.*` + Coursera auto-sync + B4B | Documented 504 shape; Redis `getMemberState` is a no-op without Upstash |
| `getPortalSwitcherRoles` | up to 6 lookups unless precomputed | Admin layout + portal shells |
| `/admin/training-progress` | `take: 5000/5000/20000` | Memory + pooler; no org filter |
| `/api/cron/partner-outcome-digest` | `take: 2000 * partnerIds.length` + deep include | One weekly job can out-eat user traffic |
| 27 Vercel crons | share the same pooler as SSR | Hourly Coursera jobs + digest + nudges |

Prisma client: `lib/db/prisma.ts`, `POSTGRES_PRISMA_URL` (pooler) + `POSTGRES_URL_NON_POOLING` (migrations). GUC middleware **off** by default. Preview flattens `$transaction` (`PRISMA_FLATTEN_TX` / `VERCEL_ENV=preview`) so interactive transactions are not real — do not treat preview as proof of production transaction semantics.

### 2.3 Tenant boundaries

| Layer | Mechanism | Gap |
|---|---|---|
| Host | `customDomain` unique on `Organization`; middleware cache + `x-wap-org-id` only if `x-wap-host` also set | Cache is per-isolate; canonical host always falls back to default org |
| App | `withTenantScope` / `withActorTenantScope` / `assertSameTenant` | Only some API routes + partner admin pages. Training-progress, placements, many admin SSR pages unscoped |
| Authz | `isAdminInOrg(userId, orgId)` exists | Layout and most pages use `isAdmin()` (global) |
| RLS | Migration policies; `app.current_*` GUCs | Not forced; owner role bypasses; GUC layer disabled |
| Provision | `ensureAppUserProvisioned` | Always `getDefaultOrganizationId()` |

`TENANT_SCOPED_MODELS`: User, Partner, Employer, Job, Course, CourseEnrollment, OrganizationProgramCatalog, PreScreeningResponse. `Application` and most progress tables inherit via FK and are **not** auto-filtered.

### 2.4 Caches

| Cache | Where | TTL / notes |
|---|---|---|
| `cachedDefaultOrgId` | `lib/tenant/organization.ts` | Process lifetime; cold start per lambda |
| `customDomainCache` | `lib/tenant/customDomainCache.ts` | 60s Map; Edge ≠ Node memory |
| `getDefaultOrgBranding` | `unstable_cache` 1h | Default org only |
| Custom-domain branding | none | Extra Prisma read |
| `getCache` / `getCacheOrFetch` | Upstash Redis | No-op without `UPSTASH_*`; used by jobs list API, member state, programs, admin metrics |
| React `cache()` | `getUser`, `getProfileRole`, `getUserRoles` | Per-request only |
| `next/image` | deviceSizes cap 1920; avif/webp | `public/images` ~6.9MB; `/images/*` Cache-Control 1d |

### 2.5 External dependencies

| Dep | Used for | Scale / failure mode |
|---|---|---|
| Supabase Auth (GoTrue) | Session on middleware + `getUser` | Extra RTT on every HTML request; independent of Prisma pooler (2026-06-30: Auth stayed up while Prisma 500’d) |
| Supabase Postgres + pooler | All Prisma | `connection_limit=1` on 6543 is correct for serverless; **query count** is the lever |
| Upstash Redis | Rate limits + `lib/cache.ts` | Missing → many limiters fail open; caches miss |
| Stripe | Donate + employer webhook (`/api/employer/webhook` allowlisted) | Signature-auth; not on the marketing hot path |
| Resend | Contact, recaps, nudges, bulk email | Bulk-email limiter exists; recap cron `take: 500` then N sends |
| Coursera B4B | Dashboard auto-sync, hourly/6h crons | Sync on dashboard view amplifies member load |
| O*NET | Career quiz / interest profiler | Public limiter 50/h; degrades without `ONET_API_KEY` |
| ElevenLabs | Voice sessions | 5/h when Redis present; fail-open otherwise |
| GTM | Every layout | Third-party; not Prisma, still LCP/JS |

i18n: `LOCALEABLE_PATH_PREFIXES` is apply/auth/lp only. Marketing leaves `/` `/programs` `/faq` to Astro (`lib/i18n/config.ts:39–54`). `/enroll` must stay off that list (`rul_enroll_no_locale_prefix`).

---

## 3. Blast-radius findings (ranked by code)

Do not re-rank in prose. This is `graph/rank.json` from
`AUDIT_RUN_ID=run_20260823_0215 node scripts/audit-rank.mjs`
(generatedAt `2026-08-23T02:07:54.465Z`).

### Top slice

| Rank | id | severity | Title |
|---|---|---|---|
| 1 | `clm_hot_dashboard_query_fanout` | prod-break | Member dashboard home issues 20+ Prisma reads plus Coursera sync |
| 2 | `clm_hot_layout_auth_every_request` | prod-break | Root layout and middleware hit Supabase + Prisma on every HTML request |
| 3 | `clm_secrets_admin_pages_unscoped` | prod-break | Admin layout is global `isAdmin()`; many admin pages query all tenants |
| 4 | `clm_secrets_orphan_user_default_org` | prod-break | `ensureAppUserProvisioned` always writes orphans into default org |
| 5 | `clm_hot_admin_unbounded_scans` | ship-break | Admin training-progress loads up to 20k `courseProgress` rows unscoped |

### Below slice (still open)

`clm_dead_consent_form_unmounted`, `clm_dead_duplicate_nudge_crons`, `clm_dead_seeds_unwired_still`, `clm_deps_marketing_nested_install`, `clm_deps_prisma5_use_middleware`, `clm_hot_apply_ratelimit_failopen`, `clm_hot_custom_domain_branding_uncached`, `clm_hot_i18n_full_catalog_every_request`, `clm_secrets_qa_bypass_default_secret`, `clm_secrets_rls_guc_fail_open`. Hygiene excluded from default slice: `clm_dead_astro_enroll_shadow`, `clm_deps_heroicons_dev_only`.

### Prior beat (closed this run)

School #2 / consent / cookie / enroll-route claims from `run_20260816_0345` are `verified` or `wontfix` on current master. See `graph/reports/run_20260823_0215.md`.

---

## 4. Sequenced fix plan

Each phase is one blast-radius cut. One claim → one PR when possible. Do not mix layout-auth, dashboard-loader, and admin-scope in a single patch.

### Phase 0 — Observability (no behavior change)

**Problem.** We cannot see query count or pooler wait on `/` vs `/dashboard` vs `/admin/training-progress`.

**Evidence.** `lib/db/prisma.ts` logs queries only when `NODE_ENV === 'development'`. Production is `['error']`.

**Change.** Add a request-scoped query counter (debug header or existing `x-request-id` log field) behind an env flag. Record p95 Prisma count for layout-only vs dashboard.

**Blast radius.** Logging only if gated.

**Risks.** Accidental PII in query logs — log counts, not SQL.

**Verify.** One request to `/en` and `/dashboard` with the flag; counts appear in logs.

**Do not.** Enable Prisma `query` logs in production.

### Phase 1 — Cut anonymous request tax (quick win, claim #2 first half)

**Problem.** Public HTML still talks to Supabase.

**Evidence.** `middleware.ts:300–304` `getSession()` on non-protected paths. `app/layout.tsx:135` `forwardedUserId ?? (await getUser())`.

**Change.**

1. Middleware: call `getSession()` only when a Supabase cookie is present **or** the path is protected/tenant-api. Static-ish marketing/apply first paint should not create a GoTrue client.
2. Layout: `resolvedUserId = forwardedUserId` only. Do not `getUser()` when the header is absent. Middleware is the only writer of `x-wap-user-id`.
3. Keep `getDefaultOrganizationId` process cache; optionally lift default org id into `unstable_cache` so new isolates skip Prisma.

**Blast radius.** Session refresh on public pages may lag until the next protected navigation. Cookie expiry UX must be checked on `/apply` and `/en`.

**Risks.** A logged-in user hitting `/en` might not get `SentrySetUser` / GUC userId until they open a portal path. Acceptable if documented; or forward user id from `getSession()` **only when cookies exist**.

**Verify.** `curl -I http://localhost:3000/en` (no cookies) must not call GoTrue. Authed `/dashboard` still gets `x-wap-user-id`. Unit: layout helper “header absent → no getUser”.

**Do not.** Remove middleware session refresh on portal/admin. Do not cache `getUser()` across requests.

### Phase 2 — Dashboard query budget (claim #1)

**Problem.** `/dashboard` is a query fan-out.

**Evidence.** `rg -c 'prisma\.' app/(portal)/dashboard/page.tsx` → **24**. File is 1369 lines.

**Change.** Extract `loadMemberDashboardHome(userId)` that runs **one** `$transaction` (or 1–2 parallel batches) selecting the columns the kits need. Move Coursera auto-sync off the render path (existing cron `coursera-training-sync` hourly). Keep `getMemberState` but require Redis in production or inline it in the batch. Pass precomputed roles into `getPortalSwitcherRoles`.

**Budget (proposed rule `rul_dashboard_query_budget`):** ≤ 8 Prisma operations on the home render after layout bootstrap, including the layout’s two bootstrap reads. Record the budget in this file when the PR lands.

**Blast radius.** Every member home variant (mobile/desktop kits). High visual risk if fields go missing.

**Risks.** Hidden N+1 inside helpers (`getMemberState`, career brief, missions). Count queries with the Phase 0 counter, not by reading the file.

**Verify.** Phase 0 counter on `/dashboard`. Existing dashboard unit/API tests. No new `prisma.` in `page.tsx` except the loader call.

**Do not.** Add another widget with its own `findMany`. Do not wrap each current call in `unstable_cache` without a tenant-and-user key.

### Phase 3 — Admin tenant scope + pagination (claims #3 + #5)

**Problem.** Second-org admin sees all tenants; pages load thousands of rows.

**Evidence.** `app/admin/layout.tsx:35` `isAdmin`. `training-progress` takes 5k/5k/20k. `placements` `findMany` take 500, no org. `rg withTenantScope` on those pages is empty.

**Change.**

1. Layout: `isAdminInOrg(user.id, actorOrgId)` except `super_admin`.
2. Pages: `withActorTenantScope` / `getActorOrganizationId` + `where: { organizationId }` or parent FK.
3. Caps: training-progress default `take: 200` + cursor; progress aggregated in SQL (`groupBy` / raw) not 20k row hydrate.
4. Cron digest: hard cap `take: 2000` total, not `2000 * n`.

**Blast radius.** Every unscoped `app/admin/**/page.tsx`. Inventory with `rg prisma. app/admin --glob '*.tsx'` before coding.

**Risks.** Super-admin support workflows that intentionally cross tenants must use `crossTenantOK` and stay reviewable.

**Verify.** `scripts` / existing `check:tenant-routes`. Add a test: org-A admin `findMany` users does not return org-B. Load training-progress with >200 members — page still 200.

**Do not.** “Fix” by `FORCE ROW LEVEL SECURITY` in the same PR. Do not scope partner pages again (already done).

### Phase 4 — Provision into the request org (claim #4)

**Problem.** Orphans become default-tenant members.

**Evidence.** `lib/member/ensureAppUser.ts:54`.

**Change.** Pass `organizationId` from `resolveOrgFromRequest(headers)` (authenticated custom domain) or from a trusted auth metadata claim. Default org remains the fallback only when host is canonical **and** metadata is empty. Never overwrite an existing `users.organizationId`.

**Blast radius.** Login, layout, any signup that relies on the healer.

**Risks.** A workforceap user on a partner custom domain could be created in the partner org. Require host+session agreement.

**Verify.** Unit tests around `ensureAppUserProvisioned` with injected org id. Do not run against prod.

**Do not.** Change this in the same PR as layout `getUser` removal without tests — easy to drop provisioning.

### Phase 5 — Rate limits fail-closed for spend paths (claim below slice)

**Problem.** Apply/signup/AI/voice return `{ success: true }` when Redis is null.

**Evidence.** `lib/rate-limit.ts:383–437` vs `failClosedLimit` for auth/contact.

**Change.** Route those helpers through `failClosedLimit`. Keep boot throw. Preview must set Upstash or `RATE_LIMIT_ALLOW_MISSING_UPSTASH=1` explicitly.

**Blast radius.** Apply conversion if preview forgets Redis and starts 429ing.

**Verify.** Existing `tests/api/auth-routes.spec.ts` patterns. New test: limiter null + `NODE_ENV=production` + no allow-missing → apply signup 429.

**Do not.** Lower the launch-bumped apply limit (50/30m) in the same PR.

### Phase 6 — i18n + branding cache (claims below slice)

**Problem.** 184KB catalog + fat client provider; custom-domain branding uncached.

**Evidence.** `wc -c messages/en.json` = 184184. `pickRootClientMessages` includes `admin`, `counselor`, `employer`, `dashboard`. `getRequestOrgBranding` uncached when `x-wap-org-id` set.

**Change.** Split message catalogs (marketing vs portal vs admin). Layout picker loads only namespaces the chrome needs (`nav`, `cta`, `footer`, `auth`, `common`). Cache branding by org id with `unstable_cache` + tag.

**Blast radius.** Missing translation keys if a page expected a namespace on the root provider.

**Verify.** Marketing `/en` client payload no longer includes `admin.*`. Custom-domain request hits branding cache on second load (Phase 0).

**Do not.** Invent new copy. Do not mix Astryx inside kit.

### Phase 7 — Cron diet

**Problem.** 27 crons + two overlapping nudge jobs + Coursera triple-sync.

**Evidence.** `vercel.json` crons. `inactive-nudge` vs `inactivity-nudge`. `coursera-sync`, `coursera-b4b-sync`, `coursera-training-sync`, `coursera-auto-heal`.

**Change.** Merge nudge jobs or disable one. Move dashboard Coursera sync fully to cron (Phase 2). Stagger hourly jobs. Cap every `findMany`.

**Verify.** Admin cron dashboard still records executions. No double-nudge (existing `nudgeThrottle`).

**Do not.** Delete a cron without checking `isCronEnabled` consumers.

### Phase 8 — RLS for real (structural, last)

**Problem.** Application-layer scope is incomplete; DB will not save you.

**Evidence.** `lib/db/prisma.ts` GUC off; fail-open comments; `relforcerowsecurity=false`.

**Change.** Separate login role (not table owner). `FORCE ROW LEVEL SECURITY`. Batch GUC **inside** the same transaction as the query (`$extends`, not `$use`). Then set `WAP_RLS_GUC_ENABLED=true` in the **same** deploy. Prisma 6 upgrade rides this train (`clm_deps_prisma5_use_middleware`).

**Blast radius.** Entire data plane. Preview flatten-tx will hide bugs.

**Verify.** Shadow DB test (`scripts/p1/test-force-rls.ts` exists). Portal p95 must not regress to 504.

**Do not.** Enable the flag alone. Do not flatten transactions in production.

### Phase 9 — Build / assets (hygiene)

- Stop copying Astro `enroll/concordia` once Next enroll is canonical (`clm_dead_astro_enroll_shadow`).
- Move `@heroicons/react` to lab-only or drop (`clm_deps_heroicons_dev_only`).
- Decide whether Vercel must `npm ci` marketing on every production build (`clm_deps_marketing_nested_install`).
- `public/images` 6.9MB is acceptable with current Cache-Control; do not add uncompressed heroes.

---

## 5. Quick wins vs structural work

### Quick wins (small PRs, low blast)

| Win | Claim | Why it’s small |
|---|---|---|
| Skip `getUser()` when `x-wap-user-id` is missing | #2 | One line + middleware cookie guard |
| Skip `getSession()` when no auth cookies | #2 | Same cut |
| `unstable_cache` branding by org id | below slice | Mirror `getDefaultOrgBranding` |
| Apply/voice `failClosedLimit` | below slice | Wrapper change + tests |
| Cap digest `take: 2000` | #5 sibling | One integer |
| Disable one of the two nudge crons | below slice | `vercel.json` / `isCronEnabled` |
| Accept prior proposed rules that now pass | 2026-08-16 | Graph only |

### Structural (own milestones)

| Work | Claim |
|---|---|
| Dashboard home loader + Coursera off render | #1 |
| Admin `isAdminInOrg` + scope every list page | #3, #5 |
| Org-aware `ensureAppUserProvisioned` | #4 |
| Message catalog split | i18n |
| Forced RLS + Prisma 6 + non-owner role | GUC / deps |
| Shared Redis for default-org id (all isolates) | request cost |

---

## 6. Human gate — ship first vs wait

**Nothing in this document ships until a human picks a row.**

### Ship first (before more traffic, still single-tenant)

1. Phase 1 (anonymous auth tax) — highest leverage, smallest design risk.
2. Phase 2 (dashboard budget) — this is the 504 path.
3. Phase 5 (fail-closed spend limiters) if Upstash is already in prod.
4. Digest/nudge caps.

### Ship before a second organization or custom domain goes live

5. Phase 3 (admin scope + pagination).
6. Phase 4 (provision into request org).
7. Branding cache for `x-wap-org-id`.
8. Accept `rul_admin_pages_tenant_scoped` and `rul_provision_uses_request_org` after those PRs.

### Wait (do not start from this audit)

- Forced RLS / `WAP_RLS_GUC_ENABLED` (Phase 8).
- Prisma 6/7 (`$use` removal) except as part of Phase 8.
- Rewriting i18n catalogs (Phase 6) unless marketing perf is a stated goal.
- Merging Astro + Next enroll in a “cleanup” PR (copy/stake risk; `rul_enroll_copy_stake`).
- Reopening `clm_hot_stamp_update`.

### Explicitly do not ship from this beat

The fixer did **not** implement the top slice. These cuts are not “clearly safe/small” as a bundle. Phase 1 alone is the candidate first patch if the human wants code next.

---

## 7. Back edge — writing accepted findings into `graph/rules.json`

Per `graph/SCHEMA.md` and the skill:

1. Human sets `graph/runs.json` → this run `humanGate` to `ship-selected` or `closed`.
2. For each finding that should constrain the next audit:
   - status `accepted` on the **claim** only after a rule exists with `fromClaimId` and `status: "accepted"`, **or** a `wontfix` supersession.
   - `scripts/audit-graph-check.sh` fails if an accepted claim has neither.
3. Agents may only add `proposed` rules (this beat added six). Humans flip `proposed` → `accepted`.
4. `node scripts/audit-map.mjs` loads **accepted** rules only (`scripts/audit-map.mjs` `loadRules()`).
5. Never edit `graph/SCHEMA.md`, `scripts/audit-rank.mjs`, or `scripts/audit-graph-check.sh` inside an audit beat.
6. Claims are append-only. Supersede; do not rewrite evidence to look better.

### Proposed rules from this beat (awaiting human)

| id | Constraint |
|---|---|
| `rul_layout_skip_getuser_when_anonymous` | Layout does not `getUser()` without `x-wap-user-id` |
| `rul_provision_uses_request_org` | Healer does not hardcode default org |
| `rul_admin_pages_tenant_scoped` | Admin lists use `isAdminInOrg` + scope |
| `rul_no_rls_guc_without_force` | No GUC flag without FORCE RLS + batched GUC |
| `rul_dashboard_query_budget` | Dashboard home stays under the recorded budget |
| `rul_apply_ratelimit_fail_closed_prod` | Apply/voice/AI use `failClosedLimit` in prod |

### Prior proposed rules ready to accept (checks pass on master)

`rul_enroll_flag_must_serve`, `rul_admin_school_is_data_entry`, `rul_partner_ref_clear_matches_plant`, `rul_admin_partner_pages_tenant_scoped`.

---

## Appendix A — request-cost budget (current, measured as static counts)

Not runtime. Re-measure with Phase 0.

| Surface | Auth RTTs | Prisma (typical) |
|---|---|---|
| Public `/en` (no cookies) | middleware `getSession` + layout `getUser` | default org (1st isolate) + branding (cached 1h) |
| Authed `/dashboard` | middleware `getUser` + layout header (no second getUser if header set) + layout still `getUser()` for provision | layout 2–4 + page 24 + helpers |
| `/admin/training-progress` | same as admin | 3 huge `findMany`s (or 6 in legacy UI) |

## Appendix B — files this plan is allowed to touch (by phase)

- Phase 1: `middleware.ts`, `app/layout.tsx` only.
- Phase 2: `app/(portal)/dashboard/page.tsx` + new loader under `lib/member/` — not kit chrome.
- Phase 3: `app/admin/layout.tsx` + listed unscoped pages; not `lib/db/prisma.ts`.
- Phase 4: `lib/member/ensureAppUser.ts` + callers.
- Phase 8: `lib/db/prisma.ts` + migrations — dedicated PR, frozen-node rules still apply to the ranker.
