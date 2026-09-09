# Email reliability verification — 2026-09-09

The selected partner notification, milestone dispatch, and diagnostics read failures have focused fixes. No real email, recovery token, account mutation, or remote database write was used for this verification.

## Behavior and boundaries

- Both partner notification helpers now surface resolved provider error objects and transport exceptions, after awaiting an error diagnostic. Existing no-op notification preferences remain intact. Their callers can distinguish rejection from completion.
- Milestone approval claims a frozen recipient/draft snapshot using a database compare-and-set. Every claim and checkpoint includes the staff scope, active target, and unchanged recipient address.
- A nullable `milestone_cascades.dispatch_state` JSONB column stores per-draft attempts, acceptance receipts, and provider keys. Existing database statuses are preserved: partial or uncertain dispatch remains `approved`; `sent` is written only when every email has a provider receipt and each advisory is recorded.
- Before each provider request, its attempt and stable key must be saved. After the response, the receipt or failure must be saved. A persistence error stops further sends. Accepted entries are never sent again.
- A five-minute lease prevents overlapping dispatch. Expired leases permit recovery using the same key; attempted entries are automatically retryable for at most 23 hours after their first attempt. Old unknown records, altered recipient/content, malformed timestamps, and changed keys require staff reconciliation.
- When all receipts were saved but the final status write failed, `canFinalize` permits only database finalization after the lease expires, including after the cascade TTL. No provider request occurs.
- Provider acceptance is not proof of inbox delivery. The ledger does not add delivery webhooks or replace operational reconciliation. Legacy `approved` records with no valid ledger are never automatically resent. Wrapper/environment changes that alter a retried provider payload can still be rejected by the provider; keys are retained rather than regenerated.
- Rejected diagnostics queries show `Unavailable`. A successful empty query still shows `No recent activity`. Independent successful measurements remain visible when another query fails.

## Provider contract

Resend documents a 24-hour idempotency-key retention window, replay of the original result for an identical request, and rejection when an existing key is used with a different payload. This implementation uses a 23-hour bound to leave a margin for clock and network uncertainty. The optional key is passed through the SDK's second argument. Sources checked for this implementation: [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys), [Send Email API](https://resend.com/docs/api-reference/emails/send-email).

## Reproduction

```sh
node graph/evidence/repro_dead_code_email_20260909.mjs partner
node graph/evidence/repro_dead_code_email_20260909.mjs milestone
node graph/evidence/repro_dead_code_email_20260909.mjs diagnostics
npx vitest run tests/app/diagnostics-read-reliability.spec.tsx tests/lib/milestone-dispatch-reliability.spec.ts tests/lib/partner-notify-reliability.spec.ts tests/api/milestone-approve-reliability.spec.ts tests/lib/milestone-email-provider.spec.ts --reporter=dot
```

All three original failing assertions now pass. Their original red stdout is retained; corresponding `clm_dead_*_20260909-green.txt` files contain the fixed results. Focused Vitest: **42 tests passed in five suites**; stdout is in `dead-code-email-reliability-focused-green.txt`. Targeted ESLint completed with exit zero and no findings.

Tests cover partial success, failed-recipient-only retry, concurrent claims, pre-send persistence failure, lost acceptance checkpoint, finalization beyond TTL without another send, expired unknown outcomes, malformed attempt history, recipient changes before claim, missing provider receipts, real wrapper-to-SDK key forwarding, authenticated and tenant-scoped API boundaries, and independent diagnostic read failures.

Migration `20260909180000_milestone_dispatch_state` is additive and leaves historic rows null. Applying or verifying it in a hosted database belongs to the release preflight. These unit tests use synthetic provider/database doubles and do not establish production delivery status.
