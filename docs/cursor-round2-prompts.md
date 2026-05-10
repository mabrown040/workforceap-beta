# Cursor Round 2 — Agent Prompts

> Run these on your local machine where `cursor` CLI is available.
> Copy-paste each prompt into Cursor's agent composer or save and run with `cursor run --task "..." --auto-apply`

---

## Agent 1: Member Trust + Mobile UX

```
You are a member-first UX engineer for WorkforceAP — a nonprofit career training platform serving low-income adults, many on cracked Android phones with tight data and skepticism about "free" promises.

Your task: Fix the highest-impact member-facing issues in the dashboard. Create a single PR with clean, scoped changes.

## Issues to fix (from member audit)

1. **"Free" copy lacks nuance** — `app/(portal)/dashboard/page.tsx:776-779` welcome card says "no cost to members" without qualification. In `messages/en.json` and `messages/es.json`, update `careerTrainingNoCost` to include: "for qualifying members, confirmed by your counselor" and mention that partner sites (Coursera) may have their own terms.

2. **FAQ oversimplifies** — `app/(portal)/dashboard/guide/page.tsx:75-76` says "available at no cost" without enrollment steps. Update the FAQ answer to say "no program fee for members who qualify" and point to counselor confirmation.

3. **Third-party "free" claims** — `app/(portal)/dashboard/career-brief/page.tsx:53,79` says HIPAA/Office cert "free online". Replace with "often low-cost or included through partners—check current terms" or name the catch (account required).

4. **Mobile font sizes too small** — In `css/portal.css`, increase minimum font sizes for mobile:
   - `.portal-journey-step__detail`: 0.75rem → 0.875rem
   - `.portal-quick-grid-item__label`: 0.75rem → 0.875rem
   - Dashboard date pills, progress chips: minimum 0.8125rem
   - `MemberProgressStrip` step labels: 0.75rem → 0.875rem, dots 18px → 24px

5. **Profile bar fixed width** — `app/(portal)/dashboard/profile/page.tsx:245-259` uses 180px fixed width. Make it full-width on small screens (`max-w-full` or `width: 100%` below 768px).

6. **Learning page micro-text** — `app/(portal)/dashboard/learning/page.tsx` pathway bar 0.375rem → 0.5rem, eyebrow text 11px → minimum 0.8125rem.

7. **Resume load failure fakes success** — `app/(portal)/dashboard/layout.tsx:43-46` on DB error pretends resume exists. Change to show an honest banner: "We couldn't load your resume status—try again" instead of defaulting to true.

8. **Coursera fallback silent** — `app/(portal)/dashboard/page.tsx:151-157` if live progress fails, falls back to empty map. Add a small inline notice: "Live training sync unavailable—showing last saved progress" when `liveProgress` is empty after error.

9. **Match failure = no matches** — `app/(portal)/dashboard/jobs/JobsListingClient.tsx:330-333` treats error as empty list. Show "Couldn't load your matches—pull to refresh" or a retry button.

10. **Replace `alert()` with inline errors** — `app/(portal)/dashboard/LogCertificationModal.tsx:29-31` and `PlacementConfirmationStrip.tsx:22-24` use browser `alert()`. Replace with inline red message + retry button in the component.

## Rules
- One PR, one concern: only these member-facing fixes
- Don't change auth, roles, or API contracts
- Update both `messages/en.json` and `messages/es.json` for any new copy
- Build must pass (`npm run build`)
- Use the existing design system (no new CSS frameworks)
- PR title: "fix(member): mobile font sizes, trust copy, and honest error states"
```

---

## Agent 2: Partner Pipeline Truth

```
You are a data-integrity engineer for WorkforceAP. Partners (WIOA, nonprofits) rely on accurate pipeline counts to report outcomes and manage referrals.

Your task: Fix the pipeline count accuracy and training completion visibility issues. Create a single PR.

## Issues to fix (from partner audit)

1. **Add "Open apply link" on mobile** — `app/(portal)/partner/page.tsx` mobile block only shows URL + copy. Add a primary <a href={referralApplyUrl}> anchor labeled "Open application link" (or "Abrir enlace de aplicación" in ES). Use absolute URL, not next/link.

2. **CopyReferralLink fallback** — `components/partner/CopyReferralLink.tsx` on failure shows "Copy failed" with no fallback. Add an always-visible "Open link" secondary action using the same `url`.

3. **Guide step 2 missing ref param** — `app/(portal)/partner/guide/page.tsx` step 2 uses `href: '/apply'` with no `?ref=`. Load the partner's `referralCode`/`slug` and set link to `/apply?ref={code}`.

4. **Pipeline stage uses course completion** — `lib/pipeline/stage.ts` currently uses `userCertifications` for `certified` stage. After computing `computeTrainingProgress`, if `completedCount >= totalCourses` (and program has courses), treat stage as `training_complete` (new stage) or `certified`. Add this stage to `PIPELINE_STAGE_LABELS`.

5. **ReferralBundle stage label consistency** — `lib/partner/referralBundle.ts` (`toPartnerMembersListRows`): derive `stageLabel`/`stage` from same rules as the story. When `memberProgramCompleted` is true, bump display stage to reflect completion. Add `trainingComplete: boolean` and `coursesCompleted/coursesTotal` columns.

6. **Fix 80% "Course-complete" rule** — `app/(portal)/partner/referred-members/[memberId]/page.tsx:~125` uses `progressPct >= 80`. Replace with `memberProgramCompleted` (from `lib/member/trainingProgress.ts`) and show "X of Y courses" in snapshot.

7. **Add `job_searching` to journey stages** — `app/(portal)/partner/page.tsx` `JOURNEY_STAGES` only has applied→placed. Add `job_searching` as a visible stage so totals sum correctly. Ensure displayed stages sum to non-`closed` referrals.

8. **Deduplicate pending placements** — `lib/partner/referralBundle.ts` `pendingPlacements` counts every event. Return `pendingPlacements` deduped by `userId` (or `pendingPlacementMemberIds.length`). Update consumers in `partner/page.tsx` and `outcomes/page.tsx`.

9. **Align guide metrics with dashboard** — `app/(portal)/partner/guide/page.tsx`: "Members referred" uses `prisma.application.count` (counts applications, not people). Change to count distinct members with `referralPartnerId` or count `PartnerReferral` rows. "Placed in jobs" uses `jobPostingApplications hired` — align with `placementRecord` (the primary source).

10. **Human event labels** — `app/(portal)/partner/page.tsx` Recent activity shows raw `ev.eventName`. Add a small map in `lib/partner/partnerActivityLabels.ts` (e.g. `APPLICATION_SUBMITTED → "Applied"`, `INTERVIEW_SCHEDULED → "Interview scheduled"`) and use it.

11. **Fix "Enrolled" date** — `components/partner/PartnerReferredMembersMobile.tsx` subtitle "Enrolled {referredAtLabel}" uses referral date. Change to enrollment date from `courseEnrollments` or clarify as "Referred {date}".

## Rules
- One PR, one concern: partner pipeline truth
- Don't change auth or role checks
- Add new pipeline stage `training_complete` (or map to existing `certified`) consistently
- Build must pass
- PR title: "fix(partner): pipeline count accuracy, training completion visibility, and honest labels"
```

---

## Agent 3: Employer Data Accuracy

```
You are a data-integrity engineer for WorkforceAP. Employers pay to post jobs and find candidates. Data accuracy is revenue-adjacent.

Your task: Fix the employer data accuracy and labeling issues. Create a single PR.

## Issues to fix (from employer audit)

1. **Split matches vs applications in pipeline** — `app/(portal)/employer/page.tsx:66-118` counts AI matches and applications as one "Talent Pipeline". Split into two metrics: "AI-suggested profiles" (matches) and "Applications received" (applications). Keep raw counts for ops but label semantics explicitly.

2. **Candidate profile split stats** — `app/(portal)/employer/candidates/[studentId]/page.tsx:115-120` folds matches + applications into "Roles in pipeline". Split into: "Applications submitted" (`applications.length`), "Suggested matches" (`matches.length`), and "Distinct roles" (union with labels).

3. **Fix application count drift** — `app/(portal)/employer/jobs/[id]/page.tsx` uses denormalized `applicationsCount`. Load `include: { _count: { select: { applications: true } } }` and use `_count.applications` (or reconcile in a migration). The apply route increments but deletions don't decrement.

4. **"Applied" column includes declined** — `components/employer/EmployerApplicationsClient.tsx:229-237` header "Applied" wraps submission date, including rejected rows. Rename header to "Submitted" or add sublabel "Not current stage".

5. **Candidate profile shows "Applied" for rejected** — `app/(portal)/employer/candidates/[studentId]/page.tsx:271-284` shows "Applied {date}" for every row. If `application.status === 'rejected'`, use "Submitted …" plus "Outcome: declined".

6. **Status selector human labels** — `components/employer/EmployerApplicationsClient.tsx:220-224` shows raw DB enums (`rejected`, `pending`). Use `employerJobPostingApplicationStatusLabel` from `lib/employer/jobPostingApplicationStatus.ts`.

7. **Fix AI match "declined" label** — `lib/employer/aiMatchPipelineLabels.ts:4-8` maps `rejected → 'Passed'`. Change to `Declined` or `Not moving forward` to align with kanban.

8. **Add training completion filter** — `app/(portal)/employer/applications/page.tsx`: extend `searchParams` with `certCompleted`/`trainingComplete`. In `jobPostingApplication.findMany`, add `where` on `student` relations: `userCertifications`, `MemberProgramProgress`, or `CourseProgress.status === COMPLETED`. Add chips in `MobileApplicationsClient` / desktop.

9. **Add credentials to candidate profile** — `app/(portal)/employer/candidates/[studentId]/page.tsx`: in `prisma.user.findUnique`, add `select`/`include` for:
   - `userCertifications: { select: { certName, issuer, earnedAt } }`
   - `memberProgramProgress` for enrolled program
   - `CourseProgress` rows for completed courses
   Add a "Training & credentials" section showing certs + completion evidence.

10. **Match score tooltip** — Employer pages using `matchScoreAsPercent` (e.g. `EmployerKanban.tsx`, `matches/page.tsx`). Add contextual microcopy: "Weighted fit score (0-100)" or tooltip from `matchReasons`.

## Rules
- One PR, one concern: employer data accuracy and labeling
- Don't change match scoring algorithm (just presentation)
- Don't change auth or role checks
- Build must pass
- PR title: "fix(employer): separate matches from applications, honest labels, and training filters"
```

---

## Agent 4: Spanish i18n Sweep

```
You are an i18n engineer for WorkforceAP. Spanish-speaking members are a significant portion of our user base. The portal must feel native in Spanish.

Your task: Complete the Spanish i18n sweep for remaining untranslated portal surfaces. Create a single PR.

## Issues to fix (from global voice audit)

1. **Employer portal i18n** — `app/(portal)/employer/` pages have hardcoded English strings:
   - `employer/page.tsx`: "Talent Pipeline", "Post a role", "Matched candidates"
   - `employer/jobs/page.tsx`: "Active postings", "Drafts", "Closed"
   - `employer/applications/page.tsx`: "Applications", "Filter by status"
   - `employer/candidates/[studentId]/page.tsx`: "Candidate snapshot", "Roles in pipeline", "AI matches"
   - Add `employer` namespace to `messages/en.json` and `messages/es.json`. Replace all hardcoded strings with `t()` calls.

2. **Partner portal i18n** — `app/(portal)/partner/` pages have hardcoded English:
   - `partner/page.tsx`: "Members referred", "Pipeline overview", "Certificates"
   - `partner/guide/page.tsx`: "How it works", "Step 1", "Step 2"
   - `partner/referred-members/page.tsx`: "Referred members", "Filter"
   - Add `partner` namespace to both JSON files.

3. **Counselor portal i18n** — `app/(portal)/counselor/` and `app/(portal)/dashboard/messages/`:
   - "Message queue", "Unread", "Mark as read"
   - Add `counselor` and `messages` namespaces.

4. **Fix translation quality issues** — In `messages/es.json`:
   - `footer.workforceBoards`: "Junta de workforce" → "Juntas de trabajo locales"
   - `dashboard.toolCountTogether`: "cosa/cosas" → "recurso(s)"
   - `apply.referral.capitalArea`: keep English or translate to "Área de la capital"
   - Audit any remaining literal translations that sound robotic

5. **Dashboard SR-only English** — `app/(portal)/dashboard/page.tsx` has `<h1 className="wa-sr-only">Welcome to WorkforceAP...</h1>`. Move to `messages/dashboard.srOnlyWelcome` in both languages.

6. **Program content** — Program titles and categories ("Technology", "Construction") come from config, not messages. For now, add a `programs` namespace with display names in both languages so pages can use `t('programs.technology')` etc.

## Rules
- One PR, one concern: i18n sweep
- Update BOTH `messages/en.json` AND `messages/es.json` for every key
- Don't change logic or auth — only string extraction and JSON updates
- Build must pass
- Use existing `getTranslations` / `useTranslations` patterns from `learningHub` and `training` namespaces
- PR title: "fix(i18n): complete spanish translations for employer, partner, counselor portals"
```

---

## Agent 5: CEO Strategic Fixes

```
You are a strategic engineer for WorkforceAP. The CEO review scored the product 6.4/10 with biggest risks around training truth under load, calendar diligence, and employer job API verification.

Your task: Implement the highest-leverage operational containment fixes. Create a single PR.

## Issues to fix (from CEO review)

1. **Coursera/xAPI stale data honesty** — When xAPI sync fails or data is >24h old, the UI should tell the truth instead of showing stale progress as current:
   - `app/(portal)/dashboard/training/page.tsx`: If `lastSyncAt` is >24h old, show banner: "Training progress may be out of date. Last sync: {date}."
   - `app/(portal)/employer/candidates/[studentId]/page.tsx`: Same stale-data banner if candidate progress is old.
   - Add `lastSyncAt` to relevant data fetches if not already present.

2. **Add monitoring/alerting hooks** — In `lib/coursera/learnerProgress.ts` and `lib/xapi/inboundStatementPipeline.ts`:
   - Log structured warnings when sync fails: `console.warn('[SYNC] Coursera sync failed for userId={id}', error)`
   - Add a `SYNC_STALE_THRESHOLD_HOURS = 24` constant
   - Export a `isSyncStale(lastSyncAt)` helper for UI use

3. **Employer job pipeline verification** — In `lib/employer/jobPipeline.ts` (or create if missing):
   - Add a `verifyPipelineIntegrity()` function that checks: all active jobs have valid employer, all applications have valid student + job, no orphaned match records
   - Call this in a new API route `GET /api/admin/integrity/employer-pipeline` that returns `{ ok: boolean, issues: Array<{ type, id, message }> }`
   - This gives ops a way to verify pipeline health without manual SQL

4. **WIOA reporting alignment** — In `lib/partner/wioaReporting.ts` (or create):
   - Add a `generateWioaMetrics(partnerId, dateRange)` function that returns:
     - `enrolledCount` (distinct members with `courseEnrollments`)
     - `completedCount` (members with `memberProgramCompleted`)
     - `placedCount` (members with `placementRecord` in date range)
     - `avgDaysToPlacement` (average days from enrollment to placement)
   - This centralizes WIOA metrics so guide, dashboard, and exports use the SAME numbers

5. **Operational SLO documentation** — Create `docs/OPERATIONAL-SLOS.md` with:
   - Coursera sync: must complete within 5 minutes, data <1h old during business hours
   - xAPI ingestion: must persist within 30 seconds of receipt
   - Employer pipeline integrity check: run daily, alert on >0 issues
   - WIOA metrics: must be computable from canonical tables only (no denormalized counters)

## Rules
- One PR, one concern: operational containment and monitoring
- Don't change core auth or business logic
- Add new files where needed (docs, lib helpers)
- Build must pass
- PR title: "feat(ops): add stale-data honesty, pipeline integrity checks, and WIOA metrics"
```

---

## Quick Launch (if `cursor` CLI is available)

```bash
cd ~/workspace/wap-repo

# Agent 1
cursor run --task "$(cat docs/round2-agent-1.md)" --auto-apply

# Or all 5 in separate terminals...
```

## Files Location

- Prompts: `~/workspace/wap-repo/docs/cursor-round2-prompts.md`
- Node launcher: `~/workspace/wap-repo/scripts/cursor-round2-agents.js`

---

*Generated by DenchClaw on 2026-05-09*
