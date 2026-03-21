# Job Create / Import 500 Fix — Enum Type Mismatch

## Root cause (production-confirmed)

- **Error:** `Invalid prisma.job.create() invocation` — Postgres 42704: `type "public.JobLocationType" does not exist`
- **Cause:** Prisma expected enum type `JobLocationType` (PascalCase), but migrations created `job_location_type` (snake_case). Without `@@map`, the Prisma client uses the enum name as the DB type.

## Fix applied

1. **Schema:** `@@map` added to Job enums so Prisma uses the migration-defined type names:
   - `JobLocationType` → `job_location_type`
   - `JobTypeEnum` → `job_type_enum`
   - `JobStatusEnum` → `job_status_enum`
   - `JobPostingApplicationStatus` → `job_posting_application_status`
   - `AIJobMatchStatus` → `ai_job_match_status`

2. **Migration:** `20260321000000_fix_job_enum_types` — idempotent creation of these enum types if they are missing (e.g. migration marked applied but never ran).

## Deploy steps

1. **Merge / push** the branch with these changes.
2. **Deploy** to production (e.g. Vercel).
3. **Migrations:** `prisma migrate deploy` runs as part of the build; the new migration creates missing types or is a no-op if they exist.
4. **Regenerate Prisma client:** `prisma generate` runs in the build.

## Retest (required)

After deploy, verify:

- `POST /api/employer/jobs` — create job → 201 or expected error.
- `POST /api/employer/jobs/import-bulk` with `careersPageUrl: "https://ats.rippling.com/closinglock/jobs"` → 201 with `created` array, or clear error.

Do not assume the fix works until these are retested on https://www.workforceap.org with an authenticated employer session.
