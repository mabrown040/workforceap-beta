# Coursera Progress Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Coursera learner — linked WAP member or unmatched Coursera identity — has truthful course-level progress in WorkforceAP, visible on admin/counselor surfaces with a kit badge, without requiring an identity mapping first.

**Architecture:** Coursera B4B `enrollmentReports` (`overallProgress`, `isCompleted`) is the progress source of truth. xAPI is the event stream (activity, item-level, completion side-effects). Unmatched learners stay first-class rows keyed by Coursera email, stored in `coursera_course_progress` (`user_id` already nullable), badged `Unmatched` — not fake `users` rows. Linked members write the same numbers into canonical `course_progress` under the WAP program slug. Mapping an email later is an attach, not a prerequisite for tracking.

**Tech Stack:** Next.js 15 App Router, Prisma/`course_progress` + `coursera_course_progress`, Coursera B4B REST (`lib/coursera/b4bClient.ts`, `b4bSync.ts`), xAPI ingest (`lib/xapi/inboundStatementPipeline.ts`), portal kit `StatusTag` / Astryx `Token` (`inWap` already exists on training + students kits).

## Global Constraints

- **Unmatched is not a defect.** Do not block progress writes on `resolveUserIdByCourseraEmail` returning a user. Mapping is optional attach.
- **No shadow `users` rows** for unmatched Coursera emails. Fake members would leak into WIOA / `MEMBER_ONLY_WHERE` / auth. Progress lives on `coursera_course_progress` until a real user is linked.
- **Do not imply completion before Coursera says complete.** Product stake (`docs/PRODUCT_STAKES.md`): 93% stays `IN_PROGRESS`. Only `isCompleted === true` (B4B) or a course-level xAPI completion verb marks `COMPLETED`. Never promote on a percent threshold.
- **Never demote COMPLETED.** Existing ladder in `computeCourseProgressUpdate` stays: status only moves `NOT_STARTED → IN_PROGRESS → COMPLETED`; `percentComplete` is max; `lastActivityAt` is the later timestamp.
- **Canonical WAP program slug on every write.** `comptia-a-plus` must be stored as `comptia-a-professional-certificate` (see `PROGRAM_SLUG_ALIASES` in `lib/content/programs.ts`). Reads that join enrollment slug to progress slug must use the same helper.
- **Item-level xAPI `completed` is not a course completion.** Keep `isXapiCompletionVerb` excluding `activityType === 'item'`.
- **Test/smoke actors stay hidden** (`isLikelyTestAccount`) on admin rosters. They are not first-class learners.
- **Funder / WIOA totals** (`MEMBER_ONLY_WHERE`) never include unmatched Coursera identities or unmatched progress rows.
- **Kit badge:** unmatched → Astryx `Token` / kit `StatusTag` tone `alert` (needs a look), label **Unmatched**. Linked member with progress but no `CourseEnrollment` / `enrolledProgram` → tone `warn`, label **No program**. Do not invent a third status vocabulary (`docs/KIT_GUIDE.md` §4). Existing copy **"Not in WAP"** on `TrainingProgressKit` / `StudentsRosterKit` becomes **Unmatched**.
- **Portal kit tokens only** (`--wa-*`). No raw hex. Dense admin surface.
- **Dashboard progress semantics** stake: member-facing copy stays truthful (`in progress`, not “complete” at 93%).

---

## Why this plan exists (prod snapshot 2026-08-29)

Queried production Supabase `jqddnyuszufndwwezdwp`:

| Fact | Number |
|---|---|
| `course_progress` COMPLETED | 6 rows / 2 users |
| Those 2 users' `enrolled_program` | **null**, no `course_enrollments` |
| `member_events.course_completed` | 1 |
| Course-complete notifications | 0 |
| B4B cron | `scanned: 35`, `upserted: 31` (17 known / **14 unknown**), `skippedNoUser: 4` |
| Canonical seed unmatched contents | 35 |
| xAPI `unmatched` events | 4209 (≈4134 test; 3 real emails still firing) |
| Skillset cron | permanent `{ skipped: "no_skillsets_configured" }` |

The API is up. Completions exist. Joins drop them. Unmatched emails are a **display class**, not the reason progress is wrong.

---

## Learner states (first-class)

Every admin/counselor training row is one of:

| State | Identity | Progress store | Badge | Member portal |
|---|---|---|---|---|
| **Linked + enrolled** | `users` + `course_enrollments` (or `enrolledProgram`) | `course_progress` keyed by `(userId, canonicalProgramSlug, courseSlug)` | none / in-WAP | full dashboard |
| **Linked + no program** | `users`, Coursera identity resolved, **no** enrollment | `course_progress` still written (program inferred from Coursera content mapping) | **No program** (`warn`) | training list from progress rows, not from catalog enrollment |
| **Unmatched** | Coursera email / xAPI actor only | `coursera_course_progress.user_id IS NULL` | **Unmatched** (`alert`) | none (no login) |
| **Test** | `isLikelyTestAccount` | ignored on rosters | hidden | n/a |

Mapping unmatched → linked is `POST /api/admin/coursera/map-unmatched` (already exists): stamp `user_id` on CSV/xAPI rows, insert `coursera_identity_mappings`, **promote** into `course_progress`, drop the Unmatched badge. Progress numbers must already be there before the map.

---

## Source-of-truth ladder

```
B4B enrollmentReports.overallProgress / isCompleted
        │  (authoritative % and COMPLETED)
        ▼
coursera_course_progress     ← always, including unmatched
        │
        ├── user resolved ──► course_progress (canonical slugs)
        └── user null     ──► stay here; admin reads this; badge Unmatched

xAPI statements
        │  (activity, item events, course-level completed side-effects)
        ▼
upsertCourseProgressFromXapiStatement  (linked only, after identity resolve)
completeMemberCourse                   (side-effects: emails/points; skip if no program)
coursera_xapi_events                   (audit; unmatched is a status, not a drop)
```

Rules:

1. **B4B wins % and `isCompleted`.** xAPI must not overwrite a higher B4B percent downward; B4B must not demote xAPI `COMPLETED`.
2. **Org-wide cron currently skips unmatched** (`skippedNoUser`). That is the hole. Unmatched must still upsert `coursera_course_progress`.
3. **Org-wide cron currently writes `course_progress` only when a user exists**, and uses discovered/slugify slugs (`comptia-a-plus`, program names as `course_slug`). Writes must go through `canonicalizeProgramSlug` + canonical course mapping; unknown content still stores on `coursera_course_progress` with raw Coursera ids, **not** as fake curriculum slugs on `course_progress`.
4. **Member UI** (`loadMemberProgramTrainingView`) already prefers B4B when `contentId` maps. Keep that. Fix the slug join so enrolled `comptia-a-professional-certificate` sees progress written under the alias.
5. **`cron_coursera_sync` skillsets** stay a no-op until skillset IDs are configured. Out of scope. Do not confuse skillset % with course %.

---

## File map

| File | Responsibility |
|---|---|
| `lib/content/programSlug.ts` (new) | `canonicalizeProgramSlug()`, export alias table, `programSlugEquals()` for reads |
| `lib/coursera/upsertCourseraCourseProgress.ts` (new) | Single B4B → `coursera_course_progress` upsert (linked or unmatched) |
| `lib/coursera/b4bSync.ts` | Stop dropping unmatched; remap `lastActivity` → `lastActivityAt`; canonicalize slugs; unknown content only to CSV table |
| `lib/coursera/syncUserFromB4B.ts` | Same remap/canonicalize; already maps `lastActivity` correctly — keep as the per-user path |
| `lib/member/courseProgress.ts` | Reads/writes use canonical slug; rollup keys canonical |
| `lib/member/courseCompletion.ts` | Persist progress even with no enrollment; skip notify/graduation if no program |
| `lib/xapi/inboundStatementPipeline.ts` | Unmatched: still persist statement + `coursera_xapi_events`; do not require enrollment to keep audit; linked + no program: still upsert `course_progress` |
| `lib/member/memberProgramTrainingView.ts` | Join progress by canonical slug; if no enrollment, build view from `course_progress` rows |
| `lib/admin/trainingDashboard.ts` | Include linked-no-program; never require `enrolledProgram IS NOT NULL` to show % |
| `app/admin/training-progress/page.tsx` | Unmatched rows: real `modulesDone` / pace from `coursera_course_progress`; rename badge |
| `app/admin/students/page.tsx` | Same unmatched % + badge rename |
| `components/portal/kit/pages/admin-subviews/TrainingProgressKit.tsx` | Token label `Unmatched`; optional `No program` |
| `components/portal/kit/pages/admin-subviews/StudentsRosterKit.tsx` | Same |
| `lib/coursera/progressQueries.ts` | `loadUnmatchedLearners` must include B4B-backed `coursera_course_progress` rows (not only CSV/xAPI union as today) |
| Tests | `lib/content/programSlug.test.ts`, `lib/coursera/b4bSync.test.ts` unmatched path, `courseCompletion` no-enrollment persist |

Do **not** mix Astryx primitives inside kit components. Roster tokens already use Astryx `Token` on those kit pages — keep that existing pattern; do not add Astryx inside `components/portal/kit/**` primitives.

---

## Considerations checklist (everything that has to stay true)

### Identity

- [ ] Coursera key is lowercase email (`externalId` / `actor.mbox`). Actor `account.name` without email still lands in `coursera_xapi_events`; progress % still needs B4B email to attach.
- [ ] `coursera_identity_mappings` is attach-only. Auto-heal matching 0/82 forever is acceptable if unmatched rows already show B4B %.
- [ ] Three live unmatched prod emails (`godfavorsme099@`, `akinje.twins@`, `toukervang@`) become roster rows with progress once B4B stops skipping them — **if** they appear in `enrollmentReports`. If they only emit xAPI, show activity + unmatched badge with % unknown until B4B has a row.
- [ ] Linking later: existing map-unmatched must promote `coursera_course_progress` → `course_progress` via `upsertMergedCourseProgress` / `computeCourseProgressUpdate` (never a blind overwrite).

### Progress semantics

- [ ] Course-level only in member “X of Y complete”. Item-level xAPI updates `IN_PROGRESS` / last activity, not `percentComplete` (already guarded in `upsertCourseProgressFromXapiStatement`).
- [ ] B4B `overallProgress` rounds to 0 on early activity — keep `lastActivityAt` promotion to `IN_PROGRESS` (already in `computeCourseProgressUpdate`). Org-wide cron must actually pass `lastActivity` (API field name), not `lastActivityAt`.
- [ ] Grades (`score_scaled`, gradebook) are optional overlay, not the completion bit.
- [ ] CSV import remains a manual backfill, not the live path (prod has 3 rows).

### Enrollment vs progress

- [ ] **Enrollment** (`course_enrollments` / `enrolledProgram`) gates member catalog + seat approval (`courseraEnrollmentApproved`). It must **not** gate persistence of observed Coursera progress.
- [ ] `completeMemberCourse` today throws `No program enrolled` (7 prod xAPI errors). Split: (a) write/upsert progress from Coursera course id → canonical mapping without enrollment; (b) emails/points/graduation only when an enrolled program exists.
- [ ] Org-wide `b4bSync` must not invent `CourseEnrollment` for unmatched people (that would be a paid-seat / WIOA lie).
- [ ] Linked + no program: infer display program from the canonical mapping of the most-recent / highest-progress course. Badge **No program** until staff enrolls them.

### Slugs and catalog

- [ ] Export `canonicalizeProgramSlug(raw: string): string` from a dedicated module wrapping `PROGRAM_SLUG_ALIASES` (today the map is **private** in `programs.ts`).
- [ ] Also canonicalize **course** ids via `coursera_canonical_course_mappings` (251 prod rows; seed still reports 35 unmatched contents). Unmatched contents: store Coursera `contentId` + name on `coursera_course_progress` only; do not slugify program titles into `course_progress.course_slug` (current 0% `comptia-a-plus` / `it-support-professional-certificate-ibm` pollution).
- [ ] Reads: `progressByKey.get(`${userId}:${programSlug}:${course.slug}`)` on `/admin/training-progress` must try canonical slug **and** aliases, or normalize keys at write time only (prefer write-time).
- [ ] `DISCOVERED_COURSERA_PROGRAMS` keys (`comptia-a-plus`) vs WAP catalog (`comptia-a-professional-certificate`) — `WAP_PROGRAM_DISCOVERED_ALIASES` already maps for catalog load; **writers** still emit the discovered key. Fix writers.

### Surfaces (who sees what)

| Surface | Linked+enrolled | Linked+no program | Unmatched |
|---|---|---|---|
| `/dashboard`, `/dashboard/program` | B4B % + local fallback, canonical slug | show courses from `course_progress` + No program banner | N/A |
| `/admin/training-progress` | pace row | pace row + No program | row + Unmatched, real % |
| `/admin/students` | existing | include (today skipped if no enroll) | already appended; fix % / label |
| `/admin/coursera/learners/unmatched/[email]` | — | — | keep drill-down; feed from B4B table |
| Counselor / partner | same as admin, MEMBER scoped | same | **exclude** from partner outcome emails; optional counselor “Coursera-only” queue later (not v1) |
| Public impact / WIOA | enrolled members only | enrolled only | **exclude** |

### Crons

- [ ] `cron_coursera_b4b_sync` — primary writer. Must upsert unmatched. Log `upsertedUnmatched` alongside `skippedNoUser` (skipped only when email missing entirely).
- [ ] `cron_coursera_auto_heal` — keep; success is no longer “matched: 0 is failure” if progress already tracked.
- [ ] `cron_coursera_training_sync` / skillset — out of scope.
- [ ] Per-user dashboard auto-sync (`lastCourseraAutoSyncAt`) — still the path that can set `enrolledProgram` when null (`decideEnrolledProgramSync`). Do **not** let org-wide cron overwrite a non-null enrollment (existing rule).

### Side effects

- [ ] Course-complete email / points / `handleProgramCompletion` / milestone cascade: **linked + enrolled only**. Unmatched and no-program persist progress silently (`notify: false`).
- [ ] Do not send “you completed” to an unmatched Gmail we have never onboarded.

### Multi-tenant / RLS

- [ ] `coursera_course_progress.organization_id` must be stamped on unmatched B4B upserts (default org `workforceap` when the email is not yet a user). Do not leave `organization_id` null (those rows vanish from tenant-scoped admin loaders).

### Observability

- [ ] Workflow diagnostic for B4B: `upsertedKnown`, `upsertedUnknown`, `upsertedUnmatched`, `skippedNoEmail`.
- [ ] Do not alert on unmatched identity as P0 if progress is landing.

---

## Recommended approach (locked)

**Keep three stores, one view model** — do not nullable-`course_progress.userId` (Postgres unique would allow duplicate NULL user ids; every member query would need OR-external-email).

```ts
// lib/coursera/learnerProgressView.ts (target shape)
export type LearnerProgressIdentity =
  | { kind: 'user'; userId: string; unmatched: false; noProgram: boolean }
  | { kind: 'coursera'; externalEmail: string; unmatched: true };

export type CourseProgressFact = {
  courseraCourseId: string;
  programSlug: string; // canonical WAP slug when known, else null
  courseSlug: string | null;
  percentComplete: number;
  isCompleted: boolean;
  lastActivityAt: Date | null;
};
```

Admin kits already accept `inWap?: boolean`. Extend with `noProgram?: boolean` rather than a new table UI.

---

### Task 1: Canonical program slug helper (write + read)

**Files:**
- Create: `lib/content/programSlug.ts`
- Create: `lib/content/programSlug.test.ts`
- Modify: `lib/content/programs.ts` — move/re-export `PROGRAM_SLUG_ALIASES` through the helper (keep `getProgramBySlug` behavior)

**Interfaces:**
- Produces: `canonicalizeProgramSlug(raw: string): string` — trim, lower, alias lookup, else return trimmed slug
- Produces: `programSlugsEquivalent(a: string, b: string): boolean` — `canonicalizeProgramSlug(a) === canonicalizeProgramSlug(b)`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeProgramSlug, programSlugsEquivalent } from '@/lib/content/programSlug';

describe('canonicalizeProgramSlug', () => {
  it('maps discovered CompTIA key to WAP catalog slug', () => {
    assert.equal(
      canonicalizeProgramSlug('comptia-a-plus'),
      'comptia-a-professional-certificate',
    );
  });
  it('is idempotent on canonical slugs', () => {
    assert.equal(
      canonicalizeProgramSlug('comptia-a-professional-certificate'),
      'comptia-a-professional-certificate',
    );
  });
  it('treats alias and canonical as equivalent', () => {
    assert.equal(
      programSlugsEquivalent('comptia-a-plus', 'comptia-a-professional-certificate'),
      true,
    );
  });
});
```

- [ ] **Step 2: Run** `node --import tsx --test lib/content/programSlug.test.ts` — expect FAIL (module missing)

- [ ] **Step 3: Implement helper** by lifting `PROGRAM_SLUG_ALIASES` into `programSlug.ts` and having `programs.ts` import it so there is one map

- [ ] **Step 4: Re-run tests** — expect PASS

- [ ] **Step 5: Commit** `feat(coursera): canonicalize program slugs on a single helper`

---

### Task 2: Org-wide B4B sync writes unmatched + remaps lastActivity + stops slug pollution

**Files:**
- Modify: `lib/coursera/b4bSync.ts` (`fetchEnrollmentReports` mapping, main loop around `skippedNoUser`, `computeCourseProgressUpdate` call site)
- Modify: `lib/coursera/b4bSync.test.ts`
- Create: `lib/coursera/upsertCourseraCourseProgress.ts` (Prisma upsert on `@@unique([externalEmail, courseraCourseId])`)

**Interfaces:**
- Consumes: `canonicalizeProgramSlug`, `loadCanonicalMappingsForCourseraIds`, `B4BEnrollmentReport` from `b4bClient.ts` (`lastActivity`, not `lastActivityAt`)
- Produces: `B4BSyncResult` gains `upsertedUnmatched: number`; `skippedNoUser` only when email/externalId empty

Behavior:

1. Normalize API row: `lastActivityAt = report.lastActivity ?? report.lastActivityAt ?? 0` (defensive both names).
2. If no email: `skippedNoUser++`, continue.
3. **Always** upsert `coursera_course_progress` (email, contentId, %, `isCompleted`, org id, `user_id` if resolved).
4. If user resolved **and** canonical mapping hit: `upsertMergedCourseProgress` with **canonical** program/course slugs.
5. If user resolved **and** no mapping: do **not** write `course_progress` with slugify(programName). CSV table is enough until staff maps the course.
6. If user not resolved: stop here (unmatched first-class). Do not create `users`.

- [ ] **Step 1: Extend `b4bSync.test.ts`** with: unmatched email still counted as `upsertedUnmatched` (mock prisma or extract a pure `planB4BRowWrite(report, userId, mapping)` that returns `{ csv: true, canonical: boolean }`)

- [ ] **Step 2: Run existing** `node --import tsx --test lib/coursera/b4bSync.test.ts` plus the new cases

- [ ] **Step 3: Implement loop changes** in `syncCourseraB4BEnrollmentReports`

- [ ] **Step 4: Confirm `lastActivity` fixture** still promotes 0% + activity → `IN_PROGRESS`

- [ ] **Step 5: Commit** `fix(coursera): persist B4B progress for unmatched learners`

---

### Task 3: xAPI + completeMemberCourse persist without enrollment

**Files:**
- Modify: `lib/member/courseCompletion.ts`
- Modify: `lib/xapi/inboundStatementPipeline.ts`
- Modify: `lib/member/courseProgress.ts` (`upsertCourseProgressFromXapiStatement` — if no enrolled program, resolve program from canonical mapping / discovered catalog using `parsed.courseraCourseId` only)

**Interfaces:**
- `completeMemberCourse` still takes `userId`. If no enrollment: upsert `course_progress` via coursera course id mapping, return `{ ok: true, persistedWithoutProgram: true }`, **do not throw**, `notify` forced false.
- Pipeline: unmatched identity unchanged (record `unmatched` event — first-class audit). Linked user: never `error: 'No program enrolled'` for course-level completed.

- [ ] **Step 1: Test** `completeMemberCourse` with a user that has `enrolledProgram: null` but a canonical mapping for the course id — expect a `course_progress` COMPLETED row, no throw

- [ ] **Step 2: Run the test** — FAIL

- [ ] **Step 3: Implement persist-without-program**; keep throw only for `Course not found` when even canonical mapping + discovered catalog miss (true unknown content)

- [ ] **Step 4: Tests pass**

- [ ] **Step 5: Commit** `fix(coursera): persist xAPI completions without WAP enrollment`

---

### Task 4: Member + admin read paths use canonical slugs and unmatched facts

**Files:**
- Modify: `lib/member/memberProgramTrainingView.ts`
- Modify: `lib/member/loadMemberDashboardHome.ts` / `getActiveProgramForDashboard.ts` — if no enrollment but `course_progress` exists, pick canonical program of latest activity as `activeProgramSlug` and set `noProgram: true` for the page banner
- Modify: `app/admin/training-progress/page.tsx` — unmatched: `modulesDone` from completed CSV/B4B rows; `percentComplete` from those rows; `pace` from last activity (not hard-coded `Stalled`); Token **Unmatched**
- Modify: `app/admin/students/page.tsx` — same label; include linked users with null enrollment if they have progress
- Modify: `lib/admin/trainingDashboard.ts` — drop `enrolledProgram: { not: null }` exclusive filter **or** union in progress-only users
- Modify: kit pages label `Not in WAP` → `Unmatched`

**Product copy:** member banner if `noProgram`: “Your Coursera progress is saved. A counselor still needs to enroll you in a WorkforceAP program.” Do not say they completed the program.

- [ ] **Step 1: Unit-test training view** with progress stored as `comptia-a-plus` and enrollment `comptia-a-professional-certificate` — after Task 1+2 writes are canonical this is a backfill; for reads, `programSlugsEquivalent` when matching rows to catalog courses

- [ ] **Step 2: Implement join** in `loadMemberProgramTrainingView` using canonical slug for `bySlug` lookup

- [ ] **Step 3: Manual check** `/admin/training-progress` and `/admin/students` show unmatched % ≠ 0 when `coursera_course_progress` has rows; linked completers with null enrollment appear with **No program**

- [ ] **Step 4: Commit** `fix(coursera): show unmatched and no-program progress on admin rosters`

---

### Task 5: Backfill production slugs + promote existing COMPLETED orphans (data)

**Files:**
- Create: `prisma/migrations/YYYYMMDDHHMMSS_canonicalize_course_progress_program_slugs/migration.sql` (or a one-shot `scripts/canonicalize-course-progress-slugs.ts` if unique collisions need merge-by-max-percent — prefer script + dry-run because `(userId, programSlug, courseSlug)` collisions are likely)

Collision rule: if both `comptia-a-plus` and `comptia-a-professional-certificate` exist for the same user+course, keep the row with higher `percentComplete` / COMPLETED wins, delete the other, then rename remaining alias rows.

- [ ] **Step 1: Dry-run query** on prod-shaped DB counting alias slugs on `course_progress` and `member_program_progress`

- [ ] **Step 2: Script with `--dry-run` / `--apply`**

- [ ] **Step 3: Do not run `--apply` against production from this PR** unless Mike approves; ship script + local `db:push` verification

- [ ] **Step 4: Commit** `chore(coursera): slug canonicalize backfill script`

---

### Task 6: Map-unmatched promote uses the same merge ladder

**Files:**
- Modify: map-unmatched API (`app/api/admin/coursera/map-unmatched/route.ts` and `lib/xapi/reprocess.ts` / CSV promote in `csvImport.server.ts`)

- [ ] **Step 1: On map**, for each `coursera_course_progress` row for that email: `computeCourseProgressUpdate` + `upsertMergedCourseProgress` with canonical slugs; then `refreshMemberProgramProgressRollup`

- [ ] **Step 2: Test** that mapping does not demote an existing COMPLETED local row

- [ ] **Step 3: Commit** `fix(coursera): promote unmatched B4B rows through the merge ladder`

---

## Out of scope (explicit)

- SAML / SCIM / auto-invite (`docs/COURSERA-INVITE-ON-JOIN.md`)
- Skillset cron / `getSkillScoreForLearners`
- Creating WAP accounts or sending mail to unmatched Gmails
- Treating 93% as complete
- Partner weekly digest including unmatched
- Full `app/admin/coursera/page.tsx` split (thermo audit 2026-07-08) — only touch what this progress path needs

## Verification (after implementation)

- Unit: slug helper, B4B unmatched plan, completeMemberCourse without enrollment, merge ladder
- `npm run typecheck` + targeted `node --test` files above
- Prod-shaped SQL: unmatched `coursera_course_progress` count rises after a B4B run; `course_progress` alias slugs trend to 0 after backfill
- Admin UI: training-progress shows Unmatched rows with real %, linked July completers visible with No program
- Member UI (linked): CompTIA enrollment sees CompTIA course % (slug join)
- Stake: no dashboard copy that says complete at < Coursera `isCompleted`

## Approval

- [x] Dashboard progress semantics stake read (`docs/PRODUCT_STAKES.md`)
- [ ] Explicit Mike approval **not** required for code that only persists and displays Coursera facts
- [ ] Explicit Mike approval **required** before production slug backfill `--apply` and before any unmatched learner receives email
