# Canonical Program Slug Backfill Implementation Plan

> **Execution rule:** The compatibility aliases from PR #2157 must be deployed before this migration.

**Goal:** Replace the five legacy production program slugs with canonical static-catalog slugs across every known relational program-slug column without violating unique indexes or losing active enrollment/progress data.

**Canonical mapping**

| Legacy | Canonical |
|---|---|
| `ai-practitioner-professional-certificate` | `ai-practitioner-professional-certificate-aws` |
| `ai-professional-developer-certificate-ibm` | `ai-practitioner-professional-certificate-aws` |
| `construction-readiness-certificate-osha-10` | `core-construction-training-certificate` |
| `logistics-and-supply-chain-certificate-clt` | `certified-logistics-technician-clt` |
| `production-technology-certificate-cpt` | `certified-production-technician-cpt` |

The two AI legacy slugs intentionally collapse into one canonical AWS program. Production evidence shows the `ai-professional-developer-certificate-ibm` course set is the same 16-course AI Practitioner curriculum, not the separate IBM Software Developer curriculum.

## Safety design

1. Run in one explicit PostgreSQL transaction.
2. Use short lock and statement timeouts.
3. Materialize the reviewed mapping in a temporary table.
4. Remove only the known duplicate catalog shell where both legacy AI catalog rows exist for the same organization; preserve the row backed by the 16-course curriculum.
5. Abort before updates if transformed composite keys would collide in catalog, courses, enrollments, course progress, or member program progress.
6. Update every production column that stores a program slug, including current/requested change requests and Coursera mapping/progress tables.
7. Abort before commit if any legacy slug remains.
8. Retain application aliases for at least one release after this migration.

## Production-shaped rollback rehearsal

A direct `information_schema.columns` inventory found 18 relational program-slug columns across 17 tables. `coursera_identity_mappings` and `coursera_badge_progress` do not contain program-slug columns and therefore require no update.

The migration was executed against current production state with its final `COMMIT` replaced by `ROLLBACK`. It completed every collision guard and final assertion:

```text
DELETE 1
UPDATE 47 total rows
DO (final zero-legacy assertion passed)
ROLLBACK
```

A fresh read-only query immediately afterward still found all 48 original legacy-slug rows, confirming the rehearsal persisted no changes.

## Verification

- Execute the migration in a transaction against production-shaped state and roll it back.
- Confirm the transaction reaches its final assertion without uniqueness or timeout errors.
- Run Prisma migration status.
- Run focused slug compatibility tests, typecheck, lint, and `git diff --check`.
- After deployment, rerun legacy-slug counts and static-vs-active catalog drift checks.
