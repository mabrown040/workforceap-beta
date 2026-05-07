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
- `COURSERA_COURSE_URL_TEMPLATE` (optional deep-link template; placeholders: `{courseId}`, `{programId}`, `{programSlug}`, `{userId}`, `{email}`)
- `COURSERA_DEFAULT_SKILLSET_IDS` (comma-separated)
- `COURSERA_SKILLSET_ID_MAP` (JSON array map, optional per-program override)
- `COURSERA_SKILLSET_SLUG_MAP` (JSON object map: `{ "<programSlug>": { "<skillsetId>": "<internalCourseSlug>" } }` — use when Enterprise skillset names/order do not match the portal catalog)
- `NEXT_PUBLIC_COURSERA_PROGRAM_COURSES_MAP` (JSON object map for course catalog overrides by program slug. Use this to replace placeholder `-course-N` slugs without code changes.)
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

Course override map (for programs still using placeholder `-course-N` slugs):

```env
NEXT_PUBLIC_COURSERA_PROGRAM_COURSES_MAP={\"cybersecurity-professional-certificate-google\":[{\"slug\":\"foundations-of-cybersecurity\",\"name\":\"Foundations of Cybersecurity\",\"estimatedHours\":10}]}
```

Template file with missing program keys: `docs/coursera-course-overrides.template.json`
Auto-generated draft (slugified from current portal course names): `docs/coursera-course-overrides.generated.json`

## Notes

- Skillset sync reads Coursera Enterprise learner progress (following **`nextPageLink`** when paginated), maps completed skillsets to portal course slugs with overrides + fuzzy fallbacks, then merges into `courses_completed`.
- WAP now supports either a pre-minted bearer token or Coursera OAuth app key/secret exchange.
- Webhook/xAPI completion handling supports `courseSlug`, exact `courseName`, and guarded loose-title fallback matching against the member's enrolled program.
- Launch priority: course template deep-link → program template → program home URL → discovered public program URL → `/learn/{courseSlug}` when available and non-placeholder.
