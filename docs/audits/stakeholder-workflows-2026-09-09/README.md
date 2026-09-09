# Stakeholder workflow improvements — 2026-09-09

This pass reviews the working portals for partners, counselors, member referrers, and admins. It preserves the founder's public homepage and does not include the separate practice-lab branch.

| Audience | Work selected for this release | Evidence |
| --- | --- | --- |
| Partners | Existing-attribution-only referral acknowledgement; same-organization active learner reads; attributed application sharing; active-training follow-ups; latest conversations | [Partner review](partner.md) |
| Counselors | Correct member-context links; safe recipient/note state; funding/approval next steps; atomic assignment handoffs; current-assignment conversation access | [Counselor review](counselor.md), [handoff proof](counselor-handoff.md), [database policies](member-message-rls.md) |
| Referrers | Dedicated invite toolkit; own aggregate progress; recoverable copy/share states; atomic, retry-safe reward receipts | [Referrer review](referrer.md) |
| Admins | Complete counts and paginated work queues; visible load failures; honest health states; scoped operational figures; fresh-queue requirement after ambiguous bulk responses | [Admin review](admin.md) |

## Coverage boundaries and next work

1. Persist member-referral attribution across devices and staff-led enrollment. Current attribution still depends on a 30-day browser cookie and the self-service enrollment path; this release prevents partial rewards but does not invent missing historical attribution.
2. Keep durable delivery/reconciliation work separate from assignment success. Assignment and thread ownership now commit together; a failed activity-log write is reported separately from a committed reassignment.
3. Add measured, per-workflow last-success and freshness indicators before calling sync, scoring, or payouts healthy. The dashboard now labels unavailable checks honestly.
4. Complete a retained-backup restore drill. The earlier systems pass documented the unsupported clean migration replay and provider-managed physical-backup boundary in `docs/DATABASE-RECOVERY.md`; no restore success is claimed here.
5. Long conversations currently show their most recent window. Full older-history navigation and timestamp-tie read semantics need a separate history/cursor contract.

One additive database migration changes member-message policies and restricts browser-role thread updates to receipt columns. It does not change tables, stored learner data, owner/service-role access, historical migrations, or the existing RLS enforcement mode. No new billable service or automated outreach is introduced. Verification uses synthetic local identities with outbound providers disabled. Production preflight is read-only; the configured deployment runs the reviewed migration once.

## Initial release checks

- Node lane: 1,439 passed, eight explicitly recorded skips.
- Vitest: 2,597 passed across 299 files before final visual polish; CI verifies the final commit again.
- ESLint: zero errors, 28 existing warnings. Optimized Next build: 500 generated pages. Astro: 68 pages. All six PDF route artifact checks passed.
- Actual-database verification covered atomic referral rollback/concurrency and full admin queues with 527 synthetic users/522 conversations. Browser checks cover the four roles at 375, 768, and 1440 pixels in light/dark themes, plus permission denials and failure states.
- Visual follow-ups passed after an optimized rebuild: four-column admin KPIs, counselor mobile recipient/actions without overlap, and partner chat scrolling within its log. Admin phone/tablet/desktop light/dark checks also passed again.
- Real transaction tests verified handoff failure rollback, three pairs of concurrent handoffs leaving one matching assignment/thread owner, and complete unassignment. The independent PostgreSQL policy proof passed 51 checks under a non-owner role with RLS active, including the reproduced stale-owner failure, its correction, tenant/deletion boundaries, receipt-only grants, and unchanged partner/employer policy results.
- An intermittent recoverable hydration error was observed in earlier optimized member-browser checks. It remains an explicit unresolved risk. The latest candidate passed 40 normal and eight slowed-CPU contexts; the unchanged deployed baseline passed the same number. Referral server-render/hydrate parity tests pass. These finite clean checks do not prove that the earlier error is fixed or pre-existing. See the [referrer evidence](referrer.md).

## Production preflight and release limits

Both of the founder's admin identities remain active in application and authentication records. His personal account has a successful sign-in after the earlier recovery request; this is not a claim that he personally confirmed every admin workflow. No reset was resent.

Read-only operational checks found 10 of 60 database connections in use, recent cron executions successful, and no recorded workflow errors in the checked three-hour window. The Sentry read token is unavailable in this environment, so Sentry issue review is not claimed. Eight completed retained backups were rechecked at 22:44 UTC; newest timestamp 09:54 UTC, PITR disabled, restore unverified.

The migration preflight found only the intended new policy migration pending and no unresolved migration. Fifteen historical checksum differences and three database-only migration names predate this branch; their repository files were unchanged. Preserve that history and use the specific migration's live-object preflight and compatibility plan; see [database recovery](../../DATABASE-RECOVERY.md).

Evidence is retained outside the source tree under `/home/claw/artifacts/workforceap-stakeholder-workflows-2026-09-09/`. Browser fixtures contain only synthetic local identities and outbound providers were disabled.
