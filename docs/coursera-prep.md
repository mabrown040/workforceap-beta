# Coursera prep notes

This branch scaffolds the WorkforceAP side of Coursera before credentials are added.

## What is ready

- Member launch redirect: `/api/member/coursera/launch`
- Member status endpoint: `/api/member/coursera`
- Member enterprise sync probe: `/api/member/coursera/sync`
- Secure webhook intake for completions: `/api/webhooks/coursera`
- xAPI auth + intake endpoints: `/api/xapi/oauth/token`, `/api/xapi/statements`, `/api/xapi/about`
- Admin mapping/debug endpoint for Coursera identities: `/api/admin/coursera/mappings`
- Member-facing portal page: `/dashboard/coursera`
- Shared course completion helper so webhook completions and member self-reporting stay aligned

## Environment variables

Add these in Vercel or local env when credentials are ready:

- `COURSERA_API_TOKEN` or OAuth app credentials below
- `COURSERA_APP_ID` (optional, useful for your records)
- `COURSERA_APP_KEY`
- `COURSERA_APP_SECRET`
- `COURSERA_OAUTH_TOKEN_URL` (optional, defaults to `https://api.coursera.com/oauth2/client_credentials/token`)
- `COURSERA_PROGRAM_ID`
- `COURSERA_PROGRAM_ID_MAP` (JSON, optional per-program override)
- `COURSERA_PROGRAM_HOME_URL` or `COURSERA_PROGRAM_URL_TEMPLATE`
- `COURSERA_DEFAULT_SKILLSET_IDS` (comma-separated)
- `COURSERA_SKILLSET_ID_MAP` (JSON array map, optional per-program override)
- `COURSERA_WEBHOOK_SECRET`

## Recommended launch template examples

Single shared program URL:

```env
COURSERA_PROGRAM_HOME_URL=https://www.coursera.org/programs/your-program-slug
```

Template with program mapping:

```env
COURSERA_PROGRAM_URL_TEMPLATE=https://www.coursera.org/programs/{programId}
COURSERA_PROGRAM_ID_MAP={"it-support-professional-certificate-ibm":"abc123"}
```

## Notes

- Skillset sync currently reads Coursera Enterprise learner progress and returns normalized JSON to the portal.
- WAP now supports either a pre-minted bearer token or Coursera OAuth app key/secret exchange.
- Webhook completion handling supports either `courseSlug` or exact `courseName` matching against the member's enrolled program.
- The launch route falls back to public Coursera until launch credentials are configured.

## CSV import (backfill + ongoing redundancy)

The xAPI bridge handles realtime course progress, but xAPI cannot backfill events that
fired before the credential fix. The Coursera "Learner activity & progress" export gives
us a per-learner-per-course snapshot that fills that gap and acts as redundancy if xAPI
ever drops events.

### Where to download the CSV

Coursera admin console → **Analytics → Reports → Learner activity & progress** →
**Customise & Generate**. The download is a ZIP with six CSVs; the importer
consumes two of them:

- `CourseActivity workforce-advancement - CourseraEnterpriseExport ... .csv` —
  per-learner-per-course progress. Backs the `coursera_course_progress` table.
- `LearningPathActivity workforce-advancement - CourseraEnterpriseExport ... .csv` —
  per-learner-per-badge progress (a.k.a. specializations). Backs the
  `coursera_badge_progress` table.
- `ProgramActivity ...` — supplementary program-level rollup. Not used.
- `ActivityByBusinessUnit`, `ActivityByCountry`, `ActivityByCity` — aggregate-only
  and ignored.

### Schedule daily delivery

From the same Customise & Generate screen, schedule daily email delivery to
`michael.brown2@workforceap.org` so the latest export is always one inbox-search away.

### Importing

1. Sign in as an admin and visit `/admin/coursera/csv-import`.
2. Upload either the `CourseActivity ... .csv` or
   `LearningPathActivity ... .csv` file (5 MB cap). The importer auto-detects
   which kind you uploaded by inspecting the header row.
3. For **CourseActivity** the importer parses the file, upserts each row into
   `coursera_course_progress` keyed on `(lower(email), coursera_course_id)`,
   and resolves the `user_id` via:
   - Direct match on `lower(users.email)` first.
   - Falls back to the existing `coursera_identity_mappings` table.
4. For **LearningPathActivity** the importer parses the file, groups rows by
   `(lower(email), badge_slug)` (the source CSV emits one row per
   course-within-badge), and upserts one record per learner+badge into
   `coursera_badge_progress`. Per group it counts `coursesCompleted` from rows
   where `Is Course Completed = "Yes"`, picks `currentCourseName` as the most
   recently enrolled in-progress course, and takes `MAX(lastActivityTime)`.
   `user_id` is resolved using the same email-then-mapping ladder as
   CourseActivity.
5. The result page shows inserted/updated/resolved/unresolved counts plus a
   downloadable CSV of unresolved learners.

### Endpoint

`POST /api/admin/coursera/csv-import` — admin-only. Accepts either:

- `multipart/form-data` with a `csv` file field, or
- `Content-Type: text/csv` with the raw CSV body.

Returns JSON. The shape varies slightly by `kind`:

```json
{
  "ok": true,
  "kind": "course-activity",
  "filename": "CourseActivity ... .csv",
  "parsed": 3,
  "inserted": 3,
  "updated": 0,
  "resolvedToUsers": 2,
  "unresolved": 1,
  "errors": [],
  "unresolvedRows": [{ "email": "...", "name": "...", "courseId": "...", "course": "..." }]
}
```

```json
{
  "ok": true,
  "kind": "learning-path-activity",
  "filename": "LearningPathActivity ... .csv",
  "parsed": 3,
  "inserted": 3,
  "updated": 0,
  "resolvedToUsers": 2,
  "unresolved": 1,
  "errors": [],
  "unresolvedRows": [{ "email": "...", "name": "...", "badgeSlug": "...", "badgeTitle": "..." }]
}
```

The endpoint is idempotent — re-uploading the same CSV updates rows in place.

## Coursera-only learner mapping

When a learner shows up on Coursera with an email we don't have in the `users`
table (common before WIOA enrollment is complete or when the learner used a
different email at signup), the importer still records their progress with a
`null` `user_id`. The admin page at `/admin/coursera` surfaces these in a
dedicated **"Coursera-only learners (unmatched)"** section that lists distinct
external emails from both `coursera_course_progress` and
`coursera_badge_progress` where `user_id IS NULL`.

Each row has a **"Map to WAP user…"** action that opens an inline dropdown of
WAP members. On submit it calls `POST /api/admin/coursera/map-unmatched` which:

1. Upserts a `coursera_identity_mappings` row binding `userId ↔ courseraEmail`
   so future ingest runs and live xAPI events resolve automatically.
2. Backfills `user_id` on existing `coursera_course_progress` and
   `coursera_badge_progress` rows for that lower-cased email — no re-import
   needed.

Per-learner drill-down pages live at:

- `/admin/coursera/learners/[userId]` — for matched WAP users; shows xAPI
  progress card, CSV-imported courses, badges, and identity mappings.
- `/admin/coursera/learners/unmatched/[externalEmail]` — for unmatched Coursera
  learners; shows their CSV course + badge progress keyed by raw external
  email.
