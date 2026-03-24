# Sprint 7 — Platform Foundation + Intake Flow (implemented)

This file mirrors the GitHub sprint spec; items below reflect what landed in this branch.

## Multi-tenant foundation

- [x] `Organization` model with `overviewVideoUrl`, billing/plan fields (default org slug `workforceap`)
- [x] `organizationId` on `User`, `Partner`, `Employer`, `Job` (required; migration backfills default org)
- [x] `OrganizationProgramCatalog` — admin-managed rows keyed by static `programSlug` (syncs with `lib/content/programs` for courses/UI)
- [x] `PreScreeningResponse` + `User.interviewEligible`, `interviewRequestedAt`, `interviewCompletedAt`
- [x] `Profile.financialAidInterest` for training enrollment gate
- [x] Seed: ensures default org + `seedOrganizationProgramCatalog` from static `PROGRAMS`

**Note:** `CourseEnrollment` as a separate model was not in the prior schema; enrollment remains `User.enrolledProgram` + catalog for “active program” lists.

## Admin

- [x] `/admin/programs` — catalog editor (status, order, delivery fields) + enrollment stats table
- [x] `/admin/settings` — org name + overview video URL (Loom/YouTube/Vimeo)
- [x] `/admin/members/interview-ready` — queue + email compose + mark interviewed
- [x] Member detail — pre-screening block + financial aid interest

## Member / public

- [x] `getActivePrograms()` drives homepage “Available talent”, `/dashboard/program` picker, employer job suggested-program slugs
- [x] `/how-it-works` — optional iframe embed on Overview step (step 2) from org setting
- [x] Dashboard — pre-screening form after assessment; interview request after pre-screening
- [x] `/api/member/enroll` — gate on phone + address + `financialAidInterest`; only active catalog slugs

## Post-deploy

1. Run `prisma migrate deploy` (or `migrate dev` locally).
2. Run `npm run db:seed` once to populate `organization_program_catalog` if the table is empty (seed is idempotent).
3. In admin → Settings, set **Overview video URL** if desired.
