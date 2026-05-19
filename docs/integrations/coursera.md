# Coursera completion engine (stub)

Scaffold for tracking per-member Coursera course enrollments and progress via webhook. Outbound Enrollment API calls are typed but not wired to Coursera yet.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `COURSERA_API_KEY` | For future API sync | API key for Coursera Enrollment API (stub client reads this; no live calls yet). |
| `COURSERA_WEBHOOK_SECRET` | For webhooks | HMAC-SHA256 secret for `POST /api/integrations/coursera/webhook`. Falls back to `WEBHOOK_SECRET` if unset. |

Related existing vars (Enterprise / B4B / legacy webhook) remain documented in `docs/ENVIRONMENT-VARIABLES.md` and `.env.example`.

## Data model

`CourseraEnrollment` (`coursera_enrollments`):

- `user_id` — WorkforceAP member
- `course_id` — Coursera course identifier
- `enrolled_at` — first enrollment timestamp
- `last_progress_pct` — 0–100, monotonic on webhook updates
- `completed_at` — set when progress reaches 100% or `completed: true`

Unique on `(user_id, course_id)`.

## Webhook

**URL:** `POST /api/integrations/coursera/webhook`

**Auth:** HMAC-SHA256 over raw body (`x-coursera-signature`, `x-coursera-webhook-signature`, or `x-coursera-hmac-sha256`), or shared secret header `x-coursera-webhook-secret`. See `lib/coursera/webhookAuth.ts`.

**Example payload:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "courseId": "abc123",
  "progressPercent": 42,
  "completed": false
}
```

`externalUserId` may be used instead of `userId` when it matches a portal user id.

## Code layout

| Path | Role |
|------|------|
| `lib/coursera/client.ts` | Typed Enrollment API wrapper (stub; throws until configured). |
| `lib/coursera/completionEngine.ts` | Upsert progress into `CourseraEnrollment`. |
| `app/api/integrations/coursera/webhook/route.ts` | HMAC-verified inbound progress. |

## Not in scope (this stub)

- Live Coursera Enrollment API HTTP calls
- Portal course completion / xAPI pipeline (see `app/api/webhooks/coursera` and `docs/coursera-xapi-setup.md`)
