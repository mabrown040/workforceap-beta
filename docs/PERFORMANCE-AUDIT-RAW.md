# WorkforceAP Performance Audit — RAW

Generated: 2026-05-12
Scope: full `wap-repo` Next.js 15 + Prisma 5.22 codebase
Methodology: targeted ripgrep sweeps for N+1, indexes, bundle, images, caching, payloads, leaks; cross-referenced with `prisma/schema.prisma`, `next.config.ts`, `middleware.ts`, `package.json`.

Severity scale: **critical** (user-visible perf blocker on hot path), **high** (measurable degradation on a real route), **medium** (avoidable cost, worth fixing this quarter), **low** (polish / future-proofing).

---

## 1. N+1 Queries

### 1.1 `lib/counselor/triageFlags.ts:236-336` — high
Up to **3 sequential** Prisma roundtrips before the parallel `Promise.all` (counselor lookup → assignment fetch → branch). For admin path with no counselor row, falls back to fetching `user.findMany` capped at 200. The Promise.all then fires 6 queries, two of which are `$queryRawUnsafe` aggregates over `member_events` and `messages`.
- **Issue:** Pre-`Promise.all` chain serializes 2–3 short queries that could be unioned or parallelized with a single CTE.
- **Fix:** Inline counselor + assignments fetch into one `prisma.counselor.findFirst({ include: { assignments: { where: { active: true } } } })`. Saves ~30–60 ms per call on warm pool.

### 1.2 `lib/counselor/workQueue.ts:42-108` — high
Same anti-pattern: counselor lookup → assignments → threads → messages → users — all serial. `messages.findMany` then fetches *every* message for *every* thread to derive "last message per thread" in JS, instead of using a windowed SQL aggregate.
- **Issue:** O(threads × messagesPerThread) memory and bandwidth. Comment at line 84 says "raw SQL replaced," but the replacement (Prisma `findMany` with `orderBy`) does not bound rows per thread.
- **Fix:** Use the same `$queryRawUnsafe MAX(created_at) GROUP BY thread_id` pattern already used in `triageFlags.ts:309`.

### 1.3 `lib/counselor/commandCenter.ts:71-98` — high
Third copy of the counselor-resolution pattern (admin vs counselor branching, fallback `user.findMany`). Same serial-prefix issue.
- **Fix:** Extract `resolveCounselorMemberIds(userId, opts)` helper used by triageFlags, workQueue, commandCenter. Cache the counselor row per request via `React.cache()`.

### 1.4 `app/admin/training-progress/page.tsx:117-180` — high
Three nested `for` loops: enrollment rows → learners → programsToEmit → program.courses. Each iteration calls `canonicalByKey.get(...)` — that's fine, but `getProgramBySlug` is called inside the inner loop without memoization (line 146, 161). If `getProgramBySlug` walks an array each call, that's O(learners × programs × courses × catalog).
- **Fix:** Build `programBySlugMap` once before the outer loop.

### 1.5 `app/api/partner/milestones/route.ts:50-114` — medium
Iterates `members` and reads `m.userCertifications` and `m.placementRecord` per member. This is fine if `loadPartnerReferralBundle` already eager-loaded them (verify in `lib/partner/loadPartnerReferralBundle.ts`). If not, this is a classic N+1.
- **Action:** Confirm `include: { userCertifications: true, placementRecord: true }` in the bundle loader. Otherwise migrate to a single `findMany` with `include`.

### 1.6 `app/(portal)/employer/pipeline/page.tsx:80` — medium
`for (const m of allMatches)` — verify whether each iteration triggers a lazy relation access. Browser-side rendering loop on top of server data; cheap, but pre-compute member lookups via Map.

### 1.7 `app/(portal)/dashboard/page.tsx:320,457` — medium
Two consecutive `for` loops over `sessionEvents` and `dynamicNextActions.reverse()`. The `.reverse()` mutates the array (silent bug risk under React strict mode re-renders). Use `[...arr].reverse()` or `arr.slice().reverse()`.

### 1.8 `app/api/careers/occupation/[onetCode]/route.ts:79` — medium
`occ.relatedFrom.map(async (r) => …)` — async map without `Promise.all` wrapping is a bug (returns array of pending promises) AND if wrapped, fires one query per related occupation. Replace with single `findMany({ where: { onetCode: { in: ids } } })`.

### 1.9 `lib/messages/counselorThread.ts:80` — low
`(await prisma.user.findUnique(...)).organizationId` inside an `assertStaffCanAccessThread` call path. Combine with the `thread.findUnique` above into a single query selecting `member: { select: { organizationId: true } }`.

### 1.10 `lib/counselor/triageFlags.ts:319,327` — low
Two near-identical `prisma.memberEvent.findMany` calls (different `eventName.in` filter, no createdAt cap on the first). Merge into one query filtering `eventName.in: [computer_support, counselor_followup, course_completed, certification_earned]`, then bucket in JS.

---

## 2. Missing / Suboptimal Database Indexes

Schema has **157 `@index`/`@@index` declarations** — coverage is generally good. Spot checks below.

### 2.1 `prisma/schema.prisma — Organization.customDomain` — low
Already `@unique`. No additional index needed; unique implies B-tree.

### 2.2 Verify composite indexes for hot multi-column WHEREs — medium
Patterns observed in code:
- `prisma.user.findMany({ where: { id: { in: memberIds }, deletedAt: null, enrolledProgram: { not: null } } })` — needs `@@index([deletedAt, enrolledProgram])` or partial index. PostgreSQL won't use `deletedAt` alone effectively because most rows are non-deleted.
- `messageThread` filtered by `(memberId, kind)` repeatedly (triageFlags:292, workQueue:76). Verify `@@index([memberId, kind])`.
- `memberEvent` filtered by `(userId, eventName, createdAt)` (triageFlags:319-335). Verify `@@index([userId, eventName, createdAt])`.
- `counselorAssignment` filtered by `(counselorId, active)` (multiple sites). Verify `@@index([counselorId, active])`.
- `placementRecord` ordered by `placedAt desc` + filtered by `user.deletedAt` (publicPlacementOutcomes, publicImpactStats). Needs `@@index([placedAt])` if not present.

**Action:** Run `grep -A 30 '^model (User|MessageThread|MemberEvent|CounselorAssignment|PlacementRecord)' prisma/schema.prisma` and confirm composites exist; add missing ones.

### 2.3 Partial indexes for soft-delete pattern — medium
`deletedAt IS NULL` is in nearly every member query. A partial index `WHERE deleted_at IS NULL` on `(enrolled_program, organization_id)` would shrink hot path and skip tombstones. Prisma doesn't support partial indexes natively; add via raw migration.

---

## 3. Bundle Size

### 3.1 `next.config.ts` — good baseline
`experimental.optimizePackageImports: ['lucide-react', 'recharts', 'react-markdown', 'remark-gfm']` is configured. `optimizeCss: true`. `@next/bundle-analyzer` wired.
- **Action:** Run `ANALYZE=true npm run build` and inspect bundle. Recharts alone is ~150 KB gzipped — should be dynamic-imported if not already.

### 3.2 `recharts` is heavy — medium
Only one charting lib (good). Check that admin dashboards lazy-load it (`dynamic(() => import(...), { ssr: false })`). Found 50+ files importing prisma + recharts together — verify recharts isn't pulled into the server bundle on routes that don't use charts.

### 3.3 `pdf-lib` + `pdf-parse` + `mammoth` — medium
Heavy native-ish parsers. `next.config.ts` correctly marks `pdf-parse, mammoth` in `serverExternalPackages`. Confirm `pdf-lib` (~400 KB) is only imported in server actions / API routes, not pulled into client bundle. Quick check: grep `from 'pdf-lib'` in `components/`.

### 3.4 `import * as Sentry` — low (acceptable)
`import * as Sentry from '@sentry/nextjs'` appears in 9 files. Sentry's SDK is designed for namespace import and tree-shakes. No action.

### 3.5 `import * as React` in `emails/*.tsx` — low (acceptable)
React-email templates render server-side only. No bundle impact.

### 3.6 `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` — low
Intentional per inline comment (OOM on Vercel build). No perf impact; flagged here for audit completeness.

---

## 4. Image Optimization

### 4.1 `<img>` tags found in 7 files — medium
- `lib/tenant/organizationBranding.ts` — likely template/HTML strings, OK.
- `lib/email/template.ts` + `emails/*.test.ts` — email HTML, OK (Next/Image not usable in email).
- **`components/employer/EmployerSettingsForm.tsx`** — should use `next/image`.
- **`components/admin/AdminOrgSettingsForm.tsx`** — should use `next/image`.
- **`app/(auth)/setup-mfa/page.tsx`** — likely a QR code data URL, may be OK but verify.

### 4.2 Hero / marketing images — action item
Did not audit `public/` directly. Run `ls -lhS public/ | head -20` to find images >100 KB and confirm they're served through `next/image` with proper `sizes` and `priority` on LCP.

---

## 5. Missing Caching

### 5.1 `React.cache()` / `unstable_cache` usage — medium
Only 18 files reference cache primitives. For Server Components, `cache()` should wrap any query called from multiple components in the same request tree (e.g. `getCurrentUser`, `getOrganization`, `resolveOrgFromRequest`).
- `lib/tenant/resolveOrgFromRequest.ts` — verify it uses `cache()` to avoid duplicate Supabase auth + DB lookups per request. Middleware already sets `x-wap-org-id` header (`middleware.ts:28`), so server components should read that header instead of re-querying.

### 5.2 Middleware Supabase auth — high
`middleware.ts` creates a Supabase server client on every request to validate the session. Confirm session is cached via cookies (it is, via `getSupabaseCookieOptions`) and that we are not calling `supabase.auth.getUser()` on static asset paths. The `config.matcher` should exclude `/_next/static`, `/favicon.ico`, image extensions.
- **Action:** Inspect `middleware.ts` matcher block; if not already excluding static, add `'/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'`.

### 5.3 Public marketing pages — medium
`app/impact/page.tsx`, `app/outcomes/page.tsx`, `app/partners/page.tsx`, `app/blog/page.tsx` all hit Prisma for stats that change at most hourly. Add `export const revalidate = 600` (10 min ISR) if not already present.

### 5.4 `app/api/portal/nav-badges/route.ts` — medium
Nav badge counts called on every portal navigation. Should set `Cache-Control: private, max-age=30` and use React cache within the request.

### 5.5 `lib/onet/client.ts` — medium
External O*NET API calls — already in a cached file list. Confirm responses use Next `fetch` with `next: { revalidate: 86400 }` (O*NET data is essentially static).

---

## 6. Large Payloads / Missing Pagination

### 6.1 `lib/counselor/triageFlags.ts:319` — high
`prisma.memberEvent.findMany` with `userId: { in: memberIds }` and `orderBy: { createdAt: 'desc' }` — **no `take`**. For an org with thousands of events per member, this returns the entire history. Cap at e.g. `take: 1000` and rely on aggregate `lastEventByUser` (already computed at line 284) for "most recent" data.

### 6.2 `lib/counselor/workQueue.ts:86` — high
`prisma.message.findMany` without `take` — could return entire conversation history across all assigned members. Replace with raw SQL aggregate.

### 6.3 `lib/data/applications.ts:7` — medium
`prisma.application.findMany` with date filter only, no `take`. Add pagination cursor or `take: 500`.

### 6.4 `app/api/subgroup/members/route.ts`, `app/api/subgroup/dashboard/route.ts` — medium
Verify these paginate. Common partner-side endpoints that easily exceed 200 rows.

### 6.5 Admin member roster — medium
`app/admin/members/page.tsx:137-181` iterates four separate result arrays. If each `findMany` has no `take`, this scales linearly with org size. Add server-side pagination (cursor-based).

### 6.6 `lib/marketing/publicImpactStats.ts:82` — medium
`prisma.user.findMany` for all enrolled members in an org to compute stats. Replace with aggregate query (`groupBy` or raw SQL `COUNT/AVG`) — don't pull rows just to count.

---

## 7. Memory Leaks (Client)

30 files use `addEventListener` / `setInterval` / `setTimeout`. Each must clean up in `useEffect` return.

### 7.1 Spot-check candidates — medium
- `components/portal/WorkspaceShell.tsx` — global listener?
- `components/portal/NotificationBell.tsx` — likely a polling interval; verify `clearInterval` in cleanup.
- `components/portal/PortalVoiceSession.tsx` — ElevenLabs client; verify socket teardown.
- `components/portal/MemberCounselorChatClient.tsx` — chat polling/SSE; verify cleanup.
- `components/ScrollAnimations.tsx`, `components/ScrollToTopButton.tsx` — `scroll` listeners; verify `removeEventListener`.
- `components/portal/QueryToast.tsx` — `setTimeout` for toast dismissal; verify cleared on unmount.
- `app/layout.tsx` — top-level listeners; any registered here persist for the whole app lifetime — review carefully.

**Action:** For each of the above, grep for `useEffect` and confirm the return function calls `removeEventListener` / `clearInterval` / `clearTimeout`.

### 7.2 In-memory caches without eviction — low
`lib/tenant/customDomainCache.ts` referenced from middleware (`middleware.ts:23`). Verify it has a TTL or LRU eviction; unbounded module-level Map across hot reloads in dev can leak, in prod it's bounded by host count (usually fine).

---

## 8. Other Observations

### 8.1 `lib/marketing/publicImpactStats.ts:96-100` — low
`prisma.employer.count` + `prisma.job.count` + `prisma.placementRecord.count` in parallel is fine; ensure each is supported by index on `(organizationId, status)`.

### 8.2 Server Action loops — medium
`app/admin/pipeline/remindAction.ts`, `app/admin/members/[id]/introduceAction.ts` — review for per-row writes inside loops (use `prisma.$transaction([...])` or `createMany`).

### 8.3 Async map without Promise.all bug — high
`app/api/careers/occupation/[onetCode]/route.ts:79` — `.map(async ...)` without wrapping `Promise.all` returns an array of unresolved promises. Either a latent bug or intentional fire-and-forget; either way, fix the shape.

---

## Recommended Fix Priority

| Rank | Item | Effort | Impact |
|------|------|--------|--------|
| 1 | §6.1 & §6.2: cap `findMany` with `take` on memberEvent and message queries | XS | High — prevents O(history) growth |
| 2 | §1.1–1.3: extract `resolveCounselorMemberIds` helper with `React.cache` | S | High — eliminates ~6 serial roundtrips on counselor pages |
| 3 | §5.2: confirm middleware matcher excludes static assets | XS | High — every static request currently runs Supabase client init |
| 4 | §2.2: audit composite indexes on User/MessageThread/MemberEvent/CounselorAssignment | S | High — query plans likely seq-scanning on multi-col filters |
| 5 | §1.8: fix `.map(async)` bug in occupation route | XS | Bug + perf |
| 6 | §4.1: replace `<img>` with `next/image` in Employer/Admin settings forms | XS | LCP / CLS on settings pages |
| 7 | §5.3: add `revalidate` to marketing pages | XS | Cuts DB load on /impact, /outcomes, /partners, /blog |
| 8 | §3.1: run `npm run analyze` and lazy-load recharts on admin dashboards | S | TTFB on admin |
| 9 | §6.6: replace user-row fetch with aggregate in publicImpactStats | S | DB CPU |
| 10 | §7.1: cleanup audit on the 7 listener-heavy components | M | Mobile memory |

---

## Verification Still Needed

These need a follow-up read of specific files to confirm/deny:

1. `lib/partner/loadPartnerReferralBundle.ts` — does it include `userCertifications` + `placementRecord`?
2. `middleware.ts` config.matcher — does it exclude static assets?
3. `prisma/schema.prisma` — composite indexes listed in §2.2.
4. `lib/tenant/resolveOrgFromRequest.ts` — uses `cache()`?
5. `lib/onet/client.ts` — uses `next.revalidate`?
6. `public/` — image sizes & formats.
7. Each of the 7 client components in §7.1 — listener cleanup.
8. `package.json` lockfile + bundle analyzer output — actual sizes.

---

_End of raw audit. Hand off to remediation phase._
