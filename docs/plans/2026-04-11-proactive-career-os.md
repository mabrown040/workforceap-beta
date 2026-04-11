# Proactive Career OS — Detailed Implementation Plan

**Date:** 2026-04-11
**Status:** Draft — awaiting architectural decisions
**Author:** Claude (via Claude Code session)

## Context

Shift the Member Portal from a passive course tracker (3-star experience) to a proactive Career Operating System (10-star experience) that translates learning into verified skills, confident interviewing, and direct employer connections.

The original high-level execution plan proposed several "new" files and models. This detailed plan is the result of exploring the codebase and discovering that **~40% of the proposed work already exists**. This document replaces the naive "build from scratch" approach with a concrete "extend what exists" plan.

## Reality check vs the original execution plan

| Execution plan item | Reality |
|---|---|
| `lib/member/nextBestActions.ts` (NEW) | **Already exists** — 148 lines, 8 weighted actions, pure fn `buildNextBestActions(ctx)` |
| "Add Next Best Action UI component" | **Already exists** — `components/portal/MemberNextStepsStrip.tsx` (116 lines) renders the strip; `DashboardHomeClient` already accepts `nextBestActions: NextBestAction[]` prop |
| "Refactor DashboardHomeClient to prioritize action strip" | **Partially done** — strip already wired in; question is just visual priority |
| `SkillVerification` model (NEW) | **Doesn't exist** — genuine gap |
| `InterviewReadiness` model (NEW) | **Doesn't exist**, but `User.interviewEligible`, `interviewRequestedAt`, `interviewCompletedAt` exist |
| `EmployerMatch` model (NEW) | **Partially exists** — `AIJobMatch` model has `matchScore`, `matchReasons`, but it's job-level, not skill-level |
| "Connect verified skills to employer job requirements" | **Foundation exists** — `Job.requirements: String[]`, `Job.preferredCertifications: String[]`, `Job.suggestedPrograms: String[]`, plus `PROGRAM_AXIS_MAP` (6-axis skill scoring per program) |

**Net:** The real work is in (1) persistent skill verification, (2) interview readiness scoring, (3) tightening the matching loop between verified skills and employer jobs.

## What already exists in the codebase

### Portal Dashboard
- `app/(portal)/dashboard/page.tsx` — server component, auth-gated via `getUser()`
- `components/portal/DashboardHomeClient.tsx` — client component, already accepts `nextBestActions: NextBestAction[]` prop at line 51
- State machine A/B/C/D embedded in dashboard:
  - **A**: Account created, no application or not enrolled
  - **B**: Application approved, program chosen, awaiting assessment
  - **C**: Assessment complete, in training (courses in progress)
  - **D**: All courses complete, focus on job readiness / placement

### Next Best Actions engine
- `lib/member/nextBestActions.ts` — 148 lines, pure function `buildNextBestActions(ctx)`
- Returns top 4 weighted actions
- Current actions: `submit_application` (100), `choose_program` (95), `skills_assessment` (90), `counselor_messages` (88), `upload_resume` (80), `job_tracker` (60), `complete_profile` (45), `weekly_recap` (40)

### Portal UI primitives
- `components/portal/ui/PortalActionCard.tsx` — reusable card with eyebrow, title, description, CTA, icon, badge, hero gradient
- `components/portal/ui/PortalMetricCard.tsx` — metric display card
- `components/portal/MemberNextStepsStrip.tsx` — renders NextBestAction[] as responsive grid with urgent left-border accent

### User data model (`prisma/schema.prisma`, lines 45–153)
Progression-related User fields already exist:
- `assessmentCompleted`, `assessmentCompletedAt`, `assessmentScore`, `assessmentScorePct`
- `enrolledProgram` (slug), `enrolledAt`
- `coursesCompleted: Json?` — JSON array of course slugs
- `interviewEligible`, `interviewRequestedAt`, `interviewCompletedAt`
- `careerRecommendationJson` — O*NET-backed quiz snapshot

### Related models
- **Application** — PENDING | APPROVED | DENIED | NEEDS_INFO
- **PlacementRecord** — WIOA/grant-aligned placement tracking
- **Employer** — companyName, website, industry, status
- **Job** — title, requirements: String[], preferredCertifications: String[], suggestedPrograms: String[]
- **JobApplication** — user-level job tracker
- **AIJobMatch** — jobId, studentId, matchScore (0–100), matchReasons: String[]

### Skills representation
- `Program.skills: string[]` — free-text array ("Python", "AI/ML", "Generative AI", "Flask")
- `PROGRAM_AXIS_MAP` in `lib/content/programs.ts` — maps program slug to 6 radar axes (Analytics, Engineering, Design, Strategy, Ethics, Research), each 0–100
- `OnetOccupationSkill` — O*NET-backed skills linked to occupations by O*NET code

### Engagement signals
- `lib/member/memberEngagementSignals.ts` — snapshot of `hasResume`, `jobApplicationCount`, `counselorUnreadCount`, `weeklyRecapUnopened`
- `lib/resume/profileCompleteness.ts` — 8-field profile scoring (0–100%)

## Open architectural questions (must answer before coding)

1. **Verification trigger** — what makes a skill "verified"?
   - (a) Completing all courses in a `Program` whose `skills[]` array contains the skill
   - (b) Assessment score ≥ threshold on a skill-tagged assessment
   - (c) Counselor/mentor manual sign-off via admin UI
   - (d) Composite: course + assessment + mentor
   - **Recommendation: (a) auto-verify from course completion + (c) manual admin override** — cheapest MVP, uses existing `coursesCompleted` JSON

2. **Skill taxonomy** — `Program.skills` is free-text strings today; `OnetOccupationSkill` uses O*NET codes.
   - (a) Keep free-text and fuzzy-match to employer `Job.requirements`
   - (b) Introduce a canonical `Skill` table and FK both sides
   - **Recommendation: (a)** — ship fast, normalize later if match quality is bad

3. **Interview readiness rubric** — composite of what?
   - Proposed components: `profileCompletenessPct` (exists) + `hasResume` (exists) + `verifiedSkillCount / programSkillCount` (new) + `mockInterviewScore` (new)
   - Stored as denormalized field on User OR as separate model with history
   - **Recommendation: separate `InterviewReadiness` model** with history rows so we can show progress over time

4. **EmployerMatch granularity** — `AIJobMatch` already matches users to jobs. Do we need a separate `EmployerMatch` (user ↔ employer) or extend `AIJobMatch`?
   - **Recommendation: extend `AIJobMatch`** with `matchedSkills: String[]` and `missingSkills: String[]`. Don't create a redundant model.

## Phased file-level plan

### Phase 0 — Answer the 4 questions above
Blocking. Implement against recommendations if approved; otherwise flag overrides.

### Phase 1 — Schema & verification engine (backend only, no UI yet)

**`prisma/schema.prisma`** — add these models:

```prisma
model SkillVerification {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  skill       String   // free-text, matches Program.skills[] entries
  source      SkillVerificationSource
  sourceRef   String?  // program slug, assessment id, or staff user id
  verifiedAt  DateTime @default(now())
  verifiedBy  String?  // staff userId when source = MANUAL
  expiresAt   DateTime? // optional expiry for certifications
  notes       String?
  @@unique([userId, skill])
  @@index([userId])
}

enum SkillVerificationSource {
  COURSE_COMPLETION
  ASSESSMENT
  MANUAL
  CERTIFICATION
}

model InterviewReadiness {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  score              Int      // 0-100 composite
  profileScore       Int      // component
  resumeScore        Int      // component (0 or 100)
  skillsScore        Int      // verifiedCount / programSkillCount * 100
  mockInterviewScore Int?     // nullable until first mock
  computedAt         DateTime @default(now())
  @@index([userId, computedAt])
}

model MockInterviewFeedback {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  conductedBy  String?  // staff userId
  overallScore Int      // 0-100
  rubricJson   Json     // { clarity, confidence, structure, technical }
  strengths    String?
  improvements String?
  createdAt    DateTime @default(now())
}
```

**`lib/member/skillVerification.ts`** (NEW, ~120 LOC): pure functions
- `computeAutoVerifiedSkills(user, program): string[]` — returns skills from `program.skills[]` where all courses in the program are in `user.coursesCompleted`
- `syncSkillVerifications(userId, prisma): Promise<void>` — idempotent upsert of auto-verified skills, triggered on course completion
- Pure + side-effectful versions split for testability

**`lib/member/interviewReadiness.ts`** (NEW, ~80 LOC):
- `computeReadinessScore(ctx): InterviewReadinessComputation` — pure function, weights:
  - Profile 25% + Resume 25% + Verified skills 35% + Mock interview 15%
  - If no mock yet, rescales remaining to 100 with null mockScore
- `persistReadinessSnapshot(userId, prisma)` — writes history row

**`lib/member/nextBestActions.ts`** (EXTEND existing file):
- Add to `NextBestActionsContext`: `verifiedSkillCount: number`, `programSkillCount: number`, `interviewReadinessScore: number | null`, `mockInterviewCount: number`
- Add 3 new weighted actions:
  - `verify_skills` (weight 85): enrolled + coursesCompleted > 0 + verifiedSkillCount < programSkillCount → "Lock in your skill verifications"
  - `schedule_mock_interview` (weight 75): State D + readinessScore ≥ 60 + mockInterviewCount = 0 → "Book your first mock interview"
  - `view_employer_matches` (weight 70): State D + readinessScore ≥ 70 + no placement → "3 employers are looking for your skills"
- **No breaking changes** to existing action shapes

**Tests** (NEW):
- `lib/member/skillVerification.test.ts` — pure unit tests for `computeAutoVerifiedSkills`
- `lib/member/interviewReadiness.test.ts` — rubric math tests
- `lib/member/nextBestActions.test.ts` — EXTEND if it exists, else create; cover the 3 new actions

### Phase 2 — API endpoints

- `app/api/member/skills/route.ts` (NEW): `GET` returns `{ verified: SkillVerification[], eligible: string[], programSkills: string[] }`
- `app/api/member/interview-readiness/route.ts` (NEW): `GET` returns latest snapshot; `POST` triggers recomputation (rate-limited to 1/hour)
- `app/api/member/mock-interview/route.ts` (NEW): `POST` staff-only endpoint to submit mock feedback; updates readiness
- `app/api/admin/skill-verifications/route.ts` (NEW): admin manual verification CRUD
- **Hook into existing course completion**: after `coursesCompleted` is updated, call `syncSkillVerifications(userId, prisma)`. Fire-and-forget; log but don't fail the request on verification errors.

### Phase 3 — UI (dashboard)

**`components/portal/DashboardHomeClient.tsx`** (EDIT, minimal):
- Add prop: `interviewReadinessScore: number | null`
- Add prop: `verifiedSkills: { skill: string; source: string }[]`
- Priority change: move `<MemberNextStepsStrip>` above the hero card when `nextBestActions.length > 0` and top action has `variant: 'urgent'`
- Add a compact `ReadinessRing` component beside the hero (only rendered if State C/D)

**`components/portal/ReadinessRing.tsx`** (NEW, ~60 LOC): SVG circular progress showing composite score + breakdown on hover

**`components/portal/SkillVerifiedBadge.tsx`** (NEW, ~40 LOC): small pill badge with checkmark icon + skill name + tooltip showing source

**`app/(portal)/dashboard/page.tsx`** (EDIT): extend `renderMemberDashboard()` to fetch verified skills + readiness score via new `lib/member/` helpers, pass to client

### Phase 4 — Employer matching loop

**`prisma/schema.prisma`** (EDIT): add to `AIJobMatch`:
```prisma
matchedSkills  String[]  @default([])
missingSkills  String[]  @default([])
```

**`lib/member/employerMatching.ts`** (NEW, ~150 LOC):
- `matchUserToJob(user, job, verifiedSkills): { score, matched, missing, reasons }` — pure
- Fuzzy match `verifiedSkills` against `job.requirements` + `job.preferredCertifications`
- Use `PROGRAM_AXIS_MAP` for soft-skill fallback when direct string match fails
- Replaces or augments whatever existing matching logic feeds `AIJobMatch`

**`app/api/member/matched-jobs/route.ts`** (EDIT existing): include `matchedSkills`/`missingSkills` in response

### Phase 5 — Mock interview feedback form

**`app/(portal)/counselor/mock-interview/[memberId]/page.tsx`** (NEW): staff-facing form to submit rubric scores. Writes `MockInterviewFeedback` + triggers readiness recompute.

## File-level summary

**New files (~12):**
- `lib/member/skillVerification.ts` + `.test.ts`
- `lib/member/interviewReadiness.ts` + `.test.ts`
- `lib/member/employerMatching.ts` + `.test.ts`
- `app/api/member/skills/route.ts`
- `app/api/member/interview-readiness/route.ts`
- `app/api/member/mock-interview/route.ts`
- `app/api/admin/skill-verifications/route.ts`
- `components/portal/ReadinessRing.tsx`
- `components/portal/SkillVerifiedBadge.tsx`
- `app/(portal)/counselor/mock-interview/[memberId]/page.tsx`

**Edited files (~6):**
- `prisma/schema.prisma` — 3 new models + 2 fields on AIJobMatch
- `lib/member/nextBestActions.ts` — extend context + 3 actions
- `components/portal/DashboardHomeClient.tsx` — 2 new props, priority tweak, new components
- `app/(portal)/dashboard/page.tsx` — fetch + pass readiness/skills
- `app/api/member/matched-jobs/route.ts` — expose skill reasoning
- Course-completion route (TBD location) — trigger auto-verification

## Risks & mitigations

1. **Schema migration on prod** — 3 new tables + 2 columns. Low risk (additive, no backfill needed), but needs `prisma migrate dev` then commit the migration file.
2. **Skill string matching fragility** — "Python 3" vs "Python" vs "python". Mitigation: normalize on read (lowercase, trim, strip version suffixes) in both directions; flag low-confidence matches in `matchReasons`.
3. **Dashboard prop bloat** — `DashboardHomeClientProps` already has 10+ fields. Adding 2 more is fine, but at some point this needs refactoring to a single `memberSnapshot` object. Out of scope for this plan; worth a follow-up.
4. **Readiness score gaming** — someone could fill out the profile and claim readiness 75 without real skill. Mitigation: cap composite at `min(composite, 50 + verifiedSkills * 5)` so unverified skills can't exceed 50.
5. **Existing test coverage unknown** — run `npm run test:unit` before Phase 1 ships to establish a baseline.

## Recommended PR breakdown

Don't ship this as one PR. Break into:

- **PR 1**: Phase 1 (schema + engines + tests, no UI, no API) — reviewable, testable in isolation
- **PR 2**: Phase 2 (APIs + course-completion hook)
- **PR 3**: Phase 3 (dashboard UI — the "proactive feeling" the user will notice)
- **PR 4**: Phase 4 (employer matching upgrade)
- **PR 5**: Phase 5 (mock interview form)

Each PR is independently deployable. PR 3 is the one that delivers the "10-star feeling" the execution plan is chasing.

## Decisions needed before writing code

1. ✅/❌ on the 4 architectural questions above
2. Confirm the PR breakdown (or collapse/split differently)
3. Confirm **branch name** (suggest: `claude/proactive-career-os-phase-1`)
4. Prisma migration: create migration file via `prisma migrate dev`, or leave `schema.prisma` edited and let the user run it?
5. Is there an existing mock-interview workflow to look at before designing the rubric? (`User.interviewRequestedAt` / `interviewCompletedAt` exist but the counselor flow hasn't been explored)

Once decided, Phase 1 backend + tests can ship without touching any UI.
