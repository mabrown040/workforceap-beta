# Coursera enroll-path audit — 2026-09-02

Requested by ops ("Coursera enroll I don't trust"). This traces the whole path —
invite → membership → enroll → progress sync — across the member, admin and cron
surfaces, and lists every way it can silently do the wrong thing.

Method: read the code on `master` at `1a1d071`, plus 7 days of production runtime
errors from Vercel. Findings are ordered by whether they have already caused
member-visible harm.

## Verdict

The enrollment **state machine is sound**. It cannot report success without a
successful Coursera write, it distinguishes "invited" from "enrolled", it folds
duplicate clicks to an idempotent success, and it audits every seat spend.

The distrust is nonetheless justified, because **the progress sync behind it was
failing on every run for four days** (F-1) and **the failure is designed to be
invisible** (F-2, F-3). A member could be genuinely enrolled at Coursera and see
nothing change in the portal, with no error anywhere they could look.

## Confirmed, already caused harm

### F-1 — Progress sync failed on every cron run for four days (fixed)
**Severity: critical. Fixed in PR #2229.**

`pg_advisory_xact_lock()` returns `void`, and five lock sites called it through
Prisma's `$queryRaw`, which deserializes every returned column. A void column
raises P2010 and aborts the surrounding transaction.

Evidence: 460 failures on `/api/cron/coursera-b4b-sync` across 13 members,
first 2026-08-30T00:31Z, last 2026-09-02T00:30Z — i.e. still failing while this
audit was written. Course progress simply stopped updating for those members.

Fixed by moving the locks to `$executeRaw`, plus a regression guard
(`lib/db/advisoryLockRawQuery.test.ts`) verified to fail against the old code.

## Open findings

### F-2 — A successful enroll can leave the member seeing nothing, silently
**Severity: high. Not fixed — needs a product decision.**

`app/api/member/coursera/enroll-in-course/route.ts` fires `triggerAutoSyncBestEffort`
without awaiting it, and both the call and the function body end in
`.catch(() => {})`. `syncUserFromB4B` also swallows per-program errors internally.

So when the seat is created but seeding fails, the UI says "Enrolled", the
member's course list stays empty, and **nothing is recorded anywhere** — no
Sentry event, no audit row, no admin surface. This is the mechanism that turns
F-1 into "the site is broken and I can't tell why".

Suggested fix: keep it fire-and-forget, but route the failure into
`captureApiError` and an audit row, and have the member surface show a "still
syncing" state rather than an empty course list.

**Implementation update (2026-09-04):** the member route now registers the refresh
with Next.js `after`, reports fixed-stage failures, and returns a separate
`sync.status`. Accepted enrollments expose the launch link immediately without
inventing progress. This is partial remediation, not a closed finding: durable
sync history, partial-sync visibility, and live acceptance remain outstanding.
See [the current response contract](COURSERA-ENROLLMENT-FLOW.md#enrollment-versus-progress-refresh).

### F-3 — The org ID falls back to a hardcoded constant
**Severity: medium.**

`getB4BOrgId()` (`lib/coursera/b4bClient.ts:219`) returns
`process.env.COURSERA_ORG_ID?.trim() || DEFAULT_ORG_ID`, where `DEFAULT_ORG_ID`
is the literal `'8R2W4McwOMWJp9cCBV1kvw'` at line 47. If the env var is ever
unset or misspelled, every invite, membership and enroll silently targets that
constant instead of failing.

That constant is duplicated in the self-test at
`app/api/admin/coursera/self-test/route.ts:34`, so **the tool meant to verify the
integration shares the guess it is supposed to catch** — a self-test can pass
against a different org than production writes to.

Suggested fix: resolve the org id in one place, log once at startup when the
fallback is used, and show the effective value on `/admin/coursera` so it is
verifiable rather than assumed.

### F-4 — Roster lookup gives up after 10,000 learners and re-invites instead
**Severity: medium, latent — harmless at current roster size.**

`listUsersByEmailUncached` (`lib/coursera/enrollPort.ts:36-51`) pages the B4B
roster at `PAGE_LIMIT = 200` for at most `SAFETY_PAGES = 50`, then returns
`null`. Coursera has no email filter on that endpoint, so this is a linear scan.

`null` is indistinguishable from "not a member". Past 10,000 learners, an
already-enrolled member takes Branch 1 of the state machine and is **re-invited**
— they see "Check your email — Coursera sent an invite" and never get enrolled,
no matter how many times they click.

Suggested fix: return a three-state result (`found` / `not-found` /
`search-exhausted`) and fail loudly on the third rather than falling through to
invite.

### F-5 — A stale approved-track collection ID would enroll into the wrong program
**Severity: low — currently guarded.**

Both routes compute `programId` as
`approvedTrack?.collectionId ?? discoveredProgram.courseraProgramId`. A wrong-but-
present `collectionId` in `programCurriculumManifest` would spend a seat in the
wrong Coursera program, and the member would see unexpected courses rather than
an error.

The `status !== 'validated' || !collectionId` gate (member route line 173, admin
route line 156) covers the unvalidated case, so this only bites if a manifest is
marked validated with a wrong id. Worth a periodic reconciliation check against
the live B4B program list, which `/api/admin/coursera/reconcile` already partly does.

### F-6 — Negative roster results are cached for 60s
**Severity: low — documented and self-correcting.**

`rosterLookupCache` stores `null` results for `ROSTER_LOOKUP_TTL_MS = 60_000`.
A member who accepts a Coursera invite within that minute and clicks Enroll again
is re-invited rather than enrolled. Invites are idempotent so nothing is
corrupted, and the next attempt succeeds. Noted for completeness.

## What is genuinely solid

Worth stating plainly, since the question was about trust:

- **No false success.** `enrollAndReport` only reports success on `enroll.ok`, or
  on a Coursera 400/409 whose body matches "already enrolled"
  (`looksLikeAlreadyEnrolled`). A 5xx or unknown 4xx propagates as a 502.
- **Invited is not conflated with enrolled.** Branch 1 returns
  `status: 'invited'`, and `components/portal/TrainingCourseList.tsx:116` opens a
  distinct modal telling the member to check their email.
- **Double-clicks do not double-spend.** The idempotency contract is explicit and
  covered by `lib/coursera/enrollState.test.ts`.
- **Every seat spend is audited** with the actor recorded, member or admin, via
  the shared `writeEnrollAudit`. Audit failures are deliberately swallowed so a
  logging outage cannot undo a spent seat — a documented trade-off, and the right
  one.
- **Eligibility is server-enforced.** `courseraEnrollmentApproved` gates the
  member route (403) and the admin route (409); the requested course must belong
  to the member's own program, so a hand-edited request cannot cross programs.
- **Member and admin share one state machine and one port**, so both paths spend
  seats and record the trail identically.

## Recommended order

1. F-2 — make sync failure visible. It is what makes every other fault feel like
   a broken site.
2. F-3 — single source for the org id, surfaced on the admin page.
3. F-4 — three-state roster lookup, before the roster grows.
4. F-5 — periodic manifest reconciliation.
