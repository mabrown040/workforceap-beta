# Chapter Tables Additive Migration Plan

> **Execution rule:** Add only the four chapter tables already modeled by Prisma. Do not apply the full production-to-Prisma diff; it contains unrelated and destructive changes.

**Goal:** Make the shipped admin and leader chapter routes return real empty/results instead of relation-not-found errors.

## Scope

Create exactly:

- `chapters`
- `chapter_members`
- `chapter_meetings`
- `chapter_curriculum_items`

Include the columns, unique indexes, foreign keys, defaults, and referential actions generated from `prisma/schema.prisma`.

## RLS posture

- Enable RLS on all four tables.
- Do not enable `FORCE ROW LEVEL SECURITY`.
- Direct `chapters` policies use `can_access_org_row(organization_id)` and `is_current_admin()`.
- Child-table policies derive tenant access through the parent `chapters` row.
- Current server-side Prisma owner/service-role behavior remains unchanged.

## Safety

1. One explicit PostgreSQL transaction.
2. Two-second lock timeout and 30-second statement timeout.
3. No data backfill, seed, drop, or alteration of existing tables.
4. Foreign keys use the exact Prisma-generated referential actions.
5. Production rehearsal executes the migration with `COMMIT` replaced by `ROLLBACK`.
6. Postflight verifies table existence, RLS enabled/force disabled, policy counts, Prisma migration status, and production health.

## Known follow-up

`lib/tenant/scopeProxy.ts` lists the three child models as if they directly carry `organizationId`; they do not. Current shipped routes query through `db.chapter` and nested relations, so this does not block the additive table release. Any future direct child-delegate route must scope through its parent chapter or the proxy must gain relation-aware scoping first.
