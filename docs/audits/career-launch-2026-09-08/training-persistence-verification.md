# Member training persistence verification

Verified locally on September 8, 2026 (America/New_York). This records backend and schema checks for the member training workspace. Browser verification is recorded separately in this audit directory. No production migration or production member write was performed.

## Behavior and data boundary

`GET /api/member/training-workspace?programSlug=…` returns `{ workspace }` for the authenticated member's enrolled program and stored curriculum version. Omitting `programSlug` selects the member's primary/latest enrollment. An unassigned or unsupported curriculum returns `workspace: null`.

`PUT /api/member/training-workspace` accepts one of two strict payloads:

```ts
{ kind: 'plan', programSlug, curriculumVersion, weeklyHours, planStartDate }
{ kind: 'coursework', programSlug, curriculumVersion, courseSlug, notes, artifactUrl }
```

The API obtains identity through `getUser()` inside `withApiGuc`; payloads cannot supply a user ID. Plan hours must be integers from 1 through 40, and start dates must be actual calendar dates in `YYYY-MM-DD` form. Notes allow at most 10,000 characters. Artifact links accept `null` or an HTTP/HTTPS URL of at most 2,000 characters without embedded credentials. Coursework must belong to the member's pinned course list. A stale curriculum version is rejected with HTTP 409; another course or unassigned program is rejected with HTTP 403.

Plans are unique per user, program, and curriculum version. Drafts add the assigned course slug to that key. Saving either changes only its own table. It does not modify enrollment, official course completion, attended hours, credential status, points, or notification workflows. Course-hour estimates come from the actual assigned curriculum; published syllabus hours remain a separate value. For example, an assigned 160-hour course list produces a 16-week estimate at 10 hours per week; a 30-hour assignment produces three weeks. A planned date is an estimate, not a completion record.

Reads and writes use `Cache-Control: private, no-store`. Database failures produce HTTP 503 with a truthful unavailable/unsaved message, without exposing raw database errors or pretending that work was saved.

## Focused automated checks

```sh
npx vitest run tests/scripts/preview-training-workspace-schema.test.ts tests/api/member-training-workspace.spec.ts tests/lib/training-workspace-schedule.spec.ts
```

Result: **3 files passed; 46 tests passed**.

| Area | Tests | Checked |
| --- | ---: | --- |
| API and loader | 26 | Authentication requirement, persisted plan/draft reloads, independent saves, draft updates and link clearing, cross-member isolation, rejected identity injection, enrollment and pinned-version boundaries, absent approved manifests, malformed input, size and URL limits, valid boundary values, safe database errors |
| Schedule | 5 | Actual weighted hours, non-160-hour assignments, exact week boundaries, leap dates, invalid pacing |
| Preview bootstrap | 15 | Preview/demo/direct-URL guard, secret-free check mode, fixed migration execution, absent/existing schemas, rejection of partial or drifted schemas, failed postconditions, transactional and serialized migration |

The API tests use mocked authentication and persistence with the real curriculum catalog. They prove handler/loader boundaries; they do not substitute for browser authentication or the real PostgreSQL checks below.

`npx tsc --noEmit --pretty false` completed with exit code 0 after correcting the Prisma test mocks. Focused ESLint across the new backend, preview script, and tests completed with exit code 0 and no output. Prisma schema validation and client generation passed. The parent task owns the full application build and complete test-suite result.

## Additive migration and preview guard

Migration: `prisma/migrations/20260909023000_member_training_workspace/migration.sql`.

The migration creates only `training_study_plans` and `training_course_work`, their primary/foreign/unique keys and indexes, database bounds on weekly hours and note length, and own-member row-level policies. It does not rewrite existing enrollments or progress. Execution is transactional and serialized with a PostgreSQL advisory lock; table/index creation and policy creation support repeat application.

`scripts/apply-preview-training-workspace-schema.cjs` uses the existing Supabase project guard. Its CLI requires Vercel Preview, the configured demo Supabase project, and a validated direct database URL. Production, development, non-Vercel, missing-direct-URL, production-direct-URL, and foreign-host inputs were rejected in tests. `--check` performs no database command. `build:preview` calls this script after the approved-curriculum bootstrap; the production build script is unchanged.

The bootstrap inspects column types and nullability, URL length, primary and foreign keys, unique tuple and user indexes, bounds checks, RLS enablement, and the exact own-member `USING`/`WITH CHECK` policies. A fully verified schema is skipped. An absent schema receives only the fixed additive migration and is then verified. A partial/mismatched schema or additional broad policy fails before a migration is attempted. It never runs the full migration history.

## Real PostgreSQL repeat-application proof

The migration was applied to the disposable local career-preview database. A second, newly created local probe database contained only the prerequisite `users(id)` table. Running the actual bootstrap functions against that probe produced:

```json
{
  "first": { "applied": true },
  "second": { "applied": false },
  "readyAfterExplicitSqlReapply": true
}
```

The final field followed an explicit second execution of the SQL migration, then a fresh database metadata inspection. Both actual SQL executions exited successfully. The newly created probe database was removed afterward. These direct local calls exercise schema application and repeat behavior; the hosted target guard was tested separately, without connecting to hosted Supabase.

## Real PostgreSQL row isolation proof

A transaction in the disposable local career-preview database created a temporary `NOLOGIN NOINHERIT` role, granted only schema usage and CRUD on the two workspace tables, and seeded one synthetic row per member in each table. Tests ran under `SET LOCAL ROLE`, so the querying role was not the table owner.

| Nonowner context | Observed result in both tables |
| --- | --- |
| Missing/empty `app.current_user_id` | Zero visible probe rows |
| First synthetic member's GUC | Only their own row visible; own update affected one row |
| First member attempts second member's update | Zero rows affected |
| First member attempts an insert owned by the second member | Rejected by row-level security |
| Second synthetic member's GUC | Only the second member's row visible; first member's row invisible |

PostgreSQL emitted both assertions successfully:

```text
PASS: nonowner missing-GUC denial, own read/update, cross-user read/update/insert denial for training workspace
PASS: second member sees only their own rows in both tables
```

The transaction rolled back the probe rows, role, and grants. The migration's GUC key is `app.current_user_id`, matching the application's GUC implementation. RLS is enabled, not forced, so the table owner retains the existing application posture; authenticated API queries also enforce the user's ID and assigned curriculum explicitly. Hosted Supabase role grants and a production release remain outside this local proof.
