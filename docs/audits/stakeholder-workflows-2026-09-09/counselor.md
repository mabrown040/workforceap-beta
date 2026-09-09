# Counselor workflow audit — 2026-09-09

Scope: source audit of branch `codex/stakeholder-workflows-20260909`, initially based on live `dfd49fa9`. No production data, messages, provider calls, or database changes. Findings below were established from control flow, not a live browser reproduction. AGENTS.md and KIT_GUIDE.md reviewed. Implementation subsequently authorized by root; validation will be appended.

## Existing coverage

- Assigned roster, risk/activity sorting, WIOA screening status, upcoming-session/pending-application filters: `app/(portal)/counselor/students/page.tsx:45` and `components/portal/counselor/CounselorStudentsRosterClient.tsx`.
- Live priority flags, bulk follow-up templates, inbox-zero actions and a dedicated unanswered-message queue already exist. See `lib/counselor/priorityQueue.ts`, `components/portal/counselor/CounselorPriorityQueue.tsx:137`, `lib/counselor/inboxZero.ts`, `lib/counselor/workQueue.ts:8`. A second generic task dashboard would duplicate these capabilities.
- Member profiles show training progress, assessments, WIOA screening, resumes, notes, applications, and member conversations. Session runs and searchable history exist: `components/portal/sessions/SessionsIndexBody.tsx:89` and `SessionRunClient.tsx`. Session history represents completed AI-tool events; it is not a scheduled appointment calendar. Counselor/advisor note records contain text/author/timestamps, not assigned tasks with due dates (`prisma/schema.prisma:1369` and `:1386`). Do not imply a new note schedules a follow-up.
- Contextual inbox selection already validates requested member/thread against authorized rows (`lib/messages/contextSelection.ts:28`). Reuse this boundary.

## Top three blockers

### C1 — Out-of-order loads can show a different recipient from the selected member

Evidence: `components/portal/CounselorMessagesInboxClient.tsx:212` fetches on each member selection without cancellation or request identity. Every completion sets chat/loading. A slow A request can finish after B, while selection and the context sidebar remain B (`:260`, `:463`). The composer endpoint comes from `chat.member.id` (`:401–409`), so a counselor could compose against the stale A thread while the selected context is B. A network rejection also escapes the callback; a non-OK response falls back to the indefinite “Loading thread…” branch (`:389`).

Bounded fix: invalidate prior requests, require response member/thread identity to match the active request, gate rendering on selected identity, key the composer by thread/member, and show an explicit retry state. Keep API authorization unchanged. Regression: deferred A/B responses in both orders, stale rejection after B success, selected B network failure/retry, malformed recipient response, and composer endpoint always equals the selected authorized member.

### C2 — Reply handoffs drop the member being worked

Evidence: `/counselor/queue` emits `?studentId=` (`app/(portal)/counselor/queue/page.tsx:42`), but the inbox reads only `thread` and `memberId` (`app/(portal)/counselor/messages/page.tsx:16–18,46–48`). Mobile profile Message links to the bare inbox (`app/(portal)/counselor/students/[memberId]/page.tsx:548`). The fallback selection picks another needs-reply/unread row or shows the mobile list, adding a search step and risking context confusion. Existing priority queue thread links already use the supported contract (`components/portal/counselor/CounselorPriorityQueue.tsx:395`).

Bounded fix: use the current authorized `memberId`/`thread` contract for all counselor reply entry points. Also remove the wrong-authority secondary-program handoff: profile links at `page.tsx:664,1027` send ordinary counselors to `/admin/training-progress`; that page requires admin scope (`app/admin/training-progress/page.tsx:52–53`). Keep secondary enrollment context on the authorized member page rather than granting admin access. Regression: non-first member links resolve to the same member on desktop/mobile, rejected foreign member/thread stays unselected, and counselor secondary-program links never enter admin routes.

### C3 — Saving a note can silently erase edits made while it is pending

Evidence: both note textareas remain editable during POST, and Cancel remains available. Success unconditionally clears and closes the composer: `CounselorNotesPanel.tsx:45–64,112–146` and `AdvisorSessionNotesPanel.tsx:58–77,124–159`, under `app/(portal)/counselor/students/[memberId]/`. Save A, add B while waiting, and A's success deletes B from the UI. A delayed initial GET can also replace a newly inserted note list.

Bounded fix: snapshot the submitted draft revision; clear only that unchanged revision; keep later edits open and announce saved-versus-unsaved status. Prevent cancellation of a pending operation; make load failures retryable without a page refresh, and do not allow a late initial list response to remove saved notes. Regression both composers: delayed POST plus edit, unchanged success clears once, failed save retains exact draft, pending cancel cannot discard, late initial GET cannot erase the new record.

## One useful time-saver: funding and access handoff on the member profile

The counselor detail already retrieves the member's assignments and WIOA screening, but omits `CourseEnrollment.fundingSource` and `User.courseraEnrollmentApproved` from its projection (`page.tsx:81–121`). These are distinct existing fields (`prisma/schema.prisma:168–176,1819`); WIOA screening is neither a grant award nor provider access approval. The funding-update dispatch already treats primary assignment + missing funding source + false approval as its pending cohort (`app/api/cron/course-accountability/route.ts:28–41,79`).

Add a compact read-only “Funding and training access” section with each actual assignment's recorded funding source, primary/secondary label, and the member-level Coursera approval flag. State “No funding source recorded” when null; never infer denied funding or an award from a program slug/screening result. Describe approval as a recorded access flag, not proof of a working provider account. Give the counselor a clear next step to confirm missing funding/approval with the enrollment team and update the member through the existing contextual message action. No approval control, automatic outreach, new schema, fabricated deadline, or automatic sharing of notes. Unknown/missing enrollment rows remain explicit. Regression: no enrollment, funding missing, source present + unapproved, approved + source missing, multiple/secondary assignments, and assignment-denied page never exposes the summary.

## Verification plan

Run existing counselor contextual-page and message-route authorization tests, plus focused real-component tests with deferred requests for C1/C3 and source-backed handoff projections. After the parent provides an isolated server, verify the chosen member persists through queue → inbox → profile, failed request retry is visible, note edits survive a pending save, funding facts match synthetic fixture records, and the compact section is readable at 375/768/1440 in light/dark. No actual outbound messages or provider enrollments are needed.

## Implemented and verified in the selected scope

- C1: stale fetches are cancelled, response member/thread IDs must match the selected authorized member, old composers are withheld while switching, and load failures show Retry. Conversation state is keyed by recipient/thread. The shared staff composer validates the returned message receipt and preserves newer text entered during a pending successful send.
- C2: work-queue and mobile member-profile links preserve member context. The new funding section offers the same member-specific action. Secondary program titles no longer navigate counselors into the admin-only training roster.
- C3: both note composers snapshot draft revisions, preserve newer edits, prevent cancellation while a save is pending, and protect newly saved notes from late initial list responses. Failed loads retry in place; failed saves retain the draft.
- Funding/access summary: both responsive layouts show actual per-enrollment funding source and primary/secondary identity, plus the separate member-level Coursera permission. Existing staff assignment/org authorization now runs before the detail projection; it does not grant new approval powers.
- Counselor message reads now load the newest 500 records, then display them chronologically with a stable timestamp/ID order. A 503-record regression verifies the newest question remains visible and older records are the ones omitted.
- Counselor and partner cursor-mode clients acknowledge only a message committed to their rendered list; eager realtime acknowledgements are removed in that mode. `lib/messages/readCursor.ts` resolves the submitted ID inside an already-authorized thread and advances the existing read-through timestamp monotonically to that record's database timestamp. Missing/empty cursor is a no-op; foreign cursor is rejected. Read-only audit requests do not provision threads or mutate receipts. Admin/employer clients retain their previous read request contract unless explicitly opted in.

Validation: the final counselor cursor/identity/notes/access run passed **94 tests across 6 suites**; the funding and existing contextual-message suites passed **7 additional tests** in the earlier focused run, and existing curriculum-read checks passed **22 tests**. Focused source/test ESLint and `git diff --check` passed. TypeScript's initial partner and new test mock errors were corrected; the parent owns the final combined typecheck/build. Tests use local synthetic response fixtures; no messages, provider requests, or production writes were performed. Browser proof will be recorded by the parent after the optimized build.

## Explicit remaining limits

- Conversation drafts are in-memory and reset when changing recipients or navigating away; this patch protects edits during the current recipient's pending send but does not implement a per-recipient draft store or autosave. Switching does not carry A's draft into B's composer.
- Read receipts remain timestamp-based read-through markers. Multiple messages with an identical stored timestamp cannot be distinguished by the current schema. This is not a claim of per-message viewing or delivery confirmation.
- Newest-window loading does not add full-history pagination. The oldest messages beyond the cap remain outside this view.
- The funding summary reports stored facts and a next step. It does not verify grant awards, payment, provider provisioning, or course launch success.
- Existing counselor/session notes are text records rather than scheduled follow-up tasks; no task system, deadlines, or automatic outreach were introduced.

Independent review: evidence_and_benchmark reviewed the counselor recipient/draft guards and detail authorization. The review found the adjacent shared reply draft loss, now covered by receipt/revision regressions. I reviewed the partner referral POST/detail scope, attention inclusion, attributed guide, and newest-window changes; the partner message-context role filter omission was corrected by its owner. Partner risk tiers still use User.updatedAt as a coarse preexisting activity proxy.
