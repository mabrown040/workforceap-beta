# Stakeholder workflow improvements — 2026-09-09

This pass reviews the working portals for partners, counselors, member referrers, and admins. It preserves the founder's public homepage and does not include the separate practice-lab branch.

| Audience | Work selected for this release | Evidence |
| --- | --- | --- |
| Partners | Existing-attribution-only referral acknowledgement; same-organization active learner reads; attributed application sharing; active-training follow-ups; latest conversations | [Partner review](partner.md) |
| Counselors | Correct member-context links; stale-response and recipient protection; draft preservation; funding/approval next steps; latest conversations and organization guards | [Counselor review](counselor.md) |
| Referrers | Dedicated invite toolkit; own aggregate progress; recoverable copy/share states; atomic, retry-safe reward receipts | [Referrer review](referrer.md) |
| Admins | Complete counts and paginated focused work queues; visible load failures; honest health states; scoped operational figures and bulk-action state | [Admin review](admin.md) |

## Coverage boundaries and next work

1. Persist member-referral attribution across devices and staff-led enrollment. Current attribution still depends on a 30-day browser cookie and the self-service enrollment path; this release prevents partial rewards but does not invent missing historical attribution.
2. Make assignment and counselor-conversation handoffs one transaction; track any notification delivery separately from the assignment outcome.
3. Add measured, per-workflow last-success and freshness indicators before calling sync, scoring, or payouts healthy. The dashboard now labels unavailable checks honestly.
4. Complete a retained-backup restore drill. The earlier systems pass documented the unsupported clean migration replay and provider-managed physical-backup boundary in `docs/DATABASE-RECOVERY.md`; no restore success is claimed here.
5. Long conversations currently show their most recent window. Full older-history navigation and timestamp-tie read semantics need a separate history/cursor contract.

No new schema, billable service, or automated outreach is introduced by this pass. Verification uses synthetic local identities with outbound providers disabled; production checks must remain read-only.

## Initial release checks

- Node lane: 1,439 passed, eight explicitly recorded skips.
- Vitest: 2,597 passed across 299 files before final visual polish; CI verifies the final commit again.
- ESLint: zero errors, 28 existing warnings. Optimized Next build: 500 generated pages. Astro: 68 pages. All six PDF route artifact checks passed.
- Actual-database verification covered atomic referral rollback/concurrency and full admin queues with 527 synthetic users/522 conversations. Browser checks cover the four roles at 375, 768, and 1440 pixels in light/dark themes, plus permission denials and failure states.
- Visual follow-ups: real admin KPI counts use four columns without invented trend arrows; partner chat scrolls its log instead of moving the whole page. These require the final rebuild/recapture.
- An intermittent hydration error was observed during optimized member-browser checks. Twenty isolated development navigations did not reproduce it. Investigation remains open until the optimized mismatch is identified; this is not counted as verified clean.

Evidence is retained outside the source tree under `/home/claw/artifacts/workforceap-stakeholder-workflows-2026-09-09/`. Browser fixtures contain only synthetic local identities and outbound providers were disabled.
