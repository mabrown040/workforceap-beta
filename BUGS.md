# WorkforceAP Bug Hunt Findings

Scope: runtime flow failures, edge cases/unsafe assumptions, stale or misconfigured integrations, race/async defects, and input-validation gaps.

Severity legend: **Critical**, **High**, **Medium**, **Low**.

---

## 1) [Critical] Learning-completion webhook can be effectively unauthenticated when `WEBHOOK_SECRET` is unset

- **Category:** Stale/misconfigured integration, validation gap
- **Affected files:**
  - `app/api/webhooks/learning-completion/route.ts` (lines 6-10)
  - `.env.example` (missing `WEBHOOK_SECRET`; only `COURSERA_WEBHOOK_SECRET` is documented)
- **Why this is a bug:**
  - Auth check is `if (secret !== process.env.WEBHOOK_SECRET)`.
  - When `WEBHOOK_SECRET` is unset, both values can be `undefined`, so the guard is bypassed.
  - The route then executes workflow logic without a real shared-secret check.
- **Reproduction steps:**
  1. Ensure `WEBHOOK_SECRET` is unset in env.
  2. POST to `/api/webhooks/learning-completion` without a `secret` field:
     ```json
     {"memberId":"00000000-0000-0000-0000-000000000000","courseName":"Test Course"}
     ```
  3. Observe the route does **not** return `401 Unauthorized`; it proceeds into workflow execution (in my run, it advanced to DB logic and returned `500` due local DB unavailability).

---

## 2) [High] Admin pipeline error boundary is bypassed by uncaught stale-app query

- **Category:** Runtime bug / broken user flow
- **Affected files:**
  - `app/admin/pipeline/page.tsx` (try/catch at lines 62-96; uncaught call at line 125)
- **Why this is a bug:**
  - `students` query is wrapped in `try/catch` and returns `<AdminDataLoadError />` on failure.
  - `getStaleApplications()` runs outside that `try/catch`; if it throws, the page errors rather than showing the intended fallback UI.
- **Reproduction steps:**
  1. Open `/admin/pipeline`.
  2. Force `getStaleApplications()` to fail (e.g. DB outage affecting only that query/mocked rejection in test).
  3. Observe page error instead of `AdminDataLoadError`.

---

## 3) [High] Race condition in employer thread creation can throw unique constraint errors

- **Category:** Race condition / async bug
- **Affected files:**
  - `lib/messages/portalThreads.ts` (lines 3-13)
  - `prisma/schema.prisma` (`MessageThread.employerId` is `@unique`, lines 851-853)
  - `app/admin/members/[id]/introduceAction.ts` (line 27 uses `getOrCreateEmployerMessageThread`)
- **Why this is a bug:**
  - `findUnique` then `create` is non-atomic.
  - Two concurrent calls for the same `employerId` can both miss `findUnique`, then one `create` fails on uniqueness.
- **Reproduction steps:**
  1. Trigger `introduceMemberToEmployer` concurrently (double submit/two admins) for same employer.
  2. Observe one request fails with unique constraint error (typically Prisma `P2002`) and introduction flow breaks.

---

## 4) [High] Job applications tracker can lose updates due stale state closures

- **Category:** Race condition / async bug
- **Affected files:**
  - `components/portal/JobApplicationsTracker.tsx` (lines 57, 85)
- **Why this is a bug:**
  - Uses non-functional updates:
    - `setApplications([newApp, ...applications])`
    - `setApplications(applications.map(...))`
  - Concurrent async completions can overwrite each other from stale snapshots.
- **Reproduction steps:**
  1. Submit two new applications quickly (or submit one while status update PATCH is in flight).
  2. Observe one item/status can disappear or revert when later promise resolves.

---

## 5) [High] Jobs listing requests can resolve out of order and display stale filters

- **Category:** Race condition / async bug
- **Affected files:**
  - `app/(portal)/dashboard/jobs/JobsListingClient.tsx` (lines 303-325)
- **Why this is a bug:**
  - Every filter change fires a new fetch with no `AbortController`/request token.
  - Older responses can arrive after newer ones and overwrite UI with stale results.
  - No `.catch()` on that fetch chain (`.then(...).finally(...)`) also risks unhandled failures.
- **Reproduction steps:**
  1. Open dashboard jobs.
  2. Rapidly change filters (query/sort/program/location).
  3. Observe occasional result set mismatch relative to current URL filters.

---

## 6) [Medium] Global search can show stale results for older query text

- **Category:** Race condition / async bug
- **Affected files:**
  - `components/portal/GlobalSearch.tsx` (lines 42-59)
- **Why this is a bug:**
  - Debounce delays calls, but overlapping async search requests are not cancelled or versioned.
  - Slow older request can overwrite results for newer query.
- **Reproduction steps:**
  1. Open global search (Cmd/Ctrl+K).
  2. Type a short query, then quickly refine to a longer query.
  3. Under latency, stale results can flash/persist from old query.

---

## 7) [Medium] Record placement form keeps stale `memberId` after client-side URL updates

- **Category:** Runtime bug / broken user flow
- **Affected files:**
  - `app/admin/placements/new/page.tsx` (lines 10-13)
- **Why this is a bug:**
  - `memberId` state is initialized from `useSearchParams()` once.
  - If URL query changes via client navigation, state is not resynced.
- **Reproduction steps:**
  1. Load `/admin/placements/new?memberId=A`.
  2. Navigate client-side to same route with `?memberId=B` (without full reload).
  3. Input still shows `A`, risking placement submission for wrong member.

---

## 8) [Medium] Mentor action silently no-ops when session expires

- **Category:** Runtime bug / broken user flow
- **Affected files:**
  - `app/admin/mentors/page.tsx` (lines 21-23)
- **Why this is a bug:**
  - Server action does `if (!user) return;` with no thrown error or user feedback.
  - From UI perspective, Approve/Activate/Deactivate appears broken without explanation.
- **Reproduction steps:**
  1. Open `/admin/mentors` while authenticated.
  2. Expire/clear session.
  3. Submit action; observe no visible failure message and no state change.

---

## 9) [Medium] Public mentors API does not validate numeric pagination, enabling malformed-input 500s

- **Category:** Edge case / unsafe assumption, input validation gap
- **Affected files:**
  - `app/api/mentors/route.ts` (lines 7-8, 17-18)
- **Why this is a bug:**
  - `take`/`skip` are parsed with `Number(...)` and used directly.
  - Non-numeric inputs become `NaN` and can propagate invalid values to Prisma.
- **Reproduction steps:**
  1. Call `GET /api/mentors?take=foo&skip=bar`.
  2. Observe request fails (in my environment it returned `500`; DB was unavailable, but code path still accepts malformed numeric params with no guard).

---

## 10) [Medium] Public WIOA qualification endpoint lacks visible rate limiting and can be spammed

- **Category:** Input validation/abuse gap, stale integration hardening
- **Affected files:**
  - `app/api/public/wioa-qualification/route.ts` (no rate-limit call)
  - Contrast: `app/api/public/wioa-qualification/voice-session/route.ts` (lines 23-30 rate-limited)
- **Why this is a bug:**
  - Endpoint sends notification emails but does not throttle abusive clients.
  - Attackers can generate alert spam and vendor cost.
- **Reproduction steps:**
  1. Send repeated valid POSTs to `/api/public/wioa-qualification`.
  2. Observe repeated `ok: true` responses with no 429 behavior from this route.

---

## 11) [Medium] Signup endpoint accepts unbounded arbitrary JSON for `careerRecommendationJson`

- **Category:** Input validation gap
- **Affected files:**
  - `app/api/apply/signup/route.ts` (line 43, plus persistence at lines 187, 195-197)
- **Why this is a bug:**
  - `z.any()` allows arbitrarily deep/large payloads.
  - This can drive high parse/memory cost and DB storage abuse on a public endpoint.
- **Reproduction steps:**
  1. POST to `/api/apply/signup` with a very large nested object in `careerRecommendationJson`.
  2. Observe request is accepted by schema validation and continues into account/application flow.

---

## 12) [Medium] LinkedIn URL validation is substring-based and accepts attacker-controlled hosts

- **Category:** Input validation gap
- **Affected files:**
  - `app/api/member/linkedin-enrich/route.ts` (lines 32-35)
- **Why this is a bug:**
  - Validation checks only `linkedinUrl.includes('linkedin.com')`.
  - Hosts like `https://linkedin.com.evil.example/...` pass.
- **Reproduction steps:**
  1. Authenticated user POSTs `{"linkedinUrl":"https://linkedin.com.evil.example/profile"}`.
  2. Route accepts it, stores URL, and may pass it to Proxycurl path.

---

## 13) [Medium] Counselor placement API trusts arbitrary `userId` and has non-transactional writes

- **Category:** Validation gap + consistency bug
- **Affected files:**
  - `app/api/counselor/placements/route.ts` (input parsing lines 78-90; insert lines 93-112; event insert lines 115-125)
- **Why this is a bug:**
  - Any staff caller can submit placement for any `userId` string; there is no ownership/existence check before insert.
  - Placement insert and event insert are separate operations; second failure leaves partial state.
- **Reproduction steps:**
  1. As counselor/admin, POST with another member’s UUID (or invalid UUID-like value).
  2. Observe acceptance/failure behavior depends on DB constraints, but route lacks explicit validation/authorization checks.
  3. Simulate failure after placement insert (e.g. event table issue) and observe placement row can exist without corresponding event.

---

## 14) [Medium] Member placement confirmation server action can leave partial state (no transaction)

- **Category:** Race/async consistency bug
- **Affected files:**
  - `app/(portal)/dashboard/placementAction.ts` (sequential writes at lines 27-66)
- **Why this is a bug:**
  - `jobApplication.update`, `memberEvent.create`, and optional `recordPartnerWorkflowEvent` are separate awaited steps.
  - Failures after status update can leave accepted application without audit/workflow side effects.
- **Reproduction steps:**
  1. Trigger `confirmPlacement`.
  2. Force downstream failure after `jobApplication.update` (e.g. transient DB error on `memberEvent.create` or workflow helper throw).
  3. Observe status updated but supporting records missing.

---

## 15) [Medium] Deploy health cron can silently monitor the wrong Vercel project via hardcoded fallback IDs

- **Category:** Stale/misconfigured integration
- **Affected files:**
  - `app/api/cron/deploy-health/route.ts` (lines 31-32)
- **Why this is a bug:**
  - If `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` are missing, it falls back to hardcoded IDs.
  - With a valid `VERCEL_TOKEN`, health checks can report status for a different project than the active deployment.
- **Reproduction steps:**
  1. Unset `VERCEL_PROJECT_ID` and `VERCEL_TEAM_ID`, keep `VERCEL_TOKEN` set.
  2. Call `/api/cron/deploy-health`.
  3. Compare returned deployment URL/commit against expected project; mismatch indicates false health reporting.

---

## 16) [Medium] Cron registry drift: scheduled job exists in `vercel.json` but missing from admin cron registry

- **Category:** Stale integration/config drift
- **Affected files:**
  - `vercel.json` (line 17 includes `/api/cron/coursera-auto-heal`)
  - `lib/admin/cronRegistry.ts` (no entry for `/api/cron/coursera-auto-heal`)
- **Why this is a bug:**
  - Operational UI/docs derived from `CRON_REGISTRY` omit a live scheduled cron.
  - Creates blind spots for incident response and run-history expectations.
- **Reproduction steps:**
  1. Compare `vercel.json` cron paths against `CRON_REGISTRY`.
  2. Observe `/api/cron/coursera-auto-heal` is scheduled but not represented in registry metadata.

---

## 17) [Medium] Proactive resume generator hardcodes dummy API key path and legacy model with no error fallback

- **Category:** Stale/misconfigured integration
- **Affected files:**
  - `lib/ai/proactiveResumeGenerator.ts` (lines 4-7)
  - Contrast helper: `lib/ai/groq.ts` (graceful null client + model fallback)
- **Why this is a bug:**
  - Uses `process.env.GROQ_API_KEY || 'dummy_key_for_build'`, then always calls Groq.
  - Missing/invalid key causes throw instead of falling back to deterministic bullet.
  - Model is hardcoded (`llama3-8b-8192`) instead of shared fallback/model-override strategy.
- **Reproduction steps:**
  1. Unset `GROQ_API_KEY`.
  2. Trigger workflow path that calls `generateResumeBullet` (e.g. learning completion webhook).
  3. Observe external call error instead of graceful local fallback bullet.

---

## Notes on dynamic verification run

- I ran `npm run build` successfully in this environment.
- I also exercised:
  - `GET /api/mentors?take=foo&skip=bar`
  - `POST /api/webhooks/learning-completion` without `secret`
- Local DB was unavailable (`127.0.0.1:5432`), which limited full end-to-end verification, but the webhook test still confirmed auth guard bypass behavior (request progressed beyond auth check instead of returning 401).
