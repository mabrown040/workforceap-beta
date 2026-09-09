# Admin workflow review — 2026-09-09

## Selected fixes

- **Queues concealed pending work.** Headline counts used the first eight rows, reply selection stopped at 500 threads, and the remaining work had no pagination. Counts now use the complete active organization relation, preview links open a focused 25-item queue, and invalid/emptied pages recover to the last valid page.
- **Counts described different units as people.** Interview rows are opportunities; one learner can appear in multiple queues. Labels now describe opportunities and items without presenting their sum as unique people or a percentage of enrollment.
- **New or unfunded learners appeared inactive for at least 14 days.** The SQL previously floored inactivity at 14 even for new enrollment. Age now uses actual portal activity/enrollment/creation timestamps, explicitly interpreted as UTC in SQL and JSON so database/server timezone cannot move the follow-up boundary. Unapproved seats without recorded training progress are excluded from inactivity follow-up; explicit stale training flags remain visible with their reason.
- **Failures appeared empty and healthy.** Core admin home/headline failures now have a visible recovery state. Unmeasured sync/scoring/payout checks say “Not verified.” Reply SLA uses the actor's organization and excludes deleted members. Platform workflow diagnostics are visible only to super admins and carry a truthful label.
- **Bulk selections and network failures lacked a clear contract.** Selection means the currently visible page, removed rows cannot be submitted, partial failures remain selected, and uncertain network outcomes tell the operator to reload before retrying.

## Verification

Actual loader SQL and Prisma transactions were exercised against an isolated local PostgreSQL database with 527 synthetic users and 522 conversations. Full counts, pagination, tenant/deletion filters, same-time reply ordering, age/funding exclusions, and empty-page totals passed. Only those task-owned records were removed afterward. See `admin-database-verification.json` for scope and limits. Route and component regressions cover page recovery and action state; release-wide checks are recorded in the combined report.

## Remaining opportunities

- Admin counselor reassignment still performs the assignment transaction separately from conversation ownership. A future handoff change should make those database writes atomic and give durable delivery receipts for counselor notification.
- This page's risk signal measures portal activity and explicit training flags; it is not the full multidimensional risk score or verified provider access.
- Application rows retain submitted-date ordering (missing submitted dates first). Oldest age is measured across the full queue using submitted date with creation fallback.

The final failure-path review also treats HTTP 408/5xx bulk responses as ambiguous: some reviews may already have committed. Network failure, malformed success receipts, and ambiguous server responses preserve selection and prevent another confirmation until a fresh server queue arrives. Closing/reopening the dialog does not unlock retry; Reload queue requests that fresh snapshot. Explicit validation/authorization rejections retain their specific error. Four new component cases cover 408/500/502/504, repeated confirmation, reopening, and retry limited to rows still present after refresh; the admin component suite now passes 23 tests.
