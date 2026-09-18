# Member Funnel Brief — why a member cannot reach lesson one

Six of fourteen steps between signup and a job are a dead end or a loop. Three of them are fixed in under a day. Here is what to build, in order, and what to leave alone.

| | |
|---|---|
| **Tree** | `/home/claude/workforceap-beta` @ `5fef7932` (master) |
| **Traced** | 2026-09-18, read-only, no code changed |
| **Not in this tree** | PRs #2277 · #2325 · #2326 (`git log --oneline -300 \| grep` → no match), so every trace below is against the code as it stands today |

---

## 1. The three moves

In priority order. All three are Tier 1 or Tier 2 below; together they are the difference between "the site is confusing" and "the site told me what to do."

### 1. Stop WIOA-gating a grant-funded program

`POST /api/member/enroll` applies `isMemberWioaVerified` to every program slug and never reads funding source. Digital literacy is the one program in the catalog marked `'Grant'`, not `'WIOA'`. Two sibling routes already special-case it correctly; the enrol route missed the memo. This is the exact loop Mike Sr. hit, and it blocks the one program designed as the gentle on-ramp.

- **Size:** ~10 lines
- **Cites:** `app/api/member/enroll/route.ts:80-97` · `lib/content/programs.ts:280, 391`

### 2. The default dashboard must always say one true next thing

Today it says nothing to anyone who has not completed a course. `MemberDoThisNextCard` renders nothing, the lede falls back to "Pick up your program, jobs, or Career Studio," and the cert card reads "No next module on file." Fourteen written, weighted next-best-action heuristics — including a deliberate floor so "a fresh member never sees a blank surface" — run only under `?ui=legacy`, which no member visits. Bundle the "Resume module" and anchor fixes into the same PR: a guidance card whose button loops back to the dashboard is worse than no card.

- **Size:** ~1 day (E6 + E2 + E3)
- **Cites:** `lib/member/loadMemberDashboardHome.ts:369-381, 465-474` · `nextBestActions.ts:301-311` · `MemberHomeKit.tsx:597, 634-636, 672`

### 3. No "message your counselor" without someone on the other end

Seven separate dead ends route a stuck member into one channel. For a self-serve member that channel notifies nobody — the notification is inside an `if (thread.counselorUserId)`, and a self-serve member is never assigned a counselor. Until this is closed, every other fix just routes the member to a nicer dead end.

- **Size:** ~20 lines now (E4) → policy later (E10)
- **Cites:** `app/api/member/messages/route.ts:85-113`

### Seven doors, one channel, nobody listening

The message is created and the thread is touched. Then the notification fires *only* if `thread.counselorUserId` is set:

```js
if (thread.counselorUserId) {
  await createNotification({ userId: thread.counselorUserId, … });
}
```

`getOrCreateMemberCounselorThread` (`lib/messages/counselorThread.ts:31-56`) fills that field from `resolveAssignedCounselorUserId`, which returns null with no active assignment — and assignment happens only through admin action (`assignMemberCounselor` has exactly three callers, all admin/counselor routes: `app/api/admin/members/[id]/counselor/route.ts`, `app/api/admin/members/bulk-update/route.ts`, `app/api/counselor/inbox-zero/bulk/route.ts`) or the partner-referral path (`lib/counselor/ambassadorAutoAssign.ts`). **The member watches their message appear in the thread. No notification, no email, no unread badge.**

The seven doors that funnel into it:

- `nextBestActions.ts:303-311` — `default_counselor`, the always-present floor
- `nextBestActions.ts:131-144` — `counselor_messages`
- `ProgramPicker.tsx:106-112` — the `WIOA_PENDING` notice
- `TrainingCourseList.tsx:265-272` — empty course list
- `MemberTrainingWorkspace.tsx:236` — no lesson destination
- `memberApplicationStatus.ts:127-128` — applied / under review
- `learning/modules/[courseSlug]/page.tsx:43-47` — "Ask for feedback"

**Partial mitigation:** `/admin/messages` does list threads regardless of `counselorUserId` (`app/api/admin/messages/threads/route.ts:66-75` filters on `kind` and `messages: { some: {} }` only), so the message is *visible* if an admin goes looking. With one part-time admin, "visible on request" is not "received."

---

## 2. The member journey, traced in code

**Two dashboards exist, and this matters more than anything else here.** The default `/dashboard` early-returns `MemberHomeKit` fed by one Prisma transaction, budget 2 ops (`app/(portal)/dashboard/page.tsx:169-207`, `lib/member/loadMemberDashboardHome.ts`). Everything after line 207 — `getMemberState`, `buildNextBestActions`, `buildFirstValueActions`, the application-journey strip, `MobilePriorityActionCard` — is the legacy path at `?ui=legacy`. Almost all member guidance logic in the repo runs only there. That is the root cause of most of what follows.

**6 of 14 steps are a dead end or a loop.**

| # | Step | What happens | Verdict |
|---|---|---|---|
| 01 | Sign up | `/apply` → `/apply/create-account`. Works. | Works |
| 02 | Application | `Application.status` defaults `PENDING`. "Our team is reviewing your application. Watch your email" renders on the **legacy path only**. On the default dashboard the member is told nothing about their application at all. Production: 53 `PENDING`, 0 `APPROVED` ever. *(`lib/member/memberApplicationStatus.ts:112-124`; rendered at `app/(portal)/dashboard/page.tsx:500, 1050` and `DashboardHomeClient.tsx:414`; count from `CEO-REVIEW-2026-06-10` §2)* | **Dead end** |
| 03 | Program selection | `/dashboard/program` → `ProgramPicker` (`components/portal/ProgramPicker.tsx`). Pick one, confirm. | Works |
| 04 | WIOA gate | "Complete a brief eligibility screening" — applied to every slug including the grant-funded one. Move 1 above. *(`POST /api/member/enroll:80-97` → `isMemberWioaVerified`)* | **Loop** |
| 05 | Screening | `/dashboard/learning/wioa-qualification`. Submitting sets `wioaReviewStatus: 'pending'` **unconditionally**. `computeWioaSignal` is computed and stored but never used to auto-advance. Only `/api/admin/members/[id]/wioa-review` can set `'verified'`. *(`POST /api/member/wioa-qualification:59-68`)* | **Human only** |
| 06 | Back to enrol | `WIOA_PENDING` → "Review is typically completed within a few business days. You don't need to do anything else." No member-facing timer, no status page, no escalation. The stall cron notices at 5 days and emails **admins only** — "one digest notification per admin." The member is never told anything. *(`ProgramPicker.tsx:100-114` · `app/api/cron/onboarding-stalls/route.ts:41-43`)* | **Dead end** |
| 07 | Enrolment | Succeeds only after a human flips the flag. Then `enrolledProgram` set, `CourseEnrollment` created, 5 emails fired. *(`/api/member/enroll:138-201`)* | Works |
| 08 | Preassessment | Nothing offers it on the default dashboard. `/dashboard/assessment` exists and is genuinely open to everyone (ops comment at `assessment/page.tsx:35-37`). Three code sites invert the state guard: the only `skills_assessment` prompt fires on state B (no program chosen), so state-C members — the people who need it — never see it. `continue_training` and `fv_preassessment` require contradictory conditions and are **unreachable**. The one surviving prompt is buried below a progress bar in the enrolled-courses card. *(`nextBestActions.ts:87-111, 113-129` · `firstValueActions.ts:64-73` · `LearningHubEnrolledCourses.tsx:190-197`)* | **Dead end** |
| 09 | First lesson | "Resume module ▶" is the dashboard's **primary** CTA. It points at `/dashboard/training`, whose page body is `redirect('/dashboard' + search)`. The unit test asserts the bad href, so it pins the bug in place — whoever fixes it must update that assertion or the fix looks like a regression. *(`loadMemberDashboardHome.ts:369` · `app/(portal)/dashboard/page.tsx:201` · `MemberHomeKit.tsx:684-691` · `app/(portal)/dashboard/training/page.tsx:35` · `loadMemberDashboardHome.test.ts:200`)* | **Loop** |
| 10 | Complete a module | `WorkforceApModuleCompleteButton` → `POST /api/member/courses/complete` works, and is explicitly **ungated for digital literacy**. You just cannot reach the page that holds the button. *(`app/api/member/courses/complete/route.ts:34-56`)* | **Unreachable** |
| 11 | Resume & AI tools | 22 routes under `/dashboard/ai-tools/*`. All work, all save history. Over-served relative to every step above. | Over-served |
| 12 | Jobs & applications | `/dashboard/jobs`, `/dashboard/job-applications`. `JobApplication` now carries `PHONE_SCREEN` / `OFFER` / `REJECTED` plus interview reminder crons. *(`prisma/schema.prisma:476-517`)* | Works |
| 13 | Counselor contact | Every dead end says "Message your counselor." The message saves. Nobody is notified. **The worst finding in the report, because it is the fallback for all the others.** *(`app/api/member/messages/route.ts:85-113` · `lib/messages/counselorThread.ts:31-56`)* | **Dead end** |
| 14 | Placement | `PlacementRecord` (`userId @unique`), counselor-entered. Out of the member's hands by design. | Works |

### The two loops, end to end

```
/dashboard → "Resume module" → /dashboard/training → back to /dashboard

/dashboard/program → "Continue" → /dashboard/learning#course-… → page appears frozen
  → "Open Training page" → back to /dashboard
```

Neither loop ever reaches a DigitalLearn lesson. A member who has been round both has been round the loop twice without ever seeing a lesson. **That is precisely the "do loop" Mike described.**

The frozen page is a duplicate-DOM-id bug: `LearningHubEnrolledCourses` is rendered twice on `/dashboard/learning` — line 168 (`variant="mobile"`) inside `md:wa-hidden` at line 126, line 354 (`variant="desktop"`) inside `wa-hidden md:wa-block` at line 302 — and both mount `TrainingCourseList`, which emits ``id={`course-${c.slug}`}`` per card (`components/portal/TrainingCourseList.tsx:385`). The browser resolves the anchor to the *first* match: the mobile copy, which is `display:none` on desktop. Nothing scrolls, nothing highlights, nothing appears to happen.

Every "keep learning" affordance outside `/dashboard/program` points back at `/dashboard`:

| Component | Line | Label | Destination |
|---|---|---|---|
| `LearningHubEnrolledCourses.tsx` | 137-139 | "Open Training page" | `/dashboard` |
| `dashboard/learning/page.tsx` | 203 | "Continue Learning" / "Start Learning" | `/dashboard` |
| `dashboard/learning/page.tsx` | 444 | ▶ (desktop primary) | `/dashboard` |

### The default dashboard has no guidance engine at all

`loadMemberDashboardHome.ts:465-474` selects `nextBestActions: { where: { status: 'PENDING' }, … }` — the **persisted `MemberNextBestAction` table**. `shapeHome` (line 369-381) derives both `doThisNext` and `nextLesson` from `args.row.nextBestActions[0]`. Only two places in the entire codebase write that table: `lib/workflows/careerOS.ts:134` (`handleLearningCompletion`) and `:250` (`handleProgramCompletion`), both reached only from `lib/member/courseCompletion.ts:271, 276` — i.e. **after a course or program completion.**

Verified end to end: a member who has completed nothing has zero rows → `doThisNext = null` → `MemberDoThisNextCard` renders nothing (`MemberHomeKit.tsx:634-636`, comment: *"Renders nothing when there's no pending action"*) → `nextLesson` is `undefined` → the lede falls back to "Pick up your program, jobs, or Career Studio." (`MemberHomeKit.tsx:597`) → the certification card reads "No next module on file." (`MemberHomeKit.tsx:672`) → below it, four stat tiles showing 0%, 0 jobs, 0 certs, 0 points. **The guidance system fires only for members who no longer need guidance.**

### The pathway built to need no enrolment can only be reached by members who have one (§2.5)

`shared/digitalLiteracyPathway.ts:263-275` emits ten courses with `kind: 'workforceap'` and real DigitalLearn lesson arrays. The module route is explicitly ungated (`app/(portal)/dashboard/learning/modules/[courseSlug]/page.tsx:59-61` — *"Digital literacy is ungated: any signed-in member may open its modules without a program enrolment"*) and the completion API is ungated (`app/api/member/courses/complete/route.ts:34-36`). But the *only* navigational link to that route in the whole app is `app/(portal)/dashboard/program/page.tsx:246`, inside a block requiring `enrolledSlug` — behind the WIOA gate. (`lib/content/courseDelivery.ts:10` has the helper; its only non-test caller is `components/portal/TrainingCourseList.tsx:492`, also enrolment-only.)

For members who do get in: `MemberProgramKit` renders modules as done / active / **locked** (`dashboard/program/page.tsx:204-215`) and `MemberProgramKit.tsx:259-283` makes only the single *active* module clickable; a completed one is unclickable. Ten independent, self-paced pages with no prerequisites are presented as a locked sequence, and you cannot revisit Email Basics. The `modules` array passed to that kit carries only `launchHref` (Coursera), never the `moduleHref` the sibling `destinations` array carries (line 244-250). Digital-literacy courses have no `courseraCourseId`, so `launchHref` is `undefined` → `MemberProgramKit.tsx:229-230` falls back to `` `${resumeHref}#course-${m.slug}` `` = `/dashboard/learning#course-…`, which lands on the hidden element above.

### Three staff approvals stand between signup and a first lesson, and the member sees none of them (§2.7)

1. `wioaReviewStatus === 'verified'`, set only by `/api/admin/members/[id]/wioa-review` → gates program enrolment.
2. `courseraEnrollmentApproved === true`, set only by the admin member page toggle or `app/api/admin/program-change-requests/[id]/route.ts:102` → gates the "Enroll in this course" button (`TrainingCourseList.tsx:505-547`; server-enforced at `app/api/member/coursera/enroll-in-course/route.ts:114`).
3. Coursera invite email acceptance — an out-of-band round trip (`TrainingCourseList.tsx:330-350`).

No member-visible surface anywhere says "you are at step 2 of 3." The locked copy reads *"Enrollment locked — your counselor will enable this when funding is confirmed"* — naming, for a self-serve member, a person who does not exist. And `assessment/page.tsx:63` promises *"35 questions. Then Coursera courses unlock."*; Coursera unlocks on `courseraEnrollmentApproved`, which submission does not touch (`app/api/member/assessment/submit/route.ts:97-99` sets `assessmentCompleted` only). **The one prompt a state-C member might find makes a promise the system does not keep.**

### A signed-in applicant has no status surface at all (§2.8)

`app/apply/status/page.tsx:22` is `if (user) redirect('/dashboard');`. The default dashboard says nothing about the application. So a logged-in `PENDING` applicant can see their status nowhere.

### Inverted state guards and hardcoded stubs (§2.2)

`deriveStateLetter` (`lib/member/getMemberState.ts:233-243`): `A` = no application · `B` = no program · `C` = program but **no** assessment · `D` = assessment done. So `state === 'C'` **implies** `assessmentCompleted === false`, and `state === 'B'` **implies** `enrolledProgram === null`. Three sites get this backwards:

1. `lib/member/nextBestActions.ts:87-111` — the only `skills_assessment` prompt is gated on `state === 'B'`, i.e. offered only to people who have **not** chosen a program.
2. `lib/member/nextBestActions.ts:113-129` — `continue_training` requires `state === 'C' && ctx.assessmentCompleted`. **Unreachable.**
3. `lib/member/firstValueActions.ts:64-73` — `fv_preassessment` requires `state === 'B' && ctx.enrolledProgram`. **Also unreachable.**

Two stubs never got wired: `getMemberState.ts:377-378` hardcodes `starterProfileReviewRequired: false` / `starterProfileMissingFields: []`, so `review_starter_profile` (`nextBestActions.ts:88-99`) is dead code; `getMemberState.ts:386` hardcodes `courseEnrollmentActive: false`, so `path_to_cert` (`nextBestActions.ts:70-85`) fires for **every** state-D member forever, including ones already training. All of it is moot on the default dashboard anyway.

### Smaller, verified (§2.11)

- `/dashboard/assessment` vs `/dashboard/skills-assessment` vs `/dashboard/assessments` — three URLs, two bare `redirect()` shims (`skills-assessment/page.tsx:16`), one page.
- "Preassessment" / "Training Preassessment" / "Skills check" / "Skills Assessment" name the same thing on the same page (`assessment/page.tsx:15` `PAGE_TITLE = 'Skills check'` vs the `kicker="Preassessment"` two lines below vs `nextBestActions.ts:103` "Training Preassessment").
- `TrainingCourseList.tsx:492` labels a DigitalLearn reading list **"Open lab instructions"** — wrong register entirely for a member whose barrier is that they have never used a computer.
- `getMemberState.ts:358-361` — a member with an application and nothing else is shown 25% first-cert progress "as a nudge." Manufactured progress.

### The banner Mike is seeing — NOT REPRODUCED (unconfirmed)

No portal-wide banner matches the description in this tree. `UnreviewedLocaleBanner` fires only for fr/pt; `StaffViewBanner` only for staff viewers. The likeliest candidates are the `WIOA_PENDING` alert box (`ProgramPicker.tsx:76-134`) or the "Your Coursera progress is saved" card (`dashboard/program/page.tsx:222-227`), both of which render mid-page. **This needs a browser session on his logged-in account rather than a guess** — a screenshot settles it in one message.

---

## 3. Enhancements, ordered by effect on completion and placement

Sizes are estimated from the traced diff surface, not from a scoped ticket. Everything in Tier 1 is under a day in total; Tier 2 is about a week. I would not start Tier 3 until the funnel shows a member reaching a lesson.

### Tier 1 — cheap, unblocks a member today (ship this week · < 1 day total)

**E1 — Exempt non-WIOA programs from the WIOA gate.** *~10 lines.*
At `app/api/member/enroll/route.ts:80`, read `programView.static?.fundingSource` — already loaded at line 51, already `'Grant'` for digital literacy at `lib/content/programs.ts:391` (`mkProgram`'s 13th parameter is `fundingSource: string = 'WIOA'`, `lib/content/programs.ts:280`, surfaced on the `Program` type at line 129) — and skip `isMemberWioaVerified` when it is not `'WIOA'`.
**Unblocks:** the only self-serve on-ramp in the product, for exactly the members with the lowest digital confidence. Two routes already special-case this program; this makes three.

**E2 — Point "Resume module" at something that renders.** *~5 lines + 1 test assertion.*
`lib/member/loadMemberDashboardHome.ts:369` → `/dashboard/program` (which does render modules) or `/dashboard/learning`. Delete `/dashboard/training` or make it redirect to `/dashboard/program`. **Must also update `lib/member/loadMemberDashboardHome.test.ts:200`.** Same pass: retarget `LearningHubEnrolledCourses.tsx:137` and `dashboard/learning/page.tsx:203, 444`, all three of which currently point at `/dashboard`.
**Unblocks:** the loop Mike reported, directly.

**E3 — Render the learning-hub course list once.** *~1 line of JSX motion.*
Hoist `LearningHubEnrolledCourses` out of the two responsive blocks in `app/(portal)/dashboard/learning/page.tsx` (lines 168 and 354) and let CSS handle the variant, or drop the `variant` prop. Kills the duplicate `id="course-…"`.
**Unblocks:** every module-level deep link in the product.

**E4 — Notify *someone* when an unassigned member sends a message.** *~20 lines.*
Add the `else` branch at `app/api/member/messages/route.ts:100` — notify org admins and/or send the staff email. The admin-id resolution already exists verbatim at `app/api/cron/onboarding-stalls/route.ts:105-123`.
**Unblocks:** every other dead end's escape hatch. Nothing else in this report matters if the fallback channel is silent.

**E5 — Fix the three inverted state guards.** *~6 lines.*
`nextBestActions.ts:87` → fire `skills_assessment` on `state === 'B' || state === 'C'`. Drop the contradictory conjunct at `nextBestActions.ts:113` and `firstValueActions.ts:64`. While in there, wire the hardcoded stubs at `getMemberState.ts:377` and `:386` or delete the branches they starve.
**Caveat:** worth little until E6 lands, because none of it runs on the default dashboard.

### Tier 2 — the real fix (days, not hours · ~1 week)

**E6 — Give the default dashboard a guidance engine.** *~1 day.*
At `lib/member/loadMemberDashboardHome.ts:369-381`, when `row.nextBestActions` is empty, fall back to `buildNextBestActions()` over fields the loader **already selects** (`enrolledProgram`, `courseEnrollments`, `courseProgress`, `_count.jobApplications`) plus `assessmentCompleted` — one extra column, not one extra query. Cost to the 2-op Prisma budget: zero. The persisted `MemberNextBestAction` table is written from only two places, both reached only after a course or program completion (`lib/workflows/careerOS.ts:134, :250` via `lib/member/courseCompletion.ts:271, 276`).
**Unblocks:** the whole heuristic library that is already written, tested and dark. Evidence it matters: `MemberDoThisNextCard` renders nothing for every member who has not completed a course, which today is nearly all of them (1 member with learning progress at last count — `CEO-REVIEW-2026-06-10` §2).

**E7 — Tell the member where they are in the approval chain.** *~1 day.*
One card on the default dashboard driven by `wioaReviewStatus`, `courseraEnrollmentApproved` and `Application.status`, with the submitted date and a plain what-happens-next / who-is-doing-it / how-long-it-has-been. Kill the unconditional "typically completed within a few business days" at `ProgramPicker.tsx:103`. Also drop the `if (user) redirect('/dashboard')` at `app/apply/status/page.tsx:22`, or reproduce that page inside the portal.
**Unblocks:** the silent wait. With 0 approvals ever recorded, that sentence is the most damaging string in the codebase after the "87% placement rate" fallback.

**E8 — Nudge the member, not just the admin, on a stall.** *~half a day.*
`app/api/cron/onboarding-stalls/route.ts` already computes the three stall buckets and emails admins only (lines 41-43). Add a member-side send; the templates exist (`emails/member-stuck.ts`, `emails/member-check-in.ts`, `emails/applicant-followup.ts` — see `NOTIFICATION-AUDIT.md`).
**Blocked by:** fix or set `COUNSELOR_BOOKING_URL` first (Batch D), or you send stalled members to a 404.

**E9 — Unlock the digital-literacy module list.** *~half a day.*
(a) At `app/(portal)/dashboard/program/page.tsx:204-215`, for `kind === 'workforceap'` programs give every module `state: 'active'` and a `moduleHref` — the `destinations` array five lines below already computes that exact URL. Sequential locking is meaningless for ten independent DigitalLearn pages. (b) Add an ungated entry point: a "Start digital basics, no application needed" card on `/dashboard` or `/dashboard/learning` linking straight to `/dashboard/learning/modules/digital-literacy-empowerment-class-course-1?program=digital-literacy-empowerment-class`.
**Unblocks:** ten DigitalLearn pages that exist, are gate-exempt, have a working completion API, and are reachable by URL and nothing else.

### Tier 3 — after the above is proven (hold until a member reaches a lesson)

**E10 — Auto-assign a counselor, or a named staff fallback, at signup.** *~2 days.*
`assignMemberCounselor` (`lib/counselor/assignment.ts:8`) is already transaction-safe and handles lock, dedupe and thread upsert. It needs a selection policy — which is **Q3 below**, not an engineering call.
**Unblocks:** makes E4 unnecessary and makes every "your counselor" string in the product honest.

**E11 — Dashboard information hierarchy.** *~3 days.*
Still true of the kit dashboard: four zero-valued stat tiles, a points ledger, a badge ring and a weekly-activity chart above anything resembling an instruction. But worth **much** less than E6 — a well-organised page with nothing to say is still a page with nothing to say.
**Sequence:** do E6, watch what it surfaces, then re-look.

---

## 4. Quality of life, batched to ship together

Four batches, one PR each. None of these unblocks a member on their own; all of them make the product stop contradicting itself.

### Batch A — naming & copy (mostly `messages/en.json` + a few literals)

- **One name for the preassessment.** "Training Preassessment" / "Skills check" / "Skills Assessment" all name the same thing, two of them on the same page. Pick one and use it in `assessment/page.tsx:15` and the `kicker` at `:57`, `nextBestActions.ts:103`, `LearningHubEnrolledCourses.tsx:192-195`, `memberApplicationStatus.ts:16, 70, 120`.
- `assessment/page.tsx:63` — "35 questions. Then Coursera courses unlock" is false. Say what it actually does.
- `TrainingCourseList.tsx:492` — "Open lab instructions" → "Open the lessons." Wrong register entirely for a member whose barrier is that they have never used a computer.
- `LearningHubEnrolledCourses.tsx:138` — "Open Training page" does not go to a training page.
- The hardcoded-English list in `MEMBER_ICP_AUDIT_REPORT.md` (dashboard "Priority Action", "Active program", "How to earn points") is from 2026-05-17 against a dashboard since replaced by the kit. **Re-audit before quoting it.**

### Batch B — dead & misleading UI

- `getMemberState.ts:386` — `courseEnrollmentActive: false` hardcoded, so `path_to_cert` shows to every state-D member forever, including ones already training.
- `getMemberState.ts:377` — `starterProfileReviewRequired: false` hardcoded, so `review_starter_profile` is dead code.
- `getMemberState.ts:358-361` — a member who has done nothing but apply is shown 25% first-cert progress "as a nudge." Manufactured progress, same trust category as the "87% placement rate" fallback.
- `MemberProgramKit.tsx:265-283` — a completed module is unclickable; members cannot revisit finished lessons.

### Batch C — navigation

- Collapse `/dashboard/assessment` · `/dashboard/skills-assessment` · `/dashboard/assessments` — three URLs, two bare `redirect()` shims, one page — to one canonical URL with redirects, and update every internal link to it.
- Decide `/dashboard/training`'s fate as part of E2, rather than leaving a redirect that loops.
- `docs/MEMBER-PAGES-AUDIT.md` §2's H1/NAV finding codes are current (2026-08-29) and are a ready-made checklist for this batch.

### Batch D — config hygiene

- **Set or remove `COUNSELOR_BOOKING_URL`**, and add it to `.env.example` either way. `emails/member-stuck.ts:9-10` and `lib/email.ts:2740-2742` fall back to `https://www.workforceap.org/counselor/book-15`, and `book-15` matches nothing in `app/`, `marketing/`, `public/` or the `next.config.ts` rewrites. That is the "Book 15 minutes" button in the highest-intent email WorkforceAP sends — the one going to a member flagged red/stalled by `lib/cron/at-risk-alerts.ts:220`. **(Inferred** — production env was not visible to this trace; `vercel env ls` settles it in 60 seconds.**)**
- `lib/coursera/b4bClient.ts:219` `DEFAULT_ORG_ID` fallback — still open as F-3 from `docs/COURSERA-ENROLL-AUDIT-2026-09-02.md`, and the self-test at `app/api/admin/coursera/self-test/route.ts:34` duplicates the same guess, so the check cannot catch it.

---

## 5. What not to do, and why

Each of these has been proposed in a document still sitting in the repo. Each one is a way to spend a month without moving a member closer to a lesson.

**Do not build the 7-star roadmap.** `CEO-ANALYSIS-3-7-10-STAR.md` asks for gamification, streaks, badges, predictive at-risk analytics and a mobile app. Four of the five are **already built** — `memberPoints`, `currentStreak`/`longestStreak`, `deriveNextBadge`, `lib/member/atRiskScoring.ts`, `lib/cron/at-risk-alerts.ts` — and they render today on a dashboard that cannot tell a member where the lessons are. `CEO-REVIEW-2026-06-10` §6 already said this ("optimizes retention of members who can't get approved") and the trace confirms it. Adding engagement mechanics to a broken funnel manufactures a number that looks like progress.

**Do not build a mobile app or a PWA.** `MOBILE_AUDIT.md` is a record of fixes *already applied*: 44px touch targets, safe-area insets, iOS-zoom prevention, `inputMode`/`autoComplete` throughout, responsive form grids. Mobile web is not the constraint. The constraint is that desktop *and* mobile both loop back to the dashboard.

**Do not do a dashboard redesign yet (E11).** `MEMBER_ICP_AUDIT_REPORT.md` and `CEO-REVIEW-2026-06-10` §5.1 both asked for it, and both were looking at the pre-kit dashboard. The kit dashboard is already substantially leaner. Reorganising a page that has nothing to say produces a tidier page with nothing to say. Do E6, watch what it surfaces, then decide.

**Do not build more AI tools.** 22 routes already live under `/dashboard/ai-tools/`, and `AI-TOOLS-BACKLOG.md` declares the backlog complete. The tools are not the bottleneck; reaching lesson one is.

**Do not fold in the `PlacementRecord` 1:N refactor, the Stripe cash register, or tenant isolation.** All three are real findings from `CEO-REVIEW-2026-06-09`. None of them is why a member cannot find digital literacy training, and the 1:N refactor alone "touches 15+ files." Different workstream.

**Do not turn on paid acquisition.** Both CEO reviews said no ad spend until telemetry, and the funnel reason is stronger than the telemetry one: new applicants would join a queue that has approved zero people in six months.

---

## 6. Seven decisions that need Mike, not an engineer

Each one blocks or shapes work above, and an engineer cannot pick correctly alone.

**Q1. Should digital literacy be self-serve end to end — can a signed-in person start Module 1 with no application, no screening and no counselor?**
The product already answers **yes** in two routes (`learning/modules/[courseSlug]/page.tsx:61`, `api/member/courses/complete:36`) and **no** in a third (the enrol route). `docs/DIGITAL-LITERACY-COURSE.md` reads as though the answer is yes. If yes, E1 and E9's ungated entry point follow automatically. If no, say what the minimum is — because today the answer in practice is "an admin approval that has never once been granted."

**Q2. Should the WIOA screening ever auto-advance, or must a human always sign?**
`computeWioaSignal` (`lib/wioa/wioaQualification.ts`) already produces a signal and reasons; `POST /api/member/wioa-qualification:63` throws them away and writes `'pending'` unconditionally. Whether a strong signal may auto-set `'verified'` is a **compliance** decision, not an engineering one. It is also the difference between a 5-minute funnel and a 40-day one.

**Q3. Who is the counselor of record for a self-serve member?**
E10 needs a policy: round-robin across active counselors, a single named fallback account, or an explicit unassigned queue that someone owns. `assignMemberCounselor` has exactly three callers, all admin or counselor routes, plus the partner-referral path (`lib/counselor/ambassadorAutoAssign.ts`). Without an answer, E4 (notify admins) is the only honest option, and every "your counselor" string in the product stays a small lie.

**Q4. What does the "few business days" promise commit WorkforceAP to?**
`ProgramPicker.tsx:103` states a service level the org has never met. Either set a real SLA and instrument it — the stall cron already computes the data at 5 days — or delete the sentence. Leaving it is the same category of risk as the "87% placement rate" fallback: a number the database contradicts.

**Q5. Is the preassessment a prerequisite or a placement tool?**
`assessment/page.tsx:63` promises it unlocks Coursera; `courseraEnrollmentApproved` actually does. Either wire submission to advance the member — and the copy becomes true — or change the copy. Which one depends on whether the assessment is meant to gate or to inform.

**Q6. Are digital-literacy modules sequential?**
`MemberProgramKit` locks all but the next one. The ten DigitalLearn pages have no prerequisites and `docs/DIGITAL-LITERACY-COURSE.md` calls the pathway self-paced. The locking is a pedagogical choice someone made implicitly, by reusing the Coursera kit.

**Q7. Two dashboards, indefinitely?**
The `?ui=legacy` path carries the application-journey strip, the first-value panel and the full next-best-action engine. Either the default absorbs them (E6) or legacy gets deleted. Keeping both means every guidance fix has to be made twice — and in practice it gets made only in the copy nobody sees.

---

## 7. Which of the repo's own audit documents are still worth reading

**Only the two September documents are worth acting on directly.** Everything from May and June describes a product that has since changed underneath it. This table exists so you stop re-reading the stale ones.

| Document | Last touched | Verdict |
|---|---|---|
| `docs/COURSERA-ENROLL-AUDIT-2026-09-02.md` | 2026-09-02 | **Current · read this.** The single most useful doc in the repo. F-1 fixed (PR #2229), F-2 partially remediated 2026-09-04, F-3/F-4/F-5/F-6 still open. F-3 (`lib/coursera/b4bClient.ts` `DEFAULT_ORG_ID` fallback) re-verified as still standing. |
| `docs/DIGITAL-LITERACY-COURSE.md` | added 9/3/26, links re-verified 9/12/26 | **Current.** Accurately describes `shared/digitalLiteracyPathway.ts`. But its stated intent — free, self-paced, no provider account, return and mark the module complete — is **not what the product does**. That gap is the whole Mike-Sr. bug. |
| `docs/MEMBER-PAGES-AUDIT.md` | 2026-08-29 | **Current.** Good for route inventory and the H1/NAV/TOK finding codes. Direct input for Batch C. |
| `TODOS.md` | 2026-09-04 | **Current, wrong genre.** A closed-ticket log for security and audit hygiene (`withApiGuc`, dual audit trails). Almost nothing about the member journey. Do not mine it for product ideas. |
| `NOTIFICATION-AUDIT.md` | 2026-07-01 | **Current as an inventory.** Impressively complete — which makes the counselor finding worse, not better. The templates exist and are not reaching the member. |
| `PLAN-2026-Q3.md` | authored 2026-05-18, edited 2026-08-28 | **Half-stale.** §4.2 #5 "no first-action on dashboard" still true; the login-funnel item is partly closed now that `users.last_login_at` is written (`app/api/auth/login/route.ts:275`, `app/auth/callback/route.ts:78`). §4.3 "State C standstill" is right for the wrong reason. §5 moats are vision, not next-quarter work. |
| `CEO-REVIEW-2026-06-10.md` | 2026-06-10 | **Stale on facts, right on judgement.** Stale: `last_login_at` now written; `JobApplication` now has `OFFER`/`REJECTED`/`PHONE_SCREEN` and interview reminder crons (`prisma/schema.prisma:476-517`), so "no interview/offer signal flows back" is fixed. Still the point: *"the platform is over-built and under-operated."* The 53-pending / 0-approved queue is the direct cause of what Mike's father hit. |
| `CEO-REVIEW-2026-06-09.md` | 2026-06-10 | **Stale on the member half.** Placement audit-trail and survey resubmission shipped. Revenue and billing findings not re-verified — out of scope for this trace. |
| `MEMBER_ICP_AUDIT_REPORT.md` | 2026-05-17 | **Stale in specifics, best framing doc in the repo.** It is a *copy* audit and never opened the dashboard's data path, so it missed everything in the journey section above. Its #1 recommendation (i18n `ApplyEligibilityClient`) was not re-verified. Do not re-issue its recommendations as new. |
| `CEO-ANALYSIS-3-7-10-STAR.md` | 2026-05-17 | **Stale and actively misleading.** Recommends the 7-star build: gamification, streaks, mobile app, predictive analytics. Already rebutted by `CEO-REVIEW-2026-06-10` §6, and the trace confirms the rebuttal — the machinery it asks for is already built and rendering next to a dashboard that cannot tell a member what to do. |
| `MOBILE_AUDIT.md` · `QA-AUDIT-REPORT-2026-05-12.md` · `AUDIT-2026-05-16.md` · `AI-TOOLS-BACKLOG.md` · `DESIGN.md` · `WORKING.md` · `.portal-audit/*` | 2026-05-17 – 2026-05-25 | **Stale.** `MOBILE_AUDIT.md` is a changelog of fixes already applied, not an open list. `AI-TOOLS-BACKLOG.md` declares itself complete. `WORKING.md`'s migration guardrails are still live but are not member work. |

### How much to trust each part of this

| | |
|---|---|
| **Verified in code** | Every file-and-line citation in this brief, and each dead end in the journey section, read directly against `5fef7932`. |
| **From the repo's own docs** | The production funnel numbers — 53 pending, 0 approved ever, median queue age 40 days, 1 member with learning progress — come from `CEO-REVIEW-2026-06-10` (dated 2026-06-10) and were **not re-queried today**. Treat the counts as three months old; the structural conclusion holds regardless. |
| **Inferred, unconfirmed** | `COUNSELOR_BOOKING_URL` may be set in production env, which this trace cannot see. Whether any admin is actually watching `/admin/messages` is likewise unconfirmed. Both are 60-second checks. |
| **Not reproduced** | The banner across the middle of the page. No portal-wide banner in the tree matches; candidates are noted in section 2. Needs a browser session on Mike's account. |
| **Not re-verified** | The i18n and Spanish-parity findings in `MEMBER_ICP_AUDIT_REPORT.md` (2026-05-17, pre-kit), and the billing and tenant findings in `CEO-REVIEW-2026-06-09`. |

---

*Read-only trace of `/home/claude/workforceap-beta` @ `5fef7932` · 2026-09-18 · no code changed. PRs #2277, #2325 and #2326 are not in this tree, so every trace above is against the code as it stands today.*
