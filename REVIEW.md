# WorkforceAP Codebase Review — 2026-05-09

> **Scope.** Full-repo architecture and code-quality review. Findings are documentation-only; no code was changed.
> **Branch reviewed.** `cursor/workforceap-quality-review-c250` at HEAD `a4e685c3`.
> **Reviewer focus.** Architecture and design patterns · code smells and tech debt · risky/fragile production patterns · missing tests · security.

---

## TL;DR

This is a Next.js 15 / Prisma / Supabase app that has clearly scaled past its original "marketing replica" framing into a multi-tenant SaaS portal (208 page routes, ~310 API routes, 74 Prisma models, ~360 lib files, 90 migrations, 6 portal personas). The platform is feature-rich, but the codebase exhibits the classic symptoms of a fast-growing project that has out-paced its hygiene budget:

- **Build-time safety nets are off.** `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` are both `true`, and `react-hooks/rules-of-hooks` is disabled in ESLint. Deployment depends on developers running checks locally.
- **A custom build-time migration runner (`scripts/safe-migrate.cjs`) silently auto-resolves "stuck" migrations** by parsing stderr regexes and marking them as applied.
- **Tenant isolation is partial** — a thoughtful `withTenantScope` proxy exists and is used in ~45 places, but `prisma.*` is called directly in many other route handlers, including admin metrics that aggregate across the whole DB regardless of org.
- **The dashboard, admin metrics, cohort analytics, and several crons fan out unbounded `findMany` queries** and aggregate in JS. These will not scale beyond ~tens of thousands of rows.
- **Out-of-band schema management.** `lib/xapi/mappings.ts` issues `CREATE TABLE IF NOT EXISTS` at runtime for `coursera_identity_mappings` and `coursera_xapi_events`. Those tables are not in `prisma/schema.prisma`. Production DB user must therefore have DDL privileges.
- **Repo hygiene is poor.** Two lockfiles (`package-lock.json` + `pnpm-lock.yaml`), 16 root-level Markdown docs, 74 files in `docs/`, an `error.log`, an empty `prisma.())` filename, AI-agent probe files (`.kimi_probe.txt`, `.kimi_test.txt`), narration MP3s (~750 KB), the brand-guide PDF (~824 KB), QA screenshots (`.qa/`), and Vercel/Stitch/openclaw/Jules dotfiles are all committed.
- **AGENTS.md is wildly out of date.** It describes "10 routes", "no configured linters or test frameworks", and treats the project as a brochure site. Reality is enterprise SaaS with Playwright + 62 unit tests + ESLint + a migration runner.
- **Hardcoded PII / personal accounts.** `michael.brown@workforceap.org`, `michael.brown2@workforceap.org`, and `mabrown040@gmail.com` are baked into source as default email recipients and super-admin grants in 8+ files.
- **Three (really four) competing i18n systems** are in use simultaneously and this is documented in `ENG_REVIEW_i18n.md` but unaddressed.

The platform is shipping real value to real members; nothing here suggests a rewrite. But there is a meaningful list of issues that will bite in production if left alone, and several CRITICAL items that should be addressed before the next user-data-impacting deploy.

---

## Severity Legend

- **CRITICAL** — security, correctness, or data-integrity bug that can cause member harm or breach. Fix before next deploy.
- **HIGH** — material risk to availability, scalability, or maintainability. Fix in current sprint.
- **MEDIUM** — clear tech debt or smell with a real but bounded impact. Fix soon.
- **LOW** — hygiene, docs, or style. Fix opportunistically.

Each finding has the form: **Title** · file(s):line(s) · *Why it matters* · *Suggested direction* (no code shown).

---

## CRITICAL

### C-1. `safe-migrate.cjs` auto-resolves "stuck" migrations from stderr regex
File: `scripts/safe-migrate.cjs:44-69`; wired in `package.json:7` build script.

`runMigrateDeploy()` runs `prisma migrate deploy` during `npm run build`. On failure it parses stderr for one of:

- `Migration name: <name>`
- `The \`<name>\` migration started at … failed`
- `type "<name>" already exists`
- `relation "<name>" already exists`
- `column "<name>" of relation "<name>" already exists`

It then runs `prisma migrate resolve --applied <name>` and retries up to 5 times. Marking a failed migration as applied means the **schema change in that migration was never executed**, but the `_prisma_migrations` row says it was. Any downstream migration that depends on that schema change will then either fail (best case) or silently produce wrong rows.

This is a foot-gun specifically for fresh deploys, branch deploys, restored DB clones, or migration retries after partial failures (P3009/P3018 happen for real reasons that "mark applied" does not fix).

*Direction.* Remove the auto-resolve loop. Migration failures should fail the deploy and require human review — that is what `prisma migrate resolve` is for, but interactively.

### C-2. Build-time TypeScript and ESLint checks are disabled
File: `next.config.ts:28-29`.

```
typescript: { ignoreBuildErrors: true },
eslint:     { ignoreDuringBuilds: true },
```

The justifying comment says CI runs `tsc --noEmit` and `eslint .` on every PR. That is not visible in this repo's `.github/` workflows folder (and even if it is enforced, any direct push to `master` or any developer machine bypasses it). With both gates disabled, **production builds can ship type errors and lint errors silently**.

Concrete current evidence: `npx tsc --noEmit` fails on stale `.next/types/**` references — the build does not catch this; Next builds are silent.

*Direction.* Re-enable both. If RAM is the issue, raise `NODE_OPTIONS=--max-old-space-size`, split `tsc` to a dedicated CI step, and use `next lint --max-warnings 0`.

### C-3. `react-hooks/rules-of-hooks` is disabled in ESLint
File: `eslint.config.mjs:24`.

```
"react-hooks/rules-of-hooks": "off",
```

Rules-of-hooks is the single rule that catches "hook called inside a condition / loop / after early return", which produces undefined-behavior in React (state from previous renders bleeds into the wrong hook slot). With ~250 `'use client'` components and dozens of stateful Portal flows, this rule being off is a latent stability landmine. Several other React-Hooks rules are also explicitly off (`react-hooks/refs`, `react-hooks/set-state-in-effect`, `react-hooks/immutability`, `react-hooks/purity`, `react-hooks/error-boundaries`).

*Direction.* Re-enable `rules-of-hooks` immediately. Triage the others on a separate PR.

### C-4. Runtime `CREATE TABLE IF NOT EXISTS` outside of Prisma migrations
File: `lib/xapi/mappings.ts:46-121` (called from `lib/xapi/mappings.ts:180,265,359,383`, `lib/admin/courseraOps.ts:28,66`, etc.).

`ensureCourseraMappingTables()` issues `prisma.$executeRawUnsafe` to create `coursera_identity_mappings` and `coursera_xapi_events` plus four indexes the first time any of several hot paths runs. These tables are **not in `prisma/schema.prisma`**. Implications:

- The production DB user must have `CREATE TABLE`, `CREATE INDEX`, and arbitrary DDL privileges in perpetuity. That is not a posture you want for a long-lived service account.
- Schema evolution for these tables is invisible to migration tooling. Any change has to be hand-rolled and coordinated against running instances.
- A failed first-run leaves `ensureTablesPromise = null` and the next concurrent caller will retry, but if the failure is a permission issue, every page hit retries forever and floods logs.
- Two competing schema-management patterns coexist, and a future contributor will not know which one to use.

*Direction.* Convert these tables into Prisma models, generate a real migration, and drop the runtime DDL. Strip DDL privileges from the runtime DB role.

### C-5. `lib/auth/ensureUser.ts` rewrites a User's `id` on email collision
File: `lib/auth/ensureUser.ts:40-46`.

When `prisma.user.upsert({ where: { id: supabaseUser.id }, … })` fails with P2002 (unique-on-email), the catch block does:

```
prisma.user.upsert({ where: { email }, …, update: { id: supabaseUser.id } });
```

This **mutates the existing `users.id`** to match the new Supabase auth user. Concrete attack/incident scenarios:

- An attacker who can register a Supabase account with a victim's email (or merely sign up before the original member completes verification) can have the existing portal record re-pointed to the attacker's auth subject. Once they confirm, they are logged in to the victim's portal data (applications, resume, counselor notes, WIOA submission, points balance, etc.).
- Even absent malice, a benign data race between `apply/signup` and a CSV import of the same email causes silent ownership transfer.
- Updating the primary key cascades through every FK with `onUpdate` — but Prisma does not declare `onUpdate: Cascade` on most relations, so some children may end up dangling or fail with FK violations.

*Direction.* Refuse the conflict and surface a deterministic error ("account exists, please log in"); never silently re-link an auth user to a pre-existing record. If a real merge is needed, build a documented merge tool with audit trail.

### C-6. `/api/gdpr/delete` is a one-click, unconfirmed self-delete that does not actually delete
File: `app/api/gdpr/delete/route.ts:13-71`.

Issues stack:

1. **No re-auth, no confirmation token, no captcha.** A POST from any logged-in session erases the account.
2. **The Supabase auth user is not deleted.** The session keeps working after "deletion".
3. **`users.deletedAt` is not set.** Other queries (`where: { deletedAt: null }`) keep counting this user.
4. **Inconsistent email-stub format with `app/api/admin/members/[id]/delete/route.ts`** — admin uses `…@deleted.invalid` (the proper sink TLD); this route uses `…@workforceap.org` (a real owned domain).
5. **Member events, ai_tool_results, applications, job_applications, mentor_sessions, weekly_recaps, counselor_notes, partner_referrals, etc. are not anonymized or deleted.** Those tables hold large amounts of identifying content (free-text elevator pitch, voice transcripts, addresses inside resumes).
6. **No transaction.** A partial failure leaves the account in a half-anonymized state with no recovery.
7. **No audit log row is created** in `audit_logs` (only a `member_events` row, which is itself deletable user data).

This is a regulatory exposure (CCPA/GDPR/state privacy laws all expect actual erasure or documented retention) AND a footgun for users.

*Direction.* Add a confirmation step (re-enter password or click an emailed link), wrap the work in a `prisma.$transaction`, sweep all PII tables, delete the Supabase auth user via the service-role admin API, set `users.deletedAt`, and emit one canonical `audit_logs` row.

### C-7. Public `/api/jobs` endpoint is unbounded and unpaginated
File: `app/api/(portal)/dashboard/jobs/route.ts:99-117`.

```
const jobs = await prisma.job.findMany({ where, orderBy, include: { employer: … } });
```

There is no `take`, no cursor, no offset, and no maximum cap. With thousands of `live` jobs this returns the entire table on every public request, then filters in JS via `.filter(...)` (`isExcludedPublicEmployerName` / `isExcludedPublicJobTitle`). This is both a perf bomb (memory + DB load on every browser hit) and a DoS amplifier — a single botnet could trivially make the database the bottleneck.

*Direction.* Hard cap at 100, add cursor-based pagination, push the exclusion filters into `where`, and put a 60s edge cache on the public read.

### C-8. Admin / cohort analytics fetch *all* users into memory
Files: `lib/admin/cohortAnalytics.ts:46-49,103-106,159-162` · `lib/admin/metrics.ts:267-282,307-309` · `app/api/cron/weekly-recap-email/route.ts:42-53` · `app/api/cron/inactivity-nudge/route.ts:21-26`.

The pattern, repeated five times across the cohort analytics and the weekly admin recap cron, is:

```
prisma.user.findMany({ where: { deletedAt: null }, select: { id, enrolledProgram } })
const activeIds = new Set(events.map(e => e.userId))
prisma.user.count({ where: { id: { notIn: [...activeIds] } } })
```

Two failure modes:

1. **Every metric / cron loads the entire users table into JS** to compute group counts. At ~10 k users this is fine; at ~100 k it is hundreds of MB and seconds of GC.
2. **`id: { notIn: [array] }`** generates a `NOT IN ($1, $2, …)` SQL list whose size scales with active users. Postgres will accept it but parameter list growth past ~32 k starts to fail or be exceptionally slow, and bytes-on-wire balloons.

*Direction.* Replace with `groupBy` / `LEFT JOIN … IS NULL` / window functions in raw SQL. Keep one canonical "inactive members" SQL definition in `lib/` and reuse from the metrics page and both nudge crons.

### C-9. "Tenant scope" is enforced *only* where developers remember to use it
Files: `lib/tenant/withTenantScope.ts` (the helper, used in ~45 places) vs. ~75 API routes that call `prisma.*` directly without it.

The proxy is well designed: it injects `organizationId` on read and refuses cross-tenant writes for 8 enumerated models. But the proxy is opt-in — every route handler must remember to call it. Concrete leaks visible today:

- `app/api/admin/members/route.ts` (`requireAdmin` then `prisma.user.findMany` with no org filter — admin in Org A can list members in Org B if the platform ever genuinely runs >1 org).
- `lib/admin/metrics.ts` and `lib/admin/cohortAnalytics.ts` aggregate the entire `users` / `applications` / `weekly_recaps` / `member_events` tables.
- `app/api/cron/weekly-recap-email/route.ts` counts new applicants and placements platform-wide.
- All raw-SQL paths (`$queryRawUnsafe`, `$executeRawUnsafe`) — 84 files — bypass the proxy entirely.

The schema's own `withTenantScope.ts` header acknowledges this: "The structural fix is Postgres RLS in Sprint A.3."

*Direction.* Until RLS lands, add a CI grep that fails any new `prisma.<scoped-model>` outside `withTenantScope` and `crossTenantOK`. The current helper is a strong floor; let CI keep new code on it.

### C-10. xAPI test-token route relies on an env-name guardrail
File: `app/api/test/xapi-access-token/route.ts:13-16`.

The route mints a long-lived xAPI access token (HS256) and returns it in JSON. It is only blocked when `process.env.NODE_ENV !== 'test'` AND `E2E_ISSUE_XAPI_TOKEN !== '1'`. Two ways this fails:

- Anyone who flips `E2E_ISSUE_XAPI_TOKEN=1` in a Vercel preview env (or has it persisted from a forgotten preview branch) opens up free token issuance over the public internet.
- The guard fails open if `NODE_ENV` is unset (it is `'test' === undefined` → false, so allowByNodeEnv is false; OK). But if `NODE_ENV === 'development'` and `E2E_ISSUE_XAPI_TOKEN=1` are co-set in a deployed preview, the route is publicly mintable.

*Direction.* Hard-delete this route from the production bundle (file-level `if (process.env.NODE_ENV === 'production') notFound()` at module top, or move it into a `__tests__/` directory excluded from build). Add an SSRF/auth header so the token endpoint requires a shared secret in any environment.

---

## HIGH

### H-1. Stray, broken, secrets-adjacent files committed at the repo root
`prisma.())` (zero-byte file, almost certainly a `>` redirect typo) · `.kimi_probe.txt` · `.kimi_test.txt` · `test-file.txt` · `error.log` (a `tmux`/Codex client log with timestamps and `ChatGPT-Account-Id` header references) · `git_script.sh` (hard-codes `/mnt/c/Users/mabro/...`) · `narration_A.mp3` (397 KB) · `narration_B.mp3` (343 KB) · `wap_logo.jpg` (24 KB) · `WorkforceAP-Brand-Guide-2026.pdf` (824 KB) · `cursor-api-payload.json`.

Plus committed dotfile dirs: `.vercel/`, `.qa/`, `.portal-audit/`, `.Jules/`, `.openclaw/`, `.taskmaster/`, `.stitch/`, `audit-screenshots/`, `artifacts/` (1 MB of audit reports).

`.gitignore` is 16 lines and ignores none of the above.

*Why it matters.* (a) Repo size: 1.7 GB on disk including a large `node_modules`, with the source tree itself bloated by binary content that does not change. (b) Confusion / supply-chain surface — `prisma.())` is real on disk and could confuse tooling, agents, or grep-based scripts. (c) `error.log` contains references to a ChatGPT account ID; there is no `.env` here but the policy of "logs in repo" is the wrong default.

*Direction.* Add `*.log`, `*.mp3`, `*.pdf`, `narration_*.mp3`, `audit-screenshots/`, `artifacts/`, `.qa/`, `.portal-audit/`, `.Jules/`, `.openclaw/`, `.taskmaster/`, `.stitch/`, `.kimi_*` to `.gitignore`; delete the committed copies in a hygiene PR; delete `prisma.())`, `test-file.txt`, `git_script.sh`.

### H-2. Two lockfiles
`package-lock.json` and `pnpm-lock.yaml` both committed at root.

This is a recipe for divergent dependency resolution between contributors using different package managers. CI cannot trust either lockfile to be the source of truth. Vercel will resolve based on whichever it sees first.

*Direction.* Pick one (npm based on `package.json` scripts and `package-lock.json` being newer); delete the other; document the choice in `AGENTS.md`.

### H-3. `lib/swarm/taskQueue.ts` is broken-and-unused
File: `lib/swarm/taskQueue.ts`.

- Uses MySQL/SQLite `?` parameter syntax against Postgres (Postgres requires `$1, $2, …`). The `INSERT … RETURNING *` and all `UPDATE` calls would fail at the first execution.
- References table `agent_tasks`, which does **not** exist in `prisma/schema.prisma` and has no migration.
- Grep confirms zero importers anywhere in the repo.

*Direction.* Delete the file (and `lib/swarm/` if empty).

### H-4. `app/api/health/slo/route.ts` is `@deprecated` self-described dead code
File: `app/api/health/slo/route.ts:30-44` (the JSDoc literally says "if Sprint D.2 has been deprioritized or dropped, this route should be removed").

Six handler functions, each returning `current: null, status: 'unknown'`. Admin-only, no consumers found anywhere in the repo.

*Direction.* Delete the route and the SLO scaffolding, or wire it. Leaving "honest stubs" forever rots into "looks-real but isn't" the moment somebody adds a real number to one of them.

### H-5. `lib/email.ts` is 1,355 lines of repetition with hard-coded recipients
File: `lib/email.ts` (notably `:37-40` for hard-coded recipients; `:55-71`, `:284-337`, `:347-385`, `:437-475`, `:584-613`, `:616-645`, `:687-725`, `:766-799`, `:802-830`, `:1191-1225`, `:1228-1286`, `:1288-1320`, `:1323-1354` for repeated send wrappers).

22+ exported `sendXEmail()` functions that all open with the identical:

```
const resend = getResend();
if (!resend) { console.warn(…); return { ok: false, error: 'Email not configured' }; }
…
try { await resend.emails.send({…}); return { ok: true }; } catch (err) { console.error(…); return { ok: false, error: … }; }
```

Plus `DEFAULT_VOICE_COACH_TRANSCRIPT_RECIPIENTS = ['michael.brown@workforceap.org', 'michael.brown2@workforceap.org']` hard-coded into the module. Same individual hard-coded again in `app/api/interview/history/route.ts:215`, `prisma/seed.ts:297,353,361`, `app/employers/page.tsx:590-591`, `app/admin/coursera/csv-import/page.tsx:49`, `scripts/fix-michael-brown-login.ts`, `scripts/create-employer-michael-brown.ts`.

*Why it matters.* (a) Personnel-tied dependency — when this person changes role, multiple email flows silently send to a stale address. (b) Massive code duplication — a single helper `sendBrandedEmail({ to, subject, htmlBuilder })` would replace 80% of this file. (c) PII / employee identification in source.

*Direction.* Move recipients to env vars with sane defaults; introduce one `sendBrandedEmail` helper and reduce the 22 functions to thin wrappers.

### H-6. `app/(portal)/dashboard/page.tsx` is a 1,213-line page component
File: `app/(portal)/dashboard/page.tsx`.

The page does at least 9 parallel Prisma queries (`prisma.user.findUnique`, `prisma.aIToolResult.findMany`, `prisma.application.findFirst`, `prisma.memberNextBestAction.findMany`, `prisma.jobApplication.findMany`, `getMemberPoints`, `prisma.pointsTransaction.findMany`, `prisma.memberEvent.findMany`, `prisma.memberEvent.findFirst`), kicks off a separate B4B HTTP call, runs `getMemberState`, runs `maybeAutoSyncCourseraOnDashboard` (which can mutate the DB on first hit), groups session events by `sessionId` in JS, builds checklists, builds next-best-action rankings, and computes mobile orb percentages — all inside the page.

This is the canonical bigball-of-mud Next.js page: it's both a Server Component and a data composition root and a business-rules engine. Every change to "what the dashboard shows" risks regressing every other thing the dashboard shows.

*Direction.* Pull all data fetching into `lib/dashboard/loadDashboardModel.ts` returning a typed view-model; keep `page.tsx` to layout and props handoff. Apply the same surgery to `components/portal/sessions/SessionRunClient.tsx` (1,355 lines), `components/portal/tools/SkillMapperClient.tsx` (1,260 lines), `components/admin/CourseraMappingsAdmin.tsx` (1,070 lines), `app/admin/coursera/page.tsx` (1,043 lines), `components/employer/EmployerJobsBoard.tsx` (1,017 lines).

### H-7. `weekly-recap` cron silently caps at 500 members per run; never iterates
File: `app/api/cron/weekly-recap/route.ts:33-34`.

```
take: 500,
```

No cursor, no second pass, no queue. With >500 enrolled members in any given week, the overflow simply does not get a recap. Sequential per-member processing inside a single Vercel cron also flirts with the 60 s function ceiling once email + DB latency stack up.

Worse, the route uses `recap.openedAt` as a "closest proxy for sent" — a confusing semantic that conflates "we sent an email" with "the user opened it". No idempotency guard if the cron fires twice in one window.

*Direction.* Replace the per-cron loop with a queue (Upstash QStash, Vercel Workflow, etc.); add a real `WeeklyRecapDelivery.sentAt` column; track per-row idempotency keys.

### H-8. Two near-duplicate "inactive nudge" crons
Files: `app/api/cron/inactive-nudge/route.ts` (daily 10 am, 7 d threshold, all members with reminders on) and `app/api/cron/inactivity-nudge/route.ts` (Wed 10 am, 14 d threshold, enrolled members only). Both use `sendInactiveNudgeEmail`.

A 14-day-inactive enrolled member with reminders on can receive both a 7-day nudge and a 14-day nudge in the same week, at the same UTC hour, with the same email body. There is no per-user rate limit between them.

Both routes also use the `id: { notIn: [...activeUserIds] }` antipattern (see C-8).

*Direction.* Merge into one cron with a configurable threshold, dedupe at the email layer with a "last nudge sent" timestamp.

### H-9. `lib/admin/metrics.ts` has no caching and no tenant scope
File: `lib/admin/metrics.ts:251-364`.

Each load of `/admin` (or any consumer of `getAdminMetrics`) fans out 8+ awaits and 14 days × 3 series of bounded queries (`getDailyActivity`), plus four `Promise.all` raw counts (`getCareerOsMetrics`), plus `getEnrollmentByProgram`, `getPlacementStats`, and `getAiToolStats` (which runs `countAiToolRunsBetween` three more times). Aggregate is ~25–30 DB queries on every admin nav click.

None of them cache. None of them respect `organizationId`. The page's typical p95 will degrade linearly with the tables.

*Direction.* Cache with `unstable_cache` (Next 15) tagged on `member_events`, `ai_tool_results`, etc.; scope every aggregate by org; collapse the per-day series into one SQL `date_trunc … GROUP BY day` query.

### H-10. `lib/rate-limit.ts` declares `FAIL_CLOSED` but never reads it
File: `lib/rate-limit.ts:9` — `const FAIL_CLOSED = !redisUrl || !redisToken;`. Nothing uses it. Every `checkXRateLimit` returns `{ success: true }` when its limiter is null.

The header comment claims contact and confirmation are "fail-closed" but they are not. `checkContactRateLimit` returns success when Upstash is missing. So in the absence of Upstash credentials, every public form is unrate-limited.

*Direction.* Either honor `FAIL_CLOSED` (block contact/forgot-password/MFA-verify when Redis is unconfigured) or remove the dead variable AND remove the misleading comment. Pick a real default and assert at startup that production has Upstash configured.

### H-11. Third "ChunkLoad recovery" event listener is duplicated
Files: `app/layout.tsx:64-66` (inline `<script dangerouslySetInnerHTML>`) AND `components/ChunkLoadRecovery.tsx:25-54` (`useEffect` registers the same handlers).

Both run in the browser, both attach `error` and `unhandledrejection` listeners, both hit the same `wap:chunk-reload-once` sessionStorage key. The inline script is meant to fire before React hydration; the React component is added by `<ChunkLoadRecovery />` in `<body>`. After hydration, two sets of listeners fire on every error.

The presence of *any* such recovery in the layout is also a smell — it indicates that long-lived sessions hit "Loading chunk N failed" after deploys, which means stable chunk-naming and a `manifest.json` strategy are missing.

*Direction.* Pick one of the two listeners (the inline pre-hydration one is sufficient). Investigate the underlying chunk-mismatch issue rather than papering over it with a reload.

### H-12. `cron_inactive_nudge` (and other crons) bypass org tenancy
Files: `app/api/cron/inactive-nudge/route.ts:31-39` · `app/api/cron/weekly-recap-email/route.ts:24-58` · `app/api/cron/weekly-recap/route.ts:25-34` · `app/api/cron/applicant-followup/route.ts` (similar).

If the platform really is multi-tenant (and `withTenantScope` exists, the schema has `Organization`, custom domains are wired in middleware), then sending a "WorkforceAP weekly recap" email branded as the default org to a member of *another* org is an ugly cross-tenant leak.

*Direction.* Iterate by organization, render brand-aware copy via `getOrganizationBranding(orgId)` (the helper exists), and gate by per-org cron toggles.

### H-13. `isCronEnabled` matches by `summary.contains('toggled')`
File: `lib/cron/isCronEnabled.ts:8-19`.

Cron enable/disable is determined by scanning `WorkflowDiagnostic` rows for the most recent record whose `summary` text contains "toggled". This is fragile string-matching against a free-form `summary` field. Rename a log message and crons silently change state.

*Direction.* Add a dedicated `CronToggle` model (or a JSON column on `Organization`) with explicit `enabled` boolean and `enabledAt`/`disabledAt` audit columns.

### H-14. `withCronLogging` wrapper is partially redundant with handler-internal try/catch
Files: `lib/cron/withCronLogging.ts:26-42` · `app/api/cron/weekly-recap-email/route.ts:14-75` · `app/api/cron/coursera-b4b-sync/route.ts:19-42`.

Some crons wrap themselves in `withCronLogging` (which already catches exceptions and writes a `WorkflowDiagnostic`) AND wrap their body in another try/catch that *also* writes `logCronRun` and returns 500. Other crons trust the wrapper. Inconsistency means each route has subtly different observability semantics.

*Direction.* Pick the wrapper-only pattern; remove inline try/catch where it duplicates the wrapper.

### H-15. `User` model is a 70-field god-table
File: `prisma/schema.prisma:46-194`.

The `User` row mixes auth identity (`id`, `email`, `fullName`), assessment state (`assessmentCompleted`, `assessmentScore`, `assessmentScorePct`, `assessmentAnswers` JSON), notifications prefs (`notificationsUpdates`, `notificationsReminders`), program enrollment (`enrolledProgram`, `enrolledAt`, `programChangedAt`), interview lifecycle (`interviewEligible`, `interviewRequestedAt`, `interviewCompletedAt`), onboarding (`onboardingCompletedAt`, `onboardingPortal`, `tourCompletedAt`), workspace email, computer-support flag, Coursera sync timestamps, two huge JSON blobs (`careerRecommendationJson`, `wioaQualificationJson`), staff WIOA review fields, pipeline stage, plus 30+ relations.

*Why it matters.* Every read needs an explicit `select`, every change risks a surprise migration, and many of these fields are non-tenant-scoped self-service flags that belong on a `MemberProfile` / `MemberAssessment` / `MemberLifecycle` table.

*Direction.* Carve `MemberAssessment`, `MemberCourseraState`, `MemberWioaSubmission`, `MemberInterviewState` out of `User` over the next 2–3 migrations.

### H-16. `app/admin/members/route.ts` admin search has no org filter
File: `app/api/admin/members/route.ts:8-42`.

`requireAdmin(user.id)` only checks the global admin role; the `findMany` then runs across the whole users table with no `organizationId` filter. If the platform ever runs more than one org (custom-domain code paths in `lib/tenant/*` say it does), an admin in Org A can search Org B members.

*Direction.* Use `withTenantScope(adminOrgId, …)` consistently in every admin search/list endpoint.

### H-17. Public `/api/apply/signup` has no captcha despite Turnstile being wired
File: `app/api/apply/signup/route.ts:47-66`.

The route only protects against abuse via `checkApplySignupRateLimit(ip)`. `NEXT_PUBLIC_CAPTCHA_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` envs exist and `verifyTurnstileResponse` is used in `app/api/contact/route.ts`. The signup endpoint does not call it. Workforce centers / public libraries share NAT IPs (per the comment in `lib/rate-limit.ts:38-39`), and the rate limit was already loosened to 50 / 30 min / IP. A bot script can create 50 accounts per IP per 30 min.

Each signup creates a Supabase auth account, sends an email via Resend, sends an admin alert via Resend, and writes 4 Prisma rows. Cost amplification is real.

*Direction.* Wire the Turnstile check into `apply/signup`; consider also `member/signup`, `partner/signup`, `mentor/apply`, `auth/forgot-password`.

### H-18. Apply-signup writes to Supabase auth before Prisma transaction starts
File: `app/api/apply/signup/route.ts:143-160` then `:175-269`.

The flow is:

1. `supabase.auth.signUp(...)` — creates Supabase Auth user.
2. `prisma.$transaction([...upserts...])` — populates `users`, `course_enrollments`, `profiles`, `application` rows.

If step 2 throws, step 1 is not rolled back. The user is left with a working Supabase session but no portal record. The error message even acknowledges this: "We started your account, but could not finish setup." This is not an OK steady-state.

*Direction.* Either reverse the order (Prisma first, then Supabase auth — letting the user complete the email-confirm flow before the auth row is created), or wrap the Supabase create in a compensating `auth.admin.deleteUser` on Prisma failure.

### H-19. Resume validator accepts magic bytes anywhere in first 1024 bytes
File: `lib/resume/file-validation.ts:36-58`.

`validateFileType` searches for PDF/DOC/DOCX magic bytes within the first 1024 bytes (not just at offset 0). A polyglot file (PHP / HTML / JS that contains `%PDF` somewhere in a header comment within the first 1024 bytes) passes validation, then gets uploaded into the `member-resumes` Supabase bucket. With short-lived signed URLs that's mostly contained — but if a future flow returns the file with a guessed Content-Type or serves it inline, it becomes an XSS / RCE vector.

The `mimeType` argument is also accepted but never validated against `ALLOWED_MIME_TYPES`.

*Direction.* Anchor magic-byte checks at offset 0; cross-validate against the `mimeType` parameter; move the bucket to a strict `Content-Disposition: attachment` policy.

### H-20. `JsonLd` and several other components use `dangerouslySetInnerHTML`
Files: `app/layout.tsx:64-66, 79, 102-110` · `components/JsonLd.tsx:52, 56` · `components/theme/ThemeInitScript.tsx:4-6` · `components/platform/OrgBrandingStyle.tsx:13-15` · `app/(portal)/dashboard/counselor/page.tsx:93-95` · `app/leadership/page.tsx:24-25` · `app/faq/FAQContent.tsx:349-350` · `app/apply/page.tsx:277` · `app/employers/EmployerContactForm.tsx`.

Most of these are static strings or are correctly escaped (`safeJsonLdStringify` in `JsonLd.tsx`, `orgAccentCss` validates `/^#[0-9A-Fa-f]{6}$/`). But the proliferation of inline scripts also forces the broad CSP allowance of `'unsafe-inline'` in `next.config.ts:61` (see also M-3).

*Direction.* Audit every `dangerouslySetInnerHTML` to ensure all interpolated values are validated; migrate the GTM/SW-register/chunk-recover inline scripts into a nonce-based pattern so the CSP can drop `'unsafe-inline'`.

### H-21. ESLint disables `react-hooks/*` and other React rules wholesale
Already covered in C-3. Note also that `@next/next/no-html-link-for-pages` is off and `react/no-unescaped-entities` is off, which is fine but indicates the team has been turning rules off rather than fixing violations.

### H-22. Test suite does not cover the bulk of the API surface
Counts: 16 Playwright spec files, 62 unit test files (`lib/**/*.test.ts`).

API route count: ~310. Page route count: 208. Components: 329. Lib files: ~360.

The unit tests focus on isolated helpers (`postLoginRedirect`, `safeRedirectPath`, `mfaConfig`, `roles`, `coursera/config`, `coursera/csvImport`, `coursera/b4bClient`). The Playwright specs are mostly visual smoke and route-availability tests. There is **no integration test for the most security-critical paths**: signup, login, MFA verification, admin RBAC, GDPR export/delete, xAPI ingest, tenant boundaries.

*Direction.* Add Playwright suites for: (a) RBAC matrix — for every protected route, verify member / counselor / partner / employer / admin / super-admin / unauthenticated each get the expected 200/302/403; (b) cross-tenant isolation — register member in Org A, attempt to read Org B IDs across endpoints; (c) GDPR delete — confirm Supabase auth row is gone and protected pages 401 after the call; (d) Coursera xAPI ingest happy + error paths; (e) Apply/signup partial-failure recovery.

### H-23. Admin metrics expose unrelated data to all admins regardless of org
Files: `lib/admin/metrics.ts` · `lib/admin/cohortAnalytics.ts` · `app/admin/dashboard/page.tsx`.

A single admin sees totals across every tenant. Even if the platform today only has one paying org, the `/admin` dashboard already shows test-tenant data (the seeded "Workforce Solutions Capital Area" partner, the "Preview Employer Seed", etc.). At onboarding-time #2 this leaks production data of one customer to admins of another.

*Direction.* Plumb the org filter through every admin metric helper. Add a tenant-selector for super-admins.

### H-24. xAPI raw SQL paths are not tenant-scoped at all
Files: `lib/xapi/mappings.ts` · `lib/xapi/reprocess.ts` · `lib/admin/courseraOps.ts`.

All `xapi_statements` and `coursera_xapi_events` rows are queried without an `organizationId` filter. The matching `users(email)` join means an actor email match can cross orgs.

*Direction.* Add an `organization_id` column to `coursera_xapi_events` (and `coursera_identity_mappings`), populate from `users.organization_id` on insert, and filter every read.

---

## MEDIUM

### M-1. `AGENTS.md` is severely out of date
File: `AGENTS.md`.

Says "10 routes", "no configured linters or test frameworks", "imports `css/main.css`". The repo has 208 page routes, 62 unit tests, ESLint, Playwright, Prisma, Supabase, Sentry, Resend, Coursera B4B integration, Upstash, Turnstile, ElevenLabs, Anthropic/Groq/Gemini AI fallback, Vercel cron, etc. Cloud agents (and humans) reading this file will have wildly wrong context.

*Direction.* Rewrite. Reference `docs/SECURITY-AND-HEALTH.md`, `docs/COMPLETED-WORK-LOG.md`, `vercel.json` cron list, `lib/admin/cronRegistry.ts`.

### M-2. 16 root-level Markdown docs and 74 in `docs/`
The root has: `AGENTS.md`, `AI-TOOLS-BACKLOG.md`, `CEO-ANALYSIS-3-7-10-STAR.md`, `DEMO_SETUP.md`, `DEPLOY.md`, `DESIGN.md`, `DOCS-INDEX.md`, `EMAIL-SETUP.md`, `ENG_REVIEW_i18n.md`, `ENV-VARIABLES.md`, `LAUNCH-RUNBOOK.md`, `NOTIFICATION-AUDIT.md`, `SYSTEM-DOCUMENTATION.md`, `TODOS.md`, `USER-GUIDE.md`, `WORKING.md`. Some duplicate (e.g., `EMAIL-SETUP.md` AND `docs/EMAIL_SETUP.md`).

*Direction.* Consolidate under `docs/`. Keep only `README.md`, `AGENTS.md`, `DEPLOY.md`, `LICENSE` at root. Add `docs/README.md` that indexes the rest.

### M-3. CSP allows `'unsafe-inline'` and `'unsafe-eval'` on `script-src`
File: `next.config.ts:61`.

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' …
```

`'unsafe-eval'` is rarely required by current Next.js builds (only `eval`-based libraries need it). `'unsafe-inline'` is the bigger one — once dropped, the CSP becomes a real defense against XSS. The comment is honest about why ("nonce migration is mid-effort"), but the longer this sits the more inline scripts accumulate and the harder the migration becomes.

*Direction.* Migrate to nonces; drop `'unsafe-eval'` immediately if no library actually needs it.

### M-4. Three (now four) competing i18n systems
Files: `i18n/request.ts` (next-intl) · `messages/{en,es,fr,pt}.json` (next-intl) · `next-i18next.config.js` (next-i18next) · `public/locales/{en,es,fr,pt}/common.json` (next-i18next) · `lib/i18n/serverLabels.ts` (the file is mentioned in `ENG_REVIEW_i18n.md` even though it isn't currently in the tree — but `lib/i18n/serverLocale.ts` and `lib/i18n/cookieLocale.ts` use slightly different cookie key constants from `lib/i18n/config.ts`).

The team has documented this in `ENG_REVIEW_i18n.md` as a P1. The doc says "Schedule a hardening sprint within the next 2 weeks". That was authored some time ago and the consolidation has not landed.

*Direction.* Pick `next-intl` (already wired into the root layout); migrate or delete the others.

### M-5. STAFF MFA is off by default
Files: `.env.example:33` · `lib/auth/mfaConfig.ts:1-3`.

`STAFF_MFA_ENFORCEMENT=0` ships as the default and can only be enabled via env. For an app with admin access to PII, WIOA submissions, member resumes, salary data, and government-grant compliance fields, MFA-off-by-default for staff is a poor default.

*Direction.* Default to `1` in production; fail closed if the env is unset on a Vercel production deploy.

### M-6. `getSupabaseAdmin()` is a module-singleton with implicit env dependency
File: `lib/supabase-admin.ts:9-19`.

The first call captures `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` at process start. If those are rotated (e.g., compromise → rotate), the running instance keeps the old credentials forever. No warning, no health check.

*Direction.* Re-read env each call (or expose a `resetSupabaseAdmin()` for the cron); add a `/api/health` check that calls a no-op admin RPC to confirm the key still works.

### M-7. `prisma.user.findMany` on admin members returns full email and name with no auth check on org
Already covered in H-16. Re-listing here for completeness.

### M-8. `app/api/gdpr/export/route.ts` returns counselor notes to the member
File: `app/api/gdpr/export/route.ts:49`.

`SELECT * FROM counselor_notes WHERE member_id = ${userId}` is shipped to the member in plain JSON. Counselor notes often contain candid assessments, behavioral observations, or tagging that the member should not necessarily see (and that the counselor expects to be private).

*Direction.* Either redact the note body (return only timestamps and counselor name) or document explicitly in `docs/SECURITY-AND-HEALTH.md` that counselor notes are member-visible.

### M-9. `instrumentation-client.ts` enables Sentry replays at 5% session / 100% on error
File: `instrumentation-client.ts:9-11`.

For an app with member resume uploads and PII forms, Session Replay at 5% sample rate captures DOM mutations of those forms. Sentry's `replayIntegration()` defaults mask text inputs but not all form inputs, and not user-uploaded file names.

*Direction.* Confirm `mask: true`, `maskAllText: true`, `blockAllMedia: true`, and explicitly mask resume / WIOA / SSN inputs. Document the privacy posture.

### M-10. `XapiToken` JWT has 1-hour TTL but no revocation
Files: `lib/xapi/token.ts` · `lib/xapi/config.ts`.

HS256 with shared secret. Once issued, valid for `tokenTtlSeconds`. No `jti`, no rotation, no kill list. Compromise of one token gives an attacker write access to xAPI ingest until expiry (and ingest writes immediately translate to "course completion" for the member).

*Direction.* Reduce TTL; add a `jti` and a 1-row Redis key to enable revocation; rotate the shared secret regularly via env.

### M-11. `app/api/cron/coursera-sync/route.ts` selects too many "members" to poll
File: `app/api/cron/coursera-sync/route.ts:117-125`.

```
where: { deletedAt: null, email: { not: '' },
         OR: [{ profile: { is: null } }, { profile: { role: { in: ['member','admin','super_admin'] } } }] }
```

Includes admins and super-admins. Then makes one Coursera API call per member every 6 hours. That's a needless load on Coursera's API for non-learner accounts and easily 10× the cost it should be.

*Direction.* Restrict to actual members with an enrolled program; back off when Coursera returns 429.

### M-12. Hard-coded org ID in `lib/coursera/b4bClient.ts`
File: `lib/coursera/b4bClient.ts:47` — `const DEFAULT_ORG_ID = '8R2W4McwOMWJp9cCBV1kvw';`.

Even with env override (`COURSERA_B4B_ORG_ID` per `lib/coursera/config.ts`), shipping a customer-specific Coursera org id in source is a leak of operational metadata and a footgun for forks.

*Direction.* Require the env var; fail loud at startup if missing.

### M-13. 89 TODO/FIXME/HACK/XXX markers across `app/`, `components/`, `lib/`
Aggregated count. Spread across files like `app/admin/board/print/page.tsx`, `app/(portal)/counselor/students/page.tsx`, `app/api/health/slo/route.ts` (7), `lib/member/getMemberState.ts` (3), `lib/coursera/syncUserFromB4B.ts` (5), `lib/coursera/learnerProgress.ts` (2), `lib/coursera/launchRoute.test.ts` (2), `lib/content/courseraDiscoveredCatalog.ts` (53!).

*Direction.* Sweep and convert to GitHub issues, or convert into structured `// REVIEW: …` lines that a script can extract for the backlog.

### M-14. 445 `console.*` calls in production code
Many are intentional structured-log calls (`console.error('[admin/metrics] ...')`); plenty are debug-level chatter. Without a logger (Pino, Winston) there is no leveling, no JSON output, no per-request correlation id, and Sentry only captures errors that propagate.

*Direction.* Adopt a thin logger; replace `console.error` in route handlers with `logger.error({ req, route, ... }, ...)`. Reserve `console.log` for ad-hoc local dev.

### M-15. Dual error handling on cron routes (also see H-14)
Pattern: `withCronLogging` wraps and logs; the inner handler also try/catches and writes a duplicate `WorkflowDiagnostic`. Some routes do one, some do both. Inconsistency makes log analytics harder.

### M-16. `prisma.$queryRawUnsafe` used widely
Files: `lib/swarm/taskQueue.ts` · `app/api/counselor/placements/route.ts` · `lib/coursera/csvImport.server.ts` · `lib/counselor/triageFlags.ts` · `lib/counselor/commandCenter.ts`.

In every spot inspected, the SQL strings are constants and the user-controlled data is passed as additional positional args. That is the right way to use `$queryRawUnsafe`. But the helper name is "unsafe" precisely because it is *easy* to slip in a string concatenation. There is no eslint rule guarding it.

*Direction.* Prefer `$queryRaw` (template literal) wherever possible; add an eslint custom rule that bans `$queryRawUnsafe(\`${...}\`)`.

### M-17. `app/admin/coursera/page.tsx` is 1,043 lines and admin-side; uses raw SQL for analytics
Concentration of Coursera sprawl. Admin UI page imports raw SQL helpers, builds the page server-side, computes filter state on first render. Hard to test, hard to refactor.

### M-18. `getOrganizationBranding` is called from many email functions but uncached
File: `lib/email.ts:358, 447, 700, 882, 926` etc.

Every email send round-trips to Postgres for branding (including fallback bucket URLs). Per-cron-run that's 100s of identical reads.

*Direction.* Wrap in `cache()` (React) for server-render paths and a per-cron memoizer for cron sends.

### M-19. Hard-coded "demo" emails still seeded into prod database
File: `prisma/seed.ts:296-320, 353-362`.

`mabrown040@gmail.com` and `michael.brown@workforceap.org` are unconditionally upserted to `super_admin` and a "Demo Employer" employer record on every `npm run db:seed`. If `db:seed` runs against prod (which is the same npm script as dev), demo data ends up in production.

*Direction.* Gate the demo seed behind `SEED_DEMO=true` (the pattern already exists for the broader test fixtures); split `seed.ts` into "must-have" (roles, default org, partners) and "demo only".

### M-20. `lib/auth/portalRoleSwitcher.ts:76-81` short-circuits to ALL roles for super_admin
For super_admin, the switcher returns every `ROLE_ORDER` role unconditionally. That is intentional, but combined with the cookie-driven impersonation (`SUPER_ADMIN_EMPLOYER_COOKIE`, `SUPER_ADMIN_PARTNER_COOKIE`) means super_admin sessions can silently act as any employer or partner without an audit trail.

*Direction.* Add an `audit_logs` row on every cookie-set; require typing the org name to confirm before switching.

### M-21. Public `/api/jobs` exposes employer detail without consent
File: `app/api/(portal)/dashboard/jobs/route.ts:108-117`.

Filters via `isExcludedPublicEmployerName` blacklist — opt-OUT visibility. Better defaults are opt-IN: only employers who have flipped a "visible publicly" flag are listed.

### M-22. `lib/observability/captureApiError.ts` always sends to Sentry, even when DSN is unset
File: `lib/observability/captureApiError.ts:16-19`.

`Sentry.captureException` is called regardless of `SENTRY_DSN`; the SDK no-ops on unset, so behavior is fine, but the function is lying — it claims "Sentry captures in production when SENTRY_DSN is set", but it tries every time. Cheap call but adds a bit of overhead per error in dev.

### M-23. `sentry.server.config.ts` and `sentry.edge.config.ts` use `tracesSampleRate: 0.1` / `0.05` with no environment-specific tuning
Production should be 0.01 or lower; preview/dev typically higher.

### M-24. `Caddyfile` ships at root with no clear "is this used?" doc
File: `Caddyfile`. The README says the project deploys to Vercel; the AGENTS.md description claims the Caddyfile is "production reverse-proxy config". Inspect: is this file actually used anywhere?

*Direction.* If unused, delete; if used, document under `DEPLOY.md`.

### M-25. `vercel.json` schedules and `lib/admin/cronRegistry.ts` are independent sources of truth
A change in one without the other will silently desync UI and reality.

*Direction.* Generate `vercel.json` from `cronRegistry.ts` (or vice versa) at build.

### M-26. Inconsistent soft-delete sentinels for users
Admin delete uses `deleted_<id>_<timestamp>_<originalEmail>@deleted.invalid` (correct sink TLD). GDPR delete uses `deleted_<id>@workforceap.org` (real owned domain → potential bounceback / abuse).

### M-27. `app/api/health` is fully public including config presence
File: `app/api/health/route.ts`.

Public endpoint reports configuration presence (Sentry enabled? Coursera xAPI configured?). The intent is partner due-diligence, but it is also reconnaissance that reveals which third-party services to attack.

*Direction.* Move under partner-portal auth, or report only `database: ok/fail` publicly and put the detailed report behind a token.

### M-28. `i18n/request.ts` always reads `messages/{locale}.json` at runtime
File: `i18n/request.ts:11`.

`await import(\`../messages/${locale}.json\`)` happens on every render. Next-intl's runtime caches it but module-level interpolation defeats some bundler tree-shaking. Locales list (4) is fine, but if it ever grows, every request waits for an import.

### M-29. `app/(portal)/dashboard/page.tsx` does optional `await maybeAutoSyncCourseraOnDashboard(...)` synchronously
First-visit users wait for a Coursera sync inline before the page renders. Helper has a 5s deadline, which is still up to 5s of user-facing latency on top of normal page load.

*Direction.* Use `unstable_after` (Next 15) to push the auto-sync after the response; render the dashboard with stale numbers and ask for a refresh after sync.

### M-30. Magic strings everywhere instead of typed constants
Examples: `'super_admin'`, `'admin'`, `'case_manager'`, `'counselor'`, `'member'`, `'partner'`, `'employer'` are repeated in `lib/auth/roles.ts`, `lib/auth/portalRoleSwitcher.ts`, middleware, every route, every page. A typo in one place silently breaks RBAC.

*Direction.* Define a `Role` enum (Prisma already has enums for some); replace string literals.

---

## LOW

### L-1. README.md missing at repo root
There is `AGENTS.md`, `DEPLOY.md`, `DESIGN.md`, etc., but no top-level `README.md` to orient new contributors.

### L-2. `narration_A.mp3` and `narration_B.mp3` (~750 KB) are not referenced anywhere
`Grep` finds zero references in `app/`, `components/`, `lib/`, or `public/`.

*Direction.* Move into `public/` if needed, otherwise delete.

### L-3. Missing `.env` example consistency for cron secret
`.env.example:29` has `CRON_SECRET=your-cron-secret-here`, but `.env.example:31-33` notes `STAFF_MFA_ENFORCEMENT=0` defaults. There is no doc anywhere of what env vars a fresh production setup *requires*.

*Direction.* Mark required vs optional inline in `.env.example`; add a startup assertion in production.

### L-4. `eslint.config.mjs` only enforces a no-bare-`<table>` rule and a slim a11y subset
The strict no-table rule is novel and helpful. The a11y rules are a sensible on-ramp. The rest of the file disables hooks rules — covered above.

### L-5. `tailwind.config.ts` is not the source of truth for colors
Most components use raw `var(--color-…)` from `css/main.css`. Tailwind's color palette is not derived from CSS variables. Theme changes thus require touching both.

### L-6. `package.json` has 50 npm scripts
Many are project-specific operational scripts (`db:create-employer-michael-brown`, `db:sync-test-auth`, `repo:sync-master`, etc.). Consider moving to a `make` or a `scripts/cli.ts`.

### L-7. `scripts/auto-sync-master.ps1` is a PowerShell script
Single PowerShell file in a Linux-targeted Vercel deploy. Implies one developer machine on Windows. Not a problem per se; document or convert to Node.

### L-8. `package.json` script `test:unit` uses `node --import tsx --test lib/**/*.test.ts`
That glob is shell-expanded — on environments without glob expansion (some CI runners) only the literal `lib/**/*.test.ts` is passed and the test runner finds nothing. Already correct on bash; bake the expansion into the test runner directly to be safe.

### L-9. `instrumentation-client.ts` registers `replayIntegration()` even when DSN is unset
The Sentry SDK no-ops, but the import is in the bundle and adds bytes. Conditionally import.

### L-10. Mismatched ENG_REVIEW_i18n.md branch reference
The doc references `dench/spanish-pass-2` branch. That branch may or may not still exist. The doc style is good but the lifecycle of these review docs is not managed (they accumulate in root).

### L-11. `docs/COMPLETED-WORK-LOG.md` and `docs/BACKLOG-MAINTENANCE.md` are actively maintained — good
Worth keeping as a model for the rest of the docs.

### L-12. `LAUNCH-RUNBOOK.md` is 283 lines at the root
Move under `docs/`.

### L-13. Many `'use client'` components named generically (`page.tsx`)
Some pages are client components when they should be split into a server shell + client islands (e.g., `app/admin/dashboard/page.tsx` is `'use client'` — page-level client conversion forfeits SSR for the entire route).

### L-14. `global-error.tsx` ships its own client error boundary; `app/error.tsx` does too
Double error coverage is fine but worth a brief code comment about the layering.

### L-15. `app/error.tsx`, `app/admin/error.tsx`, etc. are all separate components
Could share a single `<PortalErrorPage>` component with role-aware copy.

### L-16. `lib/blog/formatPublishedDate.test.ts` and other unit tests use raw `assert` from node:test
Switching to a single assertion library (Jest expectations or Vitest) would reduce friction for test writers.

### L-17. `app/api/auth/login/route.ts` clears the session-only cookie on remember-me with `maxAge: 0` AND does an explicit set
Works, but the second `cookieStore.set(SESSION_ONLY_COOKIE, '', ...)` could just be `cookieStore.delete(SESSION_ONLY_COOKIE)`.

### L-18. Many `console.error('[…]')` log lines have unstable formatting (sometimes JSON, sometimes string interpolation)
Adopt a logger.

### L-19. `app/api/health/route.ts` claims "Always returns HTTP 200", but the docs say to branch on `status` field
Fine pattern, but most uptime monitors default to HTTP-status checks. Consider also returning 503 when `database === 'fail'` for Pingdom-style monitors.

### L-20. The number of routes that re-implement IP extraction
`getClientIp` is reinvented in `app/api/contact/route.ts`, `app/api/apply/signup/route.ts`, and (likely) others. Lift to `lib/http/getClientIp.ts`.

### L-21. `Stitch` and `.stitch/` references throughout `AGENTS.md` and the `.stitch/` folder
Not a defect but a non-trivial amount of MCP-specific tooling configuration that has nothing to do with running the app. Worth consolidating into one section in `AGENTS.md`.

### L-22. `audit-screenshots/`, `.qa/`, `.portal-audit/` are PNG artifacts — bloat
See H-1.

### L-23. `prisma/seed-blog.ts` and `prisma/seed-demo.ts` exist but `db:seed:blog` and `db:seed:demo` are not in CI/deploy
Probably intentional; document.

### L-24. `package.json::overrides` pins `@xmldom/xmldom` to `^0.9.0`
Indicates a transitive dependency required pinning. Add a comment why.

### L-25. `pdf-parse` and `mammoth` listed in `serverExternalPackages`
Standard practice; mention why in a code comment.

### L-26. `next-i18next.config.js` exists alongside `next-intl` integration — see M-4
Listed for traceability.

### L-27. `MainNav.tsx` is a top-level client component imported by a `ConditionalMarketingNav` server component — fine, but adds an indirection
Document in code.

### L-28. `app/api/cron/smoke-test/route.ts` runs hourly even when nothing has changed
Cheap, but the registry says it's a "monitoring" cron — worth confirming it actually catches real regressions vs. just runs forever.

---

## Test Coverage Gaps (consolidated)

Quantitative:

| Area | Files | Tests |
|---|---|---|
| `app/` (pages + routes) | 608 (`*.tsx` + `*.ts`) | 0 unit tests in `app/` |
| `app/api` (route handlers) | 310 `route.ts` | 0 unit tests in `app/` |
| `components/` | 329 `.tsx` | 0 colocated tests |
| `lib/` | 360 `.ts` | 62 `*.test.ts` |
| `tests/e2e/` | 16 specs | – |

Qualitative gaps (highest leverage):

1. **No integration test asserts a non-admin user cannot reach `/admin/*` or `/api/admin/*`.** The middleware logic is non-trivial (locale prefixes, custom-domain header propagation, MFA branch). One mistake silently opens admin to every member.
2. **No cross-tenant isolation test.** Sprint A.3 RLS will eventually backstop but the proxy-only era needs a guard.
3. **No GDPR-delete e2e** — the route is one of the highest-impact endpoints in the app and is currently buggy (see C-6).
4. **No xAPI ingest e2e** beyond the smoke spec; the persistence pipeline is complex and security-sensitive.
5. **No tests for `safe-migrate.cjs`** — its regex parsing of stderr is the deploy-shaping logic for the entire platform.
6. **No tests for `lib/email.ts` HTML escaping** — the `escapeHtml.test.ts` covers the escape function but not the wrappers' cumulative output.
7. **No load tests / synthetic perf regression**; the dashboard has a 1.2k-line server component and no perf budget.
8. **No contract test between `lib/admin/cronRegistry.ts` and `vercel.json`.**

---

## Risky / Fragile Production Patterns (consolidated)

1. **Build runs migrations** (`scripts/safe-migrate.cjs`) AND auto-marks "stuck" migrations as applied (C-1). One bad merge or rebase and prod is silently mis-migrated.
2. **TypeScript / ESLint disabled at build** (C-2). Means deploys are not a quality gate.
3. **DDL at runtime** (C-4). DB role retains DDL permissions in prod; schema management split-brained.
4. **Account ownership rewrite on email collision** (C-5). Account-takeover surface.
5. **Self-delete that does not delete** (C-6). Regulatory exposure.
6. **Unbounded findMany on a public route** (C-7) and admin/cron paths (C-8).
7. **Tenant scope is opt-in** (C-9). New code can leak by default.
8. **Test xAPI token route** lives in production bundle (C-10).
9. **Dual lockfiles** (H-2). Different installers see different trees.
10. **AGENTS.md misleads agents** (M-1). Cloud agents make the wrong fixes.
11. **Cron toggle is a substring match on a free-text log column** (H-13).
12. **Apply-signup writes to Supabase before Prisma transaction** (H-18). Half-created accounts.
13. **Hard-coded personal recipients** (H-5, M-19). Personnel-tied breakage.
14. **Long-lived modules cache stale Supabase service-role keys** (M-6).

---

## Security Concerns (consolidated)

| ID | Item | Severity |
|---|---|---|
| C-5 | Account takeover via email collision in `ensureUserInDb` | CRITICAL |
| C-6 | Self-delete is incomplete + unconfirmed | CRITICAL |
| C-9 | Tenant scope is opt-in; admin / cron paths leak across tenants | CRITICAL |
| C-10 | xAPI test token route may be reachable in deployed previews | CRITICAL |
| H-17 | Public signup with no captcha despite Turnstile being wired | HIGH |
| H-19 | Resume upload validator accepts magic bytes anywhere in first 1024 B | HIGH |
| H-20 | Several `dangerouslySetInnerHTML` sites + CSP requires `'unsafe-inline'` | HIGH |
| M-3  | CSP carries `'unsafe-eval'` likely without need | MEDIUM |
| M-5  | Staff MFA enforcement off by default | MEDIUM |
| M-6  | Supabase admin client caches creds for process lifetime | MEDIUM |
| M-8  | GDPR export discloses counselor notes to member | MEDIUM |
| M-10 | xAPI HS256 token has no revocation path | MEDIUM |
| M-12 | Coursera B4B org id hardcoded | MEDIUM |
| M-19 | Real personal emails seeded as super_admin in `prisma/seed.ts` | MEDIUM |
| M-20 | super_admin impersonation via cookie has no audit log | MEDIUM |
| M-27 | Public `/api/health` discloses third-party stack composition | MEDIUM |

No hardcoded secrets were found in source (`grep` for common patterns returned only password input field IDs and z.string schemas). `.env.example` is present and `.env*` is in `.gitignore`. Sentry/Resend/Coursera/Supabase keys are read from `process.env` consistently.

---

## Architecture & Separation of Concerns

**Strengths.**

- The `withTenantScope` proxy and `assertSameTenant` helper (`lib/tenant/scopeProxy.ts`) are a thoughtful, correct pattern — the proxy interposes on read/write, refuses cross-tenant intent, rejects nested `organization` writes, and has unit tests. This is a small but well-built piece.
- The cron auth chain (`authorizeCronRequest` + `withCronLogging` + `isCronEnabled` + `logCronRun`) is composable.
- Sentry, Vercel Analytics, Speed Insights are wrapped in error boundaries (`SafeVercelMetrics`).
- `lib/auth/safeRedirectPath.ts` and `normalizePostLoginRedirect` correctly defend against open-redirect.
- Branded email layout + escapeHtml helpers (`lib/email/escapeHtml.ts`, `lib/email/template.ts`) are correctly used in every email body.
- 90 chronologically-named migrations means schema evolution is at least serialized.

**Weaknesses.**

- The `User` model is doing the work of 6 separate models (H-15).
- Page components own their data composition (H-6) and there is no service / view-model layer.
- Email logic lives in one 1,355-line module (H-5).
- The platform has 4 i18n systems running in parallel (M-4).
- 90 migrations is also a smell — many are tiny ad-hoc fixes (`add_partner_users` exists twice on adjacent days, `placement_wioa_fields`, `coursera_skillset_progress` AND `coursera_course_progress` AND `add_coursera_badge_progress` ...).
- "Optional" build-time DB queries (`lib/db/optionalBuildDb.ts`) is a workaround for `next build` trying to call Prisma; the symptom is that `force-static` page rendering is not rigorously separated from runtime data.
- Confusion between `lib/db/prisma.ts` (single global) and `lib/db/prismaEnumFallback.ts` (handles enum drift between code and DB) reflects the same theme: schema changes are hard to coordinate.

---

## Quick Wins (cheap fixes with outsized benefit)

In rough order of effort:

1. Delete: `prisma.())`, `.kimi_*`, `test-file.txt`, `git_script.sh`, `error.log`, `narration_A.mp3`, `narration_B.mp3`, `lib/swarm/`, `app/api/health/slo/route.ts`, `app/api/test/xapi-access-token/route.ts`. Add globs to `.gitignore`. (~1 PR.)
2. Pick one lockfile, delete the other. (~1 PR.)
3. Re-enable `react-hooks/rules-of-hooks` and run autofix; triage remaining errors. (~1 PR.)
4. Add captcha to `/api/apply/signup`, `/api/member/signup`, `/api/partner/signup`, `/api/auth/forgot-password`. (~1 PR.)
5. Make `sanitizeRedirectPath` available and add it to any redirect site that does not currently use it. (~1 PR.)
6. Convert `coursera_identity_mappings` and `coursera_xapi_events` to Prisma models with a real migration; remove `ensureCourseraMappingTables`. (~1–2 PRs.)
7. Replace the apply/signup ordering: insert into Prisma first, then call Supabase auth, then commit. (~1 PR + careful Playwright spec.)
8. Wire `STAFF_MFA_ENFORCEMENT=1` in production env via Vercel dashboard, audit any staff still without TOTP. (Configuration + runbook.)
9. Update `AGENTS.md` to reflect the actual project. (~1 PR.)
10. Move root-level docs into `docs/`; consolidate. (~1 PR.)

---

## Closing notes

The codebase shows a small, productive team building a substantial platform under pressure. Many of the patterns here look like the right call at the time — the tenant proxy, the cron logging wrapper, the safe-redirect helper, the careful escapeHtml in emails, the Sentry-wrapped Vercel metrics. The platform earns trust on those.

The risk is that the product has outgrown the safety nets. The build no longer enforces type-safety, the deploy auto-resolves migrations, the runtime mints DB tables, the dashboard fetches everything-and-the-kitchen-sink, and the GDPR delete does not actually delete. Each is recoverable in isolation. Together they describe a system that is one bad merge away from a public incident.

The good news is that the structural pieces (Prisma migrations, `withTenantScope`, the cron wrapper, the auth helpers) are solid and ready to be the floor on which the rest is rebuilt. The CRITICAL list above is the minimum to address before the next member-data deploy; the HIGH list is a reasonable sprint or two of follow-up.

— end of review —
