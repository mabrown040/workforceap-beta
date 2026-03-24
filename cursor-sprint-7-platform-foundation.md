# Sprint 7 — Platform Foundation + Intake Flow (implemented)

This file mirrors the GitHub sprint spec; items below reflect what landed on this branch.

## Multi-tenant foundation

- [x] `Organization` model with `overviewVideoUrl`, `logo`, `primaryColor`, billing/plan fields (default org slug `workforceap`)
- [x] `organizationId` on `User`, `Partner`, `Employer`, `Job` (required; migration backfills default org)
- [x] `OrganizationProgramCatalog` — admin-managed rows keyed by static `programSlug` (syncs with `lib/content/programs` for courses/UI)
- [x] Optional `programStartDate` / `programEndDate` on catalog rows for **TWC CSV export**
- [x] `CourseEnrollment` — one row per member; `enrolledByAdminId` set on **admin program change** to bypass self-serve profile gate on later member re-enroll
- [x] `PreScreeningResponse` + `User.interviewEligible`, interview request timestamps
- [x] `Profile.financialAidInterest` for training enrollment gate
- [x] Seed: ensures default org + `seedOrganizationProgramCatalog` from static `PROGRAMS`

## Admin

- [x] `/admin/programs` — catalog editor + **Export for TX state approval (CSV)** + enrollment stats
- [x] `/admin/settings` — org name, **logo upload** (`organization-branding` bucket), **primary color** (hex + site-wide `--color-accent`), overview video URL
- [x] `/admin/members/interview-ready` — queue + email + mark interviewed
- [x] Member detail — pre-screening; **admin enroll confirm** when profile incomplete; program dropdown from **full catalog** (including inactive for corrections)

## Member / public

- [x] `getActivePrograms()` drives homepage “Available talent”, member program picker, employer job suggested-program slugs
- [x] `/dashboard/certifications` — **catalog reference** section (active programs + cert/focus list) above roadmap
- [x] Root layout + admin layout — **org primary color** via CSS variables; optional **org logo bar** on admin
- [x] `/how-it-works` — optional iframe on Overview (step 2)
- [x] Dashboard intake — pre-screening → interview request
- [x] `/api/member/enroll` — profile gate unless `CourseEnrollment.enrolledByAdminId` is set; upserts self-serve `CourseEnrollment`

## Post-deploy

1. `prisma migrate deploy`
2. `npm run db:seed` if `organization_program_catalog` is empty
3. Supabase: create public bucket **`organization-branding`** for org logos (see `docs/SUPABASE-STORAGE-SETUP.md`)
4. Admin → Settings: video URL, logo, primary color as needed
