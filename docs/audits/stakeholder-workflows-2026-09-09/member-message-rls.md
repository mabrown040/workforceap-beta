# Member conversation assignment boundary

Migration: `prisma/migrations/20260909224000_member_message_current_assignment/migration.sql`.

A member conversation kept its old `counselor_user_id` after an assignment changed. The historical database policies treated that pointer as authorization, so a former counselor could retain read/post/receipt access. They also failed to admit the new active counselor when the pointer was stale. The application helper and assignment transactions are fixed separately because application database connections retain owner bypass.

## Narrow database change

The migration adds one messaging-only, fixed-search-path `SECURITY DEFINER` predicate and changes exactly four existing thread/message policies. A member conversation requires a non-deleted member and non-deleted actor. Counselor access requires an active assignment, an active Counselor row, and matching actor/member organizations. An active Counselor row is the existing counselor/ambassador role contract; no extra profile-role requirement is introduced. Cached counselor/staff pointers alone cannot grant counselor access.

Member self access and tenant-aware administrator reads remain available. Historical database administrator write scope is preserved: an administrator must also match its prior counselor/staff participant pointer for direct SQL UPDATE/INSERT. Super administrators retain cross-organization reads, without gaining new direct SQL writes solely from that role. The application's separately authorized owner-bypass administrator routes continue to work. Message INSERT still requires the exact current author ID.

Employer/partner policy branches retain their previous predicates. This is not a general audit or hardening of those branches.

The live ACL read confirmed table-level UPDATE for `anon` and `authenticated`, with no existing column-level grants. Those table grants are revoked. `authenticated` receives UPDATE only for `member_last_read_at`, `counselor_last_read_at`, `portal_user_last_read_at`, and `staff_last_read_at`; no new UPDATE grant is given to `anon`. This prevents a participant from rewriting kind/member/portal/owner IDs into a different policy branch. Repository chat clients use Realtime subscriptions plus authenticated application routes; no direct PostgREST thread-metadata update was found. Owner and service-role grants are unchanged.

No historical migration was edited; no Prisma schema/client generation, data backfill, production database write, identity-helper rewrite, or FORCE-RLS rollout was performed by this task.

## Reproducible local proof

The proof uses the captured live public helper/policy definitions in `tests/fixtures/member-message-rls-baseline.json` and minimal synthetic tables. It does **not** replay the historical migration directory or claim a complete database restore. The original policy/function bodies are loaded before applying the exact new migration. The test asserts that its query role is not owner, superuser, or BYPASSRLS and that row security is active on both messaging tables.

Run against a **new, isolated local database** only:

```sh
RLS_PROOF_DATABASE_URL=postgresql://claw@127.0.0.1:55437/workforceap_message_rls_proof_20260909 \
RLS_PROOF_ARTIFACT_DIR=/tmp/member-message-rls-proof \
node tests/rls/member-message-assignment.mjs
```

The script rejects other hosts/ports/database names, an existing proof database, and preexisting test-role names. It creates local NOLOGIN roles only when absent, grants them only proof-database access, then removes the database and its newly created roles in cleanup. It never touches the shared browser-fixture database or the system PostgreSQL port.

**Result: 51 checks passed.** The report records the migration/baseline SHA-256 hashes and cleanup counts.

- Red proof: after committed reassignment, the former counselor could still SELECT thread/messages, UPDATE a receipt, and INSERT a message, while the new counselor was denied by the stale pointer.
- Green proof: former counselor denied for all four operations; new active counselor admitted even with the old pointer unchanged.
- Active-assignment/inactive-counselor, deleted actor, deleted member, cross-organization counselor, no active assignment, null-member thread, unrelated member, foreign admin, and forged author cases denied.
- Member self, tenant administrator read scope, previous administrator participant write scope, and super-administrator read scope preserved.
- Seven identity-column writes and a combined member-to-partner retarget rejected with SQLSTATE `42501`; all four receipt-column grants confirmed; `anon` UPDATE absent; service-role table UPDATE unchanged.
- Partner owner, employer owner, assigned portal staff, super-administrator reads, and unrelated portal-user outcomes matched before/after.
- Owner reassignment metadata UPDATE remained available.
- A JWT-shaped `request.jwt.claims` value without trusted `app.*` identity GUCs granted no access. This does not claim live Realtime delivery was verified.

Sanitized execution evidence: `/home/claw/artifacts/workforceap-stakeholder-workflows-2026-09-09/counselor/rls-review/verification.json`. The dedicated proof database and three created local roles were removed successfully. Browser fixtures were preserved.

## Compatibility and rollback boundary

This adds no required columns or new application API contract, so existing owner/service-role application operations remain compatible. The assignment helper/atomic transaction changes must ship with it: table owners still bypass these policies, so restoring an older application helper that trusts the cached owner would reintroduce that application-level authorization defect even while the database migration remains installed.

Do not automatically restore old policies or broader browser UPDATE grants during an application rollback. Prefer a reviewed forward correction. Any intentional database rollback must use captured prior policy/grant definitions, be verified in isolation, and explicitly acknowledge restoring the stale-owner permission; no data deletion or historical checksum rewrite is appropriate.

This proof does not establish complete tenant coverage, full historical replay, all-runtime GUC coverage, revocation of a statement already authorized before reassignment committed, or per-message receipt semantics. Existing read receipts remain timestamp-based and cannot distinguish tied timestamps.
