# WorkforceAP Comprehensive Audit — Sprint Plan
**Date:** 2026-05-05  
**Auditors:** Code Quality, I18n, Member Experience, Performance/Infrastructure specialists  
**Scope:** /home/user/workforceap-beta (Next.js 14 App Router, Supabase/Prisma, custom CSS, next-intl v4 en/es/fr/pt, Vercel)

---

## Executive Summary

The platform is structurally sound with the recent training-progress fix working correctly: `promoteCsvProgressToCanonical()` now upserts CSV rows into `course_progress`, and `distinctMembersWithCourseProgress` in `getCourseraSyncStatus()` reads from that canonical table — so the admin metric reflects CSV-imported members, not just xAPI members. The biggest outstanding risk is **17+ hardcoded English strings in `app/employers/page.tsx`** that bypass the translation system entirely, breaking the Spanish/French/Portuguese experience for the employer-facing marketing page. A secondary concern is the **broken anchor `#employer-contact-form`** on the same page (section id is `employer-contact`, not `employer-contact-form`) that silently breaks all 6 CTA buttons. Dashboard state A ("no program assigned") shows gracefully for new members, but lacks a prominent self-serve path once the member has already applied — they must wait for admin assignment. The Coursera crons are scheduled correctly in `vercel.json` and both routes are operational.

---

## TOMORROW'S SPRINT (P0 + P1 — must-do, max 8 items, ordered by impact)

### P0-1 — Fix broken CTA anchor on /employers page
**What:** All 6 `href="#employer-contact-form"` links throughout `app/employers/page.tsx` target a non-existent anchor. The actual section id is `id="employer-contact"`. Every CTA button (waitlist banner, hero, tier cards, bottom CTA) silently fails to scroll.  
**Where:** `app/employers/page.tsx` lines 57, 147, 608, 638, 665, 773 (href) vs line 674 (actual id `employer-contact`)  
**Why it matters:** Employer conversion funnel is broken. Every visitor clicking "Join the Waitlist" or "Get Started" goes nowhere.  
**Fix:** Change `id="employer-contact"` on line 674 to `id="employer-contact-form"` (or update all 6 hrefs to `#employer-contact`). One-line fix.  
**Effort:** 5 minutes

### P0-2 — Translate 17+ hardcoded English strings in /employers page
**What:** The "How It Works for Employers" block (lines 241–254), the sticky sidebar paragraph (lines 284–286, 301–304), cohort card names (IT Support, Cybersecurity, AWS Cloud, Data Analytics — lines 423, 445, 468, 489), "How Hiring Experience" heading (line 513), "Submit the employer intake and we will review it within 1–2 business days" (line 516), "Choose the level that fits your hiring needs" (line 581), "Most Popular" badge (line 626), "Direct contact" (line 743), and the contact panel time/scope bullets (lines 718–732) are all hardcoded English.  
**Where:** `app/employers/page.tsx` — approximately 17 distinct hardcoded strings across lines 241–754  
**Why it matters:** Spanish/French/Portuguese visitors see a mix of English and translated content on the most critical conversion page.  
**Fix:** Add keys to `messages/en.json` under `marketing.employers.*`, copy with translations to `es.json`, `fr.json`, `pt.json`, replace inline strings with `{t('key')}` calls.  
**Effort:** 2–3 hours (writing + translating ~17 keys across 4 locales)

### P1-1 — Fix /api/remind-member TODO: email integration is a dead stub
**What:** `app/api/counselor/remind-member/route.ts` lines 46–47 has two `TODO` comments: "Integrate with email service" and "Integrate with SMS if member has phone and sms_opt_in". The route exists and is called, but sends no actual reminder.  
**Where:** `app/api/counselor/remind-member/route.ts:46–47`  
**Why it matters:** Counselors clicking "Remind Member" believe they sent a message; nothing happens. Affects counselor trust and member follow-through.  
**Fix:** Wire into the existing Resend email integration (same pattern as `app/api/admin/members/[id]/reset-password/route.ts`). One transactional email template.  
**Effort:** 2–3 hours

### P1-2 — Members with no program assigned have no CTA after applying
**What:** `dashboardState === 'A'` shows gracefully when `!enrolledProgram`. The mobile card correctly shows "Apply now" if no application exists, or "Choose your program" if they applied but have no program. However, `/dashboard/program` page (`app/(portal)/dashboard/program/page.tsx` line 58–74) only shows the `ProgramPicker` when `!enrolledSlug || !program`. Once an admin sets a program, the path is correct. But a member who applied and is in limbo (`no enrolledProgram`) sees the "Choose your program" CTA which leads to the ProgramPicker — but `/api/member/program-change-request` shows no member-facing page exists under `/dashboard`. The `ProgramPicker` component submits enrollments but this may conflict with admin-driven assignment workflow.  
**Where:** `app/(portal)/dashboard/program/page.tsx:58–74`, `app/(portal)/dashboard/page.tsx:696–729`  
**Why it matters:** Members showing "Program —" in admin (the majority) have no clarity on what to do next.  
**Fix:** Verify `ProgramPicker` enrollment flow works end-to-end for the member self-serve path. If enrollment is admin-only, replace the CTA with "We'll assign your program — check your email" messaging.  
**Effort:** 1–2 hours investigation + 1 hour fix

### P1-3 — Duplicate members (Dionte Carr, Sergio Sanchez) — no data integrity risk, but merge UI is admin-only
**What:** The duplicate members page (`app/admin/members/duplicates/page.tsx`) surfaces a `MemberDuplicatesClient` component backed by `/api/admin/members/merge`. No automated dedup runs. For Dionte Carr and Sergio Sanchez (2 accounts each), the risk is: if both accounts have course_progress rows, the merge will COALESCE correctly via the upsert in `promoteCsvProgressToCanonical`. No data corruption risk found.  
**Where:** `app/admin/members/duplicates/page.tsx`, `app/api/admin/members/merge/route.ts`  
**Why it matters:** Low immediate risk, but duplicate accounts can get double-counted in metrics. Admin should merge before next cohort reporting.  
**Fix:** Run merge via admin UI at `/admin/members/duplicates`. No code changes required.  
**Effort:** 15 minutes (admin action)

### P1-4 — TODO: Remove retired PlacedOutcome endpoint
**What:** `app/api/admin/members/[id]/placed-outcome/route.ts:106` has `// TODO: Remove once PlacedOutcome is fully retired.` with dead legacy code path still alive.  
**Where:** `app/api/admin/members/[id]/placed-outcome/route.ts:106`  
**Why it matters:** Dead code increases maintenance surface and confuses future developers. Low risk but messy.  
**Fix:** Remove the legacy branch at line 106 and update consumers to use the new placement workflow.  
**Effort:** 1 hour

### P1-5 — Dashboard new-member "0 of N courses" gracefully handled, but progress ring misleads
**What:** `dashboardState !== 'A'` (i.e., enrolled but not started) shows the progress ring at 0%. The ring has a comment: "hidden for pre-enrollment (state A) since 0% is misleading." However state B (enrolled, assessment not done) also shows the ring at 0% with "Getting started" tone — same misleading situation.  
**Where:** `app/(portal)/dashboard/page.tsx:637` (`dashboardState !== 'A'`) — should also hide ring for state B or show a non-percentage state  
**Why it matters:** A 0% ring next to "Getting started" signals failure, not progress. First impression for new enrollees.  
**Fix:** Change ring condition from `dashboardState !== 'A'` to `dashboardState === 'C' || dashboardState === 'D'` (only show ring when training has started).  
**Effort:** 15 minutes

### P1-6 — Admin members list uses legacy `coursesCompleted` JSON, not canonical `course_progress`
**What:** `app/admin/members/page.tsx:146–147` computes `coursesCompleted` via `parseCourseSlugList(m.coursesCompleted)` (raw JSON string) and `totalCourses` from static program catalog. This ignores `CourseProgress` table rows (including CSV-promoted rows). After the CSV fix, a member can have correct `course_progress` rows but still show "0/4" on the admin members list because `coursesCompleted` JSON is stale.  
**Where:** `app/admin/members/page.tsx:146–147`  
**Why it matters:** Admin sees misleading training counts for any member whose progress came via CSV (not manual JSON update). Affects counselor assessment of member readiness.  
**Fix (medium-term):** Admin members list needs a JOIN or a follow-up query against `course_progress` to get authoritative counts. Quick fix: add a note in the column header "based on last JSON sync."  
**Effort:** 3–4 hours for proper fix; 15 minutes for disclosure label

---

## NEXT WEEK (P2 — good-to-have, 5–8 items)

### P2-1 — `console.error` swallowed in `promoteCsvProgressToCanonical` returns `{upserted:0, errors:1}` silently
**What:** `lib/coursera/csvImport.server.ts:572` catches the error and returns `{upserted: 0, errors: 1}` but the caller in `ingestCourseActivityRows` (line 212) only logs the `promoted.upserted` count — it does not surface the `errors` count to the admin CSV import UI.  
**Where:** `lib/coursera/csvImport.server.ts:572`, `lib/coursera/csvImport.server.ts:212–213`  
**Why it matters:** If the promotion SQL fails (e.g., schema mismatch), admin sees "0 rows promoted" with no error — silent failure.  
**Fix:** Surface `promotion.errors` count in the import result returned to the admin CSV upload UI.  
**Effort:** 30 minutes

### P2-2 — `typescript: { ignoreBuildErrors: true }` in next.config.ts masks type regressions
**What:** `next.config.ts:28` explicitly skips TypeScript type checking during Vercel builds due to OOM/SIGKILL on standard build machines.  
**Where:** `next.config.ts:28`  
**Why it matters:** TypeScript errors are silently ignored in production builds. Any type regression only surfaces at runtime.  
**Fix:** Enable enhanced build machines on Vercel (or run `tsc --noEmit` as a separate CI step before build). Short-term: add a `package.json` `typecheck` script to pre-build step.  
**Effort:** 2 hours (CI configuration)

### P2-3 — `app/page.tsx` inline "About" copy not localized (hardcoded org description)
**What:** `app/page.tsx:397–401` has two `<p>` blocks with hardcoded English text ("WorkforceAP is a 501(c)(3) nonprofit built in Austin...") rendered in the "Built on Workforce Experience" bento section.  
**Where:** `app/page.tsx:397–401`  
**Why it matters:** Homepage About section is not localized for es/fr/pt visitors.  
**Fix:** Extract to `messages/en.json` under `marketing.home.aboutBody1` and `marketing.home.aboutBody2`, add translations, replace with `{t('aboutBody1')}`.  
**Effort:** 1 hour

### P2-4 — Hardcoded "Step" label in how-it-works journey cards
**What:** `app/how-it-works/page.tsx:195` renders `Step {padded number}` inline (`Step 01`, `Step 02`, etc.) without going through `t()`. The `phaseLabel` translation key exists but it labels the phase, not the step prefix.  
**Where:** `app/how-it-works/page.tsx:195` — `{t('phaseLabel')} {String(step.num).padStart(2, '0')}`  
**Note:** On review, `t('phaseLabel')` IS used here — this is correct. No issue here, but verify `phaseLabel` is translated correctly in es/fr/pt (should be "Paso", "Étape", "Etapa").  
**Effort:** 15 minutes (verify)

### P2-5 — MainNav fetches `/api/auth/me` on every page mount AND on window focus
**What:** `components/MainNav.tsx:179–181` calls `refreshPortalLinks()` on mount and adds a `focus` event listener. Every time the user switches tabs and returns, a fresh `/api/auth/me` request fires. The route is fast but adds latency noise.  
**Where:** `components/MainNav.tsx:180`  
**Why it matters:** 9 console GET requests per session on marketing pages for unauthenticated users. Contributes to the "ERR_FAILED console errors on 9 pages" pattern when network is slow.  
**Fix:** Add a short TTL cache (e.g., `sessionStorage` with 60-second expiry) or debounce the focus listener to max 1 call per 60 seconds.  
**Effort:** 1 hour

### P2-6 — Admin members list `coursesCompleted` uses legacy JSON (reporting discrepancy)
**What:** (Detail of P1-6 above) The admin members list page selects `coursesCompleted` as raw JSON and computes course counts client-side via `parseCourseSlugList`. After CSV promotion, a member's canonical progress lives in `CourseProgress` table, not the JSON field.  
**Where:** `app/admin/members/page.tsx:147`  
**Fix:** Long-term, add a sub-select on `_count` of `CourseProgress.COMPLETED` rows per userId and join it into the member list query. Medium-term, add a note that counts are "based on self-reported JSON — see member detail for Coursera progress."  
**Effort:** 3 hours

### P2-7 — `ProgramsContent.tsx` salary/outcomes section uses hardcoded English
**What:** `app/(decision-journey)/programs/ProgramsContent.tsx:75` has `Starting range: {salaryRangeDisplay(program)}`, `Best for:`, and `Salary range is Austin market estimate (Lightcast/BLS, Jan 2026). Actual pay depends on experience and employer.` (line 79) hardcoded.  
**Where:** `app/(decision-journey)/programs/ProgramsContent.tsx:75, 78–79`  
**Why it matters:** Programs page salary disclaimer is English-only.  
**Fix:** Extract to `messages/en.json` and localize.  
**Effort:** 45 minutes

### P2-8 — Add member program-change-request link from dashboard
**What:** The API endpoint `/api/member/program-change-request` exists but there is no member-facing UI entry point surfaced in the dashboard. Members who want to switch programs have no self-serve path — they must contact admin.  
**Where:** No route exists under `/dashboard/program/change` or similar. `app/api/member/program-change-request/route.ts` exists.  
**Fix:** Add a "Request program change" link on `/dashboard/program` page, linking to a simple form that posts to the API.  
**Effort:** 2–3 hours

---

## BACKLOG (P3 — future)

- **Re-enable TypeScript build checks** once Vercel enhanced build machines are available (`next.config.ts:28`)
- **Remove `PlacedOutcome` legacy branch** (`app/api/admin/members/[id]/placed-outcome/route.ts:106`) after confirming no callers remain
- **Counselor student filter chips** (`app/(portal)/counselor/students/page.tsx:163`) — TODO in JSX for "At Risk" and "Upcoming Session" filter chips
- **Proxy Curl failure handling** — `app/api/member/linkedin-enrich/route.ts:95` silently swallows Proxycurl failures; add user-facing feedback
- **Blog static params error handling** — `app/blog/[slug]/page.tsx:31,46` has `console.error` for failed static param generation; these should not silently degrade
- **Admin jobs crash handling** — `app/admin/jobs/page.tsx:104` catches and logs errors but returns empty state silently; add admin-visible banner
- **`mostPopular` tier badge** in employers page is hardcoded "Most Popular" (not translated); add `marketing.employers.tierMostPopular` key
- **Dashboard "Training progress" label** (line 678) is hardcoded English in the mobile ring section
- **Dashboard quick action labels** ("Upload Resume", "My Progress", "Interview Prep", "AI Tools") at lines 931–934 are hardcoded and not localized

---

## Per-Specialist Findings (Detailed)

---

### SPECIALIST 1: Code Quality & Bugs

#### Bug 1 — Broken anchor scroll on /employers page (P0)
**File:** `app/employers/page.tsx:674`  
The section wrapping `EmployerContactForm` has `id="employer-contact"` but every CTA button (lines 57, 147, 608, 638, 665, 773) targets `href="#employer-contact-form"`. These do not match. Clicking any employer CTA button does nothing.  
**Fix:** Change line 674 from `id="employer-contact"` to `id="employer-contact-form"`.

#### Bug 2 — Console errors are legitimate error signals, not bugs to remove
`app/page.tsx:61` — `console.error('[homepage] getActivePrograms failed', e)` is correct: it logs the error and falls back to static PROGRAMS. This is intentional defensive coding. No change needed.  
`app/(portal)/dashboard/page.tsx:59,136,142,154` — Multiple `console.error` calls in `renderMemberDashboard` for partial query failures. These are correct: each uses `Promise.allSettled` and degrades gracefully. Not bugs.  
`app/admin/page.tsx:101` — `logPrismaReason` helper logs and does not swallow. Correct.

#### Bug 3 — TODO: remind-member route is a dead stub (P1)
**File:** `app/api/counselor/remind-member/route.ts:46–47`  
Two `TODO` comments indicate no email or SMS integration has been wired in. Counselors receive a success response but no actual notification is sent.  
**Fix:** Implement email send via Resend (already used elsewhere). Estimate: 2 hours.

#### Bug 4 — Legacy `PlacedOutcome` TODO (P3)
**File:** `app/api/admin/members/[id]/placed-outcome/route.ts:106`  
Comment: `// TODO: Remove once PlacedOutcome is fully retired.` — dead code path still present.  
**Fix:** Remove after confirming no admin UI calls this path.

#### Bug 5 — `promoteCsvProgressToCanonical` error count not surfaced (P2)
**File:** `lib/coursera/csvImport.server.ts:572`  
On SQL failure, `{upserted: 0, errors: 1}` is returned. The caller at line 212 only reads `promotion.upserted` and includes it in the `IngestResult`. The `promotion.errors` field is silently discarded. Admin CSV import UI shows "N rows promoted" with no indication of failure.  
**Fix:** Include `promotionErrors: promotion.errors` in the returned `IngestResult` type and display it in the admin CSV import response UI.

#### TypeScript `any` casts — None found
A search for `: any` and `as any` in `app/page.tsx`, `lib/content/leadership.ts`, and `lib/coursera/csvImport.server.ts` returned no results. These files are cleanly typed.

#### Unused imports — None found in key files
`app/page.tsx` imports are all used. `lib/content/leadership.ts` exports `LEADERS`, `getLeaderBySlug`, and all types — all appear to be used by leadership pages. `lib/coursera/csvImport.server.ts` imports are all consumed.

---

### SPECIALIST 2: I18n Completeness

#### Finding 1 — Translation keys are 100% in sync across all 4 locales
Running a flatten-and-diff of all 4 `messages/*.json` files shows **646 keys in en.json, and exactly 646 matching keys in es.json, fr.json, and pt.json**. No keys are missing, and no values are identical to English (all are genuinely translated). The `marketing.home` and `marketing.employers` namespaces are fully covered.

#### Finding 2 — 17+ hardcoded English strings BYPASS the translation system in `/employers` (P0)
These strings exist as JSX text or hardcoded JS object literals, completely outside the `t()` function. They will always display in English regardless of locale:

| Location | Hardcoded String |
|---|---|
| `app/employers/page.tsx:242` | `'Post a Role or Browse'` |
| `app/employers/page.tsx:243` | `'Tell us what you need — or browse our pipeline...'` |
| `app/employers/page.tsx:246` | `'We Match You'` |
| `app/employers/page.tsx:247` | `'Our team connects you with vetted graduates...'` |
| `app/employers/page.tsx:250` | `'Hire When Ready'` |
| `app/employers/page.tsx:251` | `'Interview on your timeline...'` |
| `app/employers/page.tsx:301–304` | `'Guided career tools and counselor support: Members work...'` |
| `app/employers/page.tsx:423` | `'IT Support'` (cohort card) |
| `app/employers/page.tsx:424` | `'IBM Professional Certificate'` |
| `app/employers/page.tsx:445` | `'Cybersecurity'` |
| `app/employers/page.tsx:446` | `'Google / CompTIA pathway'` |
| `app/employers/page.tsx:468` | `'AWS Cloud'` |
| `app/employers/page.tsx:489` | `'Data Analytics'` |
| `app/employers/page.tsx:513–514` | `'How Hiring ' + 'Experience'` (split heading) |
| `app/employers/page.tsx:516` | `'Submit the employer intake and we will review it within 1–2 business days.'` |
| `app/employers/page.tsx:581` | `'Choose the level that fits your hiring needs'` |
| `app/employers/page.tsx:626` | `'Most Popular'` (tier badge) |
| `app/employers/page.tsx:718–732` | Three contact panel bullet texts |
| `app/employers/page.tsx:743` | `'Direct contact'` |

**Suggested keys to add** to `marketing.employers` namespace:
`processSection2Title`, `processStep1Title2`, `processStep1Desc2`, `processStep2Title2`, `processStep2Desc2`, `processStep3Title2`, `processStep3Desc2`, `valueBodyInline`, `cohortITTitle`, `cohortITBadge`, `cohortCyberTitle`, `cohortCyberBadge`, `cohortAWSTitle`, `cohortAWSBadge`, `cohortDataTitle`, `cohortDataBadge`, `hiringTitle`, `hiringSubtitle`, `tierSubtitle`, `tierMostPopular`, `contactResponseTime`, `contactAudience`, `contactReview`, `contactDirectTitle`

#### Finding 3 — `/apply` page is fully localized (no issues)
`app/apply/page.tsx` uses `getTranslations('apply')` throughout. All JSX text goes through `t()` calls. The `noscript` fallback is English-only by necessity (JavaScript is off, locale can't be read).

#### Finding 4 — `/how-it-works` page is fully localized after recent CTA addition
The recently-added CTA section uses `t('ctaTitle')`, `t('ctaBody')`, `t('ctaApply')`, `t('ctaContact')` — all present in `messages/en.json` under `marketing.howItWorks`. Translations confirmed in es/fr/pt.

---

### SPECIALIST 3: Member Experience Gaps

#### Gap 1 — New member (state A) UX is handled gracefully
`app/(portal)/dashboard/page.tsx:359–365` defines `dashboardState === 'A'` as `!enrolledProgram`. The mobile view shows a prominent "Apply now — 10 minutes" banner (`lines 696–729`). The `mobileProgressSummary` at line 479 gracefully returns `'Courses will appear once your program is set'` when `totalCourses === 0`. Desktop shows `ProgramPicker` via `/dashboard/program`. No UX gap here for the initial state.

**However:** Progress ring (line 637) shows for all states except A. State B (enrolled, assessment not done) shows 0% ring with "Getting started" label — visually indistinguishable from failure. Fix: hide ring for state B (see P1-5 above).

#### Gap 2 — Coursera progress data flow is correct after the fix
`loadMemberProgramTrainingView()` (`lib/member/memberProgramTrainingView.ts:34–136`) queries `prisma.courseProgress.findMany()` which reads from the canonical `course_progress` table. After `promoteCsvProgressToCanonical()` runs (called on every CSV import and identity mapping), CSV-sourced rows appear in this table. The dashboard uses the result of `loadMemberProgramTrainingView()` at `dashboard/page.tsx:319–326`. The data flow is: **CSV upload → `ingestCourseActivityRows()` → `promoteCsvProgressToCanonical()` → `course_progress` table → `loadMemberProgramTrainingView()` → dashboard UI**. This is working correctly.

**One edge case:** If `coursera_course_slug` is NULL for a CSV row (line 554 of `csvImport.server.ts`: `WHERE ccp.coursera_course_slug IS NOT NULL`), the row is excluded from promotion. This is intentional but should be monitored — admin should verify CSV data includes the slug column.

#### Gap 3 — Members with no program assigned lack clear self-serve resolution
Most current members show "Program —" in admin. From the dashboard, state A members see a "Choose your program" link to `/dashboard/program` which shows `ProgramPicker`. The `ProgramPicker` can submit a program enrollment. **However**, `app/(portal)/dashboard/program/page.tsx:58` says: "members can choose an initial program, but self-serve switching should not become a public free-for-all. Keep later reassignment counselor/admin-driven." This means members who applied but didn't choose a program in their initial application can self-select via `/dashboard/program`. Members who already have a program set see training view instead. **Gap:** after applying, if a member has no program, there's no in-page prompt to go choose one — the state A CTA only shows if `!enrolledProgram`, which is correct, but there's no in-context explanation for why no program is set.

#### Gap 4 — Duplicate members (Dionte Carr, Sergio Sanchez): no data integrity issues found
The duplicate detection page (`/admin/members/duplicates`) is admin-only and uses a client component `MemberDuplicatesClient`. The merge API is at `/api/admin/members/merge`. For `course_progress` data: the `promoteCsvProgressToCanonical()` upsert uses `ON CONFLICT (user_id, program_slug, course_slug) DO UPDATE SET ... percent_complete = GREATEST(...)` — so if both accounts had progress, a merge would keep the higher completion. No data loss risk. Action required: admin merge via UI.

#### Gap 5 — Training "stale" escalation threshold is 14 days (possibly too short)
`lib/member/memberProgramTrainingView.ts:10` defines `STALE_TRAINING_ACTIVITY_DAYS = 14`. The counselor escalation strip on the dashboard (`showStuckCounselor`) fires after 14 days of no `course_progress` activity. For members who work full-time and study on weekends, 14 days between portal logins is normal. This may trigger false-positive "stuck" banners.  
**Where:** `lib/member/memberProgramTrainingView.ts:10`  
**Suggested fix:** Increase to 21 days, or base the threshold on `trainingEligibleSince` (time since enrolled + assessment completed) rather than absolute inactivity.

---

### SPECIALIST 4: Performance & Infrastructure

#### Item 1 — /api/auth/me route analysis: NOT a 404 bug for unauthenticated users
**File:** `app/api/auth/me/route.ts`  
The route returns **HTTP 200** for unauthenticated users (lines 31–43), not 404. It checks `hasSupabaseServerEnv()` first (for build-time safety), then `getUser()`, and returns `{role: null, ...}` with status 200 on no session. This is correct behavior. The **MainNav** (`components/MainNav.tsx:117`) calls this endpoint on every mount and on window focus — for logged-out users on marketing pages, this fires a 200 request that the nav uses to confirm the "Login" state. This is not a bug.

**The "ERR_FAILED on 9 pages" observation is likely:** (a) network-level failures when the Supabase endpoint is slow, or (b) the service worker (`public/sw.js`) caching stale responses on mobile. The sw.js CACHE_NAME is `workforceap-v4` and only caches `/images/wap_logo.png` — it should not be causing ERR_FAILED on API calls.

**Recommendation:** Add `Cache-Control: no-store` header (already present on the route's authenticated response, line 68) — confirm it's also set on the unauthenticated 200 response (it is not explicitly set on lines 16–28 or 31–43).  
**Fix:** Add `{ headers: { 'Cache-Control': 'no-store' } }` to the two unauthenticated response returns (lines 17 and 32).  
**File:line:** `app/api/auth/me/route.ts:17, 32`  
**Effort:** 5 minutes

#### Item 2 — Vercel cron configuration: both Coursera crons are scheduled correctly
**File:** `vercel.json`  
- `coursera-training-sync`: `"0 * * * *"` (hourly) — replays pending xAPI statements into `course_progress` via `replayPendingXapiStatements()`
- `coursera-sync`: `"0 */6 * * *"` (every 6 hours) — polls Coursera Enterprise API for skillset progress
- Both routes exist and have proper CRON_SECRET authorization.
- Total of 14 crons scheduled. No orphaned routes found. `stale-training-check` is scheduled at `"30 12 * * *"` (daily).

#### Item 3 — "Members with course progress" metric now counts CSV-promoted rows correctly
**File:** `lib/admin/courseraOps.ts:90–104`  
`getCourseraSyncStatus()` calls `prisma.courseProgress.groupBy({ by: ['userId'], _count: { userId: true } })`. After `promoteCsvProgressToCanonical()` runs on CSV import, those rows exist in `course_progress` table and are counted. The metric is now correct and inclusive of CSV-sourced data. **No fix needed.**

#### Item 4 — Admin members list: no N+1 queries found
**File:** `app/admin/members/page.tsx`  
The main query uses `prisma.user.findMany()` with nested `profile`, `partnerReferrals` (includes), and `courseEnrollment`. This is a single query with eager joins — no N+1. The `.map()` at line 124 only calls synchronous functions `calculateFitScore()`, `calculateHealthStatus()`, `getProgramBySlug()`, and `parseCourseSlugList()` — all in-memory, no database calls. No N+1 pattern.

**Separate concern:** `programsResult` query at lines 183–191 does a second `prisma.user.findMany()` to get enrolled/completed counts. This runs AFTER the member list query. This is a second round-trip but not N+1.

#### Item 5 — ERR_FAILED root cause analysis
Based on code review:
- `app/layout.tsx` references `/manifest.json` (exists), `/images/wap_logo.png` (exists), `/sw.js` (exists). No broken asset references.
- `components/MainNav.tsx` references `/images/wap_logo.png` (exists).  
- The most likely source of ERR_FAILED errors is the **`/api/auth/me` endpoint being called from `MainNav` when the Supabase connection is slow or the DB is timing out** — the catch block at line 71 of `route.ts` returns 500, not 200, causing the nav to fail silently (the `try` in MainNav catches this and keeps default "Login" state).

**Missing `Cache-Control: no-store` on unauthenticated path** (see Item 1) means browsers or CDN might cache the unauthenticated 200 response and serve it to logged-in users, causing a stale "Login" nav state.

#### Infrastructure Health Summary
| Component | Status | Notes |
|---|---|---|
| Coursera crons | Healthy | Both scheduled, routes operational |
| CSV→course_progress promotion | Working | After recent fix |
| `distinctMembersWithCourseProgress` metric | Correct | Reads canonical `course_progress` table |
| `/api/auth/me` for unauthenticated users | HTTP 200 (correct) | Missing `Cache-Control: no-store` on unauthenticated path |
| Manifest + PWA assets | OK | All referenced files exist |
| Service worker | OK | `workforceap-v4`, only caches logo |
| TypeScript build checks | Disabled | `ignoreBuildErrors: true` in next.config.ts |
| ESLint build checks | Disabled | `ignoreDuringBuilds: true` in next.config.ts |

---

## File Reference Index

| Finding | File | Lines |
|---|---|---|
| Broken anchor (P0-1) | `app/employers/page.tsx` | 57, 147, 608, 638, 665, 673, 773 |
| Hardcoded English (P0-2) | `app/employers/page.tsx` | 241–754 (17+ strings) |
| remind-member stub (P1-1) | `app/api/counselor/remind-member/route.ts` | 46–47 |
| Program CTA gap (P1-2) | `app/(portal)/dashboard/page.tsx` | 696–729 |
| Progress ring state B (P1-5) | `app/(portal)/dashboard/page.tsx` | 637 |
| Admin coursesCompleted discrepancy (P1-6) | `app/admin/members/page.tsx` | 146–147 |
| promoteCsvProgressToCanonical error surfacing (P2-1) | `lib/coursera/csvImport.server.ts` | 212–213, 572 |
| TypeScript build skip (P2-2) | `next.config.ts` | 28 |
| Homepage hardcoded about text (P2-3) | `app/page.tsx` | 397–401 |
| MainNav fetch-on-focus (P2-5) | `components/MainNav.tsx` | 179–181 |
| Cache-Control on /api/auth/me unauthenticated path | `app/api/auth/me/route.ts` | 17, 32 |
| Stale training threshold | `lib/member/memberProgramTrainingView.ts` | 10 |
| Duplicate members merge | `app/admin/members/duplicates/page.tsx` | — (admin action) |
| PlacedOutcome TODO (P3) | `app/api/admin/members/[id]/placed-outcome/route.ts` | 106 |
| Coursera cron schedules | `vercel.json` | 14–15 |
| Training progress data flow | `lib/member/memberProgramTrainingView.ts` | 34–136 |
| distinctMembersWithCourseProgress | `lib/admin/courseraOps.ts` | 90–104 |
