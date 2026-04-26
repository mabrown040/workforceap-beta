# Coursera xAPI setup

This documents the WorkforceAP side of the Coursera xAPI integration.

## Coursera xAPI screen values

Use these values in Coursera:

- **xAPI Provider format:** `EXTERNAL_LEARNING_PLATFORM_STANDARD`
- **xAPI Actor configuration:** `Mbox`
- **Client ID:** value from `XAPI_CLIENT_ID`, or fallback `COURSERA_APP_ID`
- **Client Secret:** value from `XAPI_CLIENT_SECRET`, or fallback `COURSERA_APP_SECRET`
- **OAuth Server URL:** `https://www.workforceap.org/api/xapi/oauth/token`
- **Tenant Server URL:** `https://www.workforceap.org/api/xapi`

## Endpoints exposed by WAP

- `POST /api/xapi/oauth/token` — OAuth client credentials token exchange for Coursera
- `GET /api/xapi/about` — minimal xAPI about endpoint
- `POST /api/xapi/statements` — statement intake endpoint
- `GET /api/xapi/config` — readiness/debug endpoint, no secrets returned
- `GET /api/admin/coursera/mappings` — admin-only list of manual mappings plus recent unmatched xAPI events
- `POST /api/admin/coursera/mappings` — admin-only manual Coursera identity mapping endpoint

## Supported statement assumptions

Current parser supports the pragmatic subset needed for course completion sync:

- Learner identity comes from `actor.mbox` (`mailto:user@example.com`)
- Completion is detected when either:
  - `verb.id` contains `completed`
  - `verb.id` contains `passed`
  - `result.completion === true`
  - `result.success === true`
- Course matching uses either:
  - `object.definition.name` (preferred)
  - slug derived from `object.id`

Matched completions are sent through `lib/member/courseCompletion.ts`, which marks the course complete in WAP and unlocks next-step workflow.

Identity resolution order is now:
1. manual actor mapping (`actor.account.name` + `actor.account.homePage` when present)
2. manual Coursera email mapping
3. direct email match from `actor.mbox`

Unmatched and error events are logged for admin review.

## Environment variables

Optional dedicated xAPI vars:

- `XAPI_CLIENT_ID`
- `XAPI_CLIENT_SECRET`
- `XAPI_TENANT_SERVER_URL`

If these are omitted, WAP falls back to:

- `COURSERA_APP_ID`
- `COURSERA_APP_SECRET`
- `NEXT_PUBLIC_SITE_URL` (or `https://www.workforceap.org`)

## Notes

- This is intentionally focused on Coursera → WAP completion flow, not a full xAPI LRS implementation.
- If Coursera requires additional xAPI routes later, extend under `app/api/xapi/`.
- If learner emails in Coursera do not match WAP member emails, use `POST /api/admin/coursera/mappings` to bind a Coursera email or actor identity to a WAP user.
- Manual mapping payload shape:

```json
{
  "userId": "<wap-user-id>",
  "courseraEmail": "learner@example.com",
  "actorIdentifier": "optional-coursera-actor-id",
  "actorHomePage": "optional-actor-home-page",
  "notes": "optional admin note"
}
```
