# Database recovery and migration preflight

Verified 2026-09-09. **Clean replay of the historical migrations is unsupported.**
Neither a successful application build nor an available backup proves that a new
database can be restored and serve the application safely.

## What the recovery audit proved

The audit ran Prisma 5.22 against an initially empty, disposable PostgreSQL 16
database on `127.0.0.1:55437`. It did not change production or any historical
migration file. The replay found 171 migrations at the audited checkout; later
migrations added to the repository do not repair an earlier replay failure.

| Replay stage | Observed result | Source |
| --- | --- | --- |
| Unmodified history | `P3018` / PostgreSQL `42P07`: `partner_users` already exists | `20260319100000_add_partner_users` and `20260320000000_add_partner_users` both create the table, indexes, and constraints |
| After verifying every duplicate table/index/constraint postcondition and explicitly resolving only that duplicate in the disposable database | `P3018` / PostgreSQL `42P01`: `subgroups` does not exist | `20260320000002_add_invitations/migration.sql:51` references a table first created by the later `20260320100000_add_member_subgroups/migration.sql:7` |

Both `invitations` and `subgroups` were absent after the second failure. The audit
stopped there; **there may be additional blockers later in the history**. The
duplicate-only resolution was an investigation step, not a provisioning recipe.
The audit database was dropped afterward; other databases were preserved.

Raw output: [pristine replay](../graph/evidence/deps-recovery-01-pristine-replay.txt),
[duplicate postconditions](../graph/evidence/deps-recovery-02-duplicate-postconditions.txt),
[isolated resolve](../graph/evidence/deps-recovery-03-isolated-duplicate-resolve.txt),
[next failure](../graph/evidence/deps-recovery-04-replay-after-duplicate.txt), and
[final state](../graph/evidence/deps-recovery-05-final-audit-state.txt).

## Repository migration collision gate

`npm run check-migrations` (or `node scripts/check-duplicate-migrations.mjs`)
runs directly in required CI before dependency installation. New migrations need
a unique 14-digit timestamp prefix. Existing shorter numeric prefixes are also
checked for collisions without renaming them. The checker accepts only the ten historical
collision groups recorded in [the reviewed exception manifest](../scripts/migration-collision-baseline.json),
pinned to the 20 exact directory names and SQL SHA256 values at source commit
`ff7c319a09d15f15ee3f04e781ece8884cf31e42`. Removing or renaming a recorded
member, changing its SQL, adding a member or creating a new collision fails.
Missing migration input, missing SQL or an invalid exception manifest also fails.

Choose a different timestamp only for a **new, unapplied** migration. Never rename
an applied historical migration or edit `migration_lock.toml` to conceal a collision.
Do not regenerate the exception manifest to make a failing new change pass; there
is no automatic baseline-update mode. Any intentional change to these historical
exceptions needs a separately reviewed migration-history transition.

This manifest records repository collision exceptions, not the checksums stored in
production. Only the exception members are checksum-pinned by this guard. Continue
to preserve all applied migration files and perform the existing-database preflight
below. Passing the guard does not establish complete schema equivalence, safe SQL,
clean historical replay, backup recovery or deployed acceptance. The existing
production recovery commands remain unchanged.

## Preflight for an existing database

1. Identify the intended environment, database, schema, and application release
   through the approved secret/configuration channel. Confirm the pooled runtime
   URL and direct migration URL address the same intended project. Do not print
   credentials or copy production URLs into shell history or evidence.
2. Run `node scripts/prisma-env.js prisma migrate status` with that environment
   already configured. This reads migration status; it does not apply migrations.
   Inspect any failed, missing, or unexpected migration before deploying. A
   successful status check alone does not establish schema equivalence.
3. Review the actual pending SQL against the target's tables, constraints,
   indexes, policies, functions, triggers, and migration records. Preserve the
   names and bytes of previously applied migration files. Record a rollback or
   forward-repair plan for the specific change and its compatibility with the
   currently running application.
4. Check the latest available backup and its timestamp, and determine what data
   would be lost by restoring it. Check whether an isolated restore of the
   selected backup has been verified; do not substitute backup availability for
   that proof.
5. Let the configured production build run the migration stage once. Do not run
   a second migration process concurrently. A failed build can have applied
   migrations before Next.js compilation fails; rolling back the Vercel
   application does not undo those database changes.

`build:with-migrate` contains two named historical rollback-resolution commands
before `scripts/safe-migrate.cjs`. They concern specific earlier incidents;
they do not repair the March replay blockers. The safe-migrate default executes
one `migrate deploy`, propagates failure, and does not resolve or retry unknown
failures. It skips migration work when the environment wrapper supplied its
placeholder database, so that successful skip is not database verification.

For a failed migration, first establish exactly what changed. A `--rolled-back`
marker does not undo SQL: restore the failed migration's pre-state and verify its
original SQL can rerun before choosing that recovery path. A later migration
cannot execute past an earlier failure. `--force-resolve <name>` instead marks
the named migration applied without validating its intended schema; use it only
after verifying all of that migration's postconditions on the intended target
and recording the evidence. Never loop over failures or mass-resolve the history.

## What is still needed for reproducible recovery

Two distinct capabilities need their own proof:

- **Backup recovery:** restore a selected backup into an explicitly isolated
  target with outbound email, cron, webhooks, and paid providers disabled. Check
  schema and migration state, counts and key relationships, required default-org
  data, auth linkage, role grants, RLS policies, SQL functions and triggers.
  Verify readiness and representative authenticated, tenant-isolated application
  reads and writes using designated test accounts. Record the source backup
  timestamp, elapsed recovery time, data-loss window, results, and cleanup.
  A production restore or cutover requires a separately reviewed incident plan;
  this document does not authorize one.
- **Fresh schema replay:** prepare a separately reviewed, versioned baseline
  from a verified schema/security reference and a checksum manifest of the
  historical SQL it covers. Preserve that history as an immutable archive and
  design an explicit transition for existing databases. Include database objects
  Prisma cannot represent. Prove both empty-database replay and subsequent
  migrations, plus compatibility with an existing-database copy, before adopting
  the new lineage. Keeping the broken old chain active while adding a bootstrap
  script does not fix shadow-database replay. No baseline has been created or
  adopted by this audit.

Prisma's [baselining workflow](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)
describes the archive/baseline/explicit-resolution mechanism and the need to
include database features outside the Prisma schema. The repository's verified
reference schema and full replay/restore acceptance results are still missing.
`prisma db push` can provide disposable development tables, but it is not a
production recovery procedure: it does not reproduce migration-only SQL such as
RLS policies and curriculum immutability triggers.

## Backup evidence and limits

A read-only Supabase Management API check at **2026-09-09 17:35:07 UTC** returned
eight `COMPLETED` daily backups dated September 2–9. The newest returned
`insertedAt` was **2026-09-09 09:54:37.111 UTC**. The response reported PITR
disabled. These observations establish available backup records at that time,
not a fixed daily schedule, a successful restore, or a guaranteed recovery time.
No backup restore was performed. Recheck the provider for current availability
before recovery. [Sanitized response](../graph/evidence/deps-production-backups-run_20260909_1730.txt).

## Existing production migration-history differences

A read-only preflight at **2026-09-09 22:38 UTC** found 175 completed migration
names, no unresolved migration, 15 stored checksums that differ from the current
repository files, and three completed names absent from this checkout. Every
one of those 15 repository files is byte-identical to the deployed `dfd49fa9`
baseline; the stakeholder workflow branch did not introduce these historical
differences. The database-only names are `20260320100000_employer_portal_jobs`,
`20260616050000_s2_compliance_fix_xapi_org_null`, and
`20260616060000_fix_xapi_org_id_backfill`.

These differences are additional evidence that historical clean replay is not
a recovery method. Preserve both the recorded checksums and repository history;
do not rewrite or resolve them to make a status report look clean. Review each
new additive migration against the actual live objects. The complete comparison
is retained in `artifacts/workforceap-stakeholder-workflows-2026-09-09/migration-preflight.json`.
