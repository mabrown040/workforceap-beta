# Account lifecycle verification — September 9, 2026

This note records the bounded identity-lifecycle portion of the authentication hotfix. It does not establish inbox delivery or successful recovery by either affected person. Production account evidence and operational actions belong in [the incident record](auth-funding-hotfix-2026-09-09.md).

## Corrected behavior

| Boundary | Previous defect | Resulting behavior |
| --- | --- | --- |
| Member administration | An administrator could delete their own account or target another administrator through member actions. | Delete/erase reject the actor's own ID before mutation and reject administrator targets based on either Profile or UserRole. Member self-deletion also rejects administrators. |
| Auth retirement | App email rewriting did not release the original Supabase Auth email. | Verify the selected UUID and original or retired address, then ban that identity and assign its deterministic `deleted-<UUID>@deleted.invalid` Auth address. The recoverable original remains in the existing application marker. |
| Email release | An already-marked application row was treated as fully released without checking Auth. | The individual release endpoint also retires the verified Auth identity; provider failure is a failed response. Administrator identities are excluded from individual and batch release. |
| Restoration | The application row became active before Auth restoration, and Auth failure returned a success-shaped response. | Restore Auth first, then conditionally activate the application row. Provider failure leaves the deleted row available for another restore attempt. Matching concurrent winners are accepted. A failed/uncertain app write returns reconciliation guidance and never guesses a destructive Auth rollback. |
| Identity conflicts | `ensureUserInDb` responded to an email uniqueness conflict by changing an existing primary user ID. | Reject the conflict. Never transfer existing records or roles to a newly supplied Auth ID. Normalize newly stored email text. |
| Signup | A legacy app account with missing Auth could enter signup and collide during provisioning. Failed provisioning could delete an Auth identity without proof that signup created it. | Both signup APIs first check global email existence case-insensitively inside a narrowly scoped system-GUC transaction. An existing app row returns `409 ACCOUNT_RECOVERY_REQUIRED` with staff-assisted recovery guidance before Auth signup. No automatic ID relinking, role assignment, or Auth deletion on provisioning failure. |
| Recoverable markers | Long emails could be silently truncated during administrator member deletion. | Reject overlong markers before removing storage or rewriting the account. |

## Focused checks

- **119 Vitest tests passed across seven suites:** existing member signup/onboarding, application signup, administrator member deletion, member account deletion, new administrator restore/email-release orchestration, and Auth lifecycle helpers.
- **12 Node tests passed:** `ensureUserInDb`, administrator member deletion ordering, and existing erase/storage guards.
- **Focused ESLint passed with zero errors and zero warnings** across the lifecycle source and changed tests.
- The new restore/email-release suite covers authorization, tenant-scoped absence, Auth-before-activation ordering, provider failure and retry, case-insensitive collision rejection, matching concurrent restore, changed/unknown app state, no re-ban after a database failure, retry after that failure, malformed markers, already-marked email release, lost conditional writes, administrator role stores, and failed batch counts.
- The helper suite covers exact-ID matching, normalized original/retired emails, wrong-ID/email rejection before mutation, lookup failure versus confirmed absence, retirement, restore collisions, exact-ID legacy recreation, and cleanup restricted to an unexpected newly returned ID.

A separate agent exercised the real helper against **fresh synthetic identities in the designated DEMO Supabase project**, with 19 assertions: retirement preserved the UUID and freed the original email; a second synthetic identity could claim it; conflicting restoration failed without changing either identity; removing that replacement allowed the original UUID and original synthetic password to work again. Every created synthetic UUID was removed and its absence checked. This is provider behavior evidence, not a test of any affected production person's login. No email was sent by that verification.

## Deliberate boundaries

Auth and application writes remain separate systems. A failed app activation after Auth succeeds is reported for retry/reconciliation, not represented as an atomic rollback. The deleted-account login guard rejects an account whose application row remains deleted. Existing in-flight sessions and full cross-operation serialization are not newly proven by these tests.

Restoration does not recover storage objects already deleted by the established account-deletion flow. No role, curriculum, training completion, or credential changes are part of this lifecycle fix. Historical identity repair must use independently verified original IDs; the legacy `fix-michael-brown-login.ts` script was inspected but not executed because it targets a distinct account and changes privileges.
