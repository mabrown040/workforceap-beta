# Coursera prep notes

This branch scaffolds the WorkforceAP side of Coursera before credentials are added.

## What is ready

- Member launch redirect: `/api/member/coursera/launch`
- Member status endpoint: `/api/member/coursera`
- Member enterprise sync probe: `/api/member/coursera/sync`
- Secure webhook intake for completions: `/api/webhooks/coursera`
- Member-facing portal page: `/dashboard/coursera`
- Shared course completion helper so webhook completions and member self-reporting stay aligned

## Environment variables

Add these in Vercel or local env when credentials are ready:

- `COURSERA_API_TOKEN`
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
- Webhook completion handling supports either `courseSlug` or exact `courseName` matching against the member's enrolled program.
- The launch route falls back to public Coursera until launch credentials are configured.
