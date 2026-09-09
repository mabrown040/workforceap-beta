# Counselor handoff access verification

2026-09-09. Follow-up to the stakeholder audit. No production writes, real accounts, emails, or provider calls.

## Reproduced failure

The single-member admin assignment endpoint committed `CounselorAssignment` first and updated `MessageThread.counselorUserId` afterward. A failed thread update returned HTTP 500 while the new assignment remained committed. `assertStaffCanAccessThread` trusted the old routing pointer before checking assignments. The former counselor, still an active counselor elsewhere, could therefore read and post to this member's conversation after their assignment was deactivated.

A stateful test loaded the actual admin assignment route, actual counselor GET/POST routes, and actual authorization helper. Injecting only the thread-update failure produced three red regressions: the assignment failed to roll back; the helper still allowed the old owner; GET and POST both returned 200 and the latter created a synthetic message. Admin bulk update and counselor inbox reassignment had the same post-commit thread-sync structure.

## Bounded correction

- All three mutators now use `lib/counselor/assignment.ts` inside their existing transaction. It locks the active same-org member row, rechecks the target counselor's active/nondeleted/same-org identity, then changes assignments and upserts thread routing in the same commit. This serializes concurrent handoffs through the member row. Null assignment clears routing in the same transaction.
- A member thread's cached counselor ID is now routing metadata. Counselor reads/posts require a current active assignment, active counselor record, nondeleted counselor user, and matching member organization. Missing/deleted members are rejected. Same-org admin and super-admin access remain explicit and do not require a counselor assignment.
- Existing active `Counselor` records remain the counselor role contract, including community ambassadors. No new profile-role requirement was invented. Admin-created historical thread ownership does not grant permanent counselor access after a role or assignment change; administrators retain their separately checked access.
- Notification delivery remains after the successful assignment transaction. No email behavior or provider configuration was changed in this follow-up.
- Inbox reassignment now settles both audit writes after commit. Either audit failure leaves the successful handoff receipt intact and adds a warning to seek administrative review, rather than suggesting a repeated reassignment. The UI keeps that warning and batch result visible even when the queue becomes empty. A failed queue refresh preserves the received result and asks for a reload.

## Evidence

Six focused suites passed, **48 tests**, covering routing failure rollback, actual stale-owner GET/POST denial, active/inactive/foreign/deleted counselor cases, valid admin/current-counselor access, and the three assignment entry points. TypeScript checking passed. The high-risk tenant guard also passed all 68 route checks after its partner-referral assertion was updated to require the new relationship query, tenant/member predicates, and prohibition on self-creating referrals.

Real local PostgreSQL proof loaded the actual assignment helper and used ordinary Prisma transactions against the guarded disposable database on `127.0.0.1:55437`:

1. A forced routing failure rolled assignment changes back and retained the original active assignment and thread owner.
2. Three pairs of simultaneous handoffs each left exactly one active counselor whose user ID matched the thread owner.
3. Unassignment cleared both active assignments and the thread owner.

All three synthetic users created for this proof were deleted afterward. Existing fixture identities were not changed. Sanitized report: `/tmp/wap-stakeholder-workflows-20260909/handoff-audit/local-proof.json`; executable proof: `local-proof.ts`; original red log: `red.log`; focused green log: `green-final.log`.

This establishes behavior with **real transactions**. The existing preview transaction-flattening override cannot establish atomicity; no preview atomicity claim is made. The application changes do not replace database authorization. The separate additive messaging-policy correction and its PostgreSQL verification are owned by the root/counselor review lane. No historical migration was modified here.
