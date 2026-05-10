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
