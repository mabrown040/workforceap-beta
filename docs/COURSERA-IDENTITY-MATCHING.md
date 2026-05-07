# Coursera Identity Matching — Diagnostics

**Audience:** Mike, counselors, and any future ops admin who opens
`/admin/coursera` and sees a number like "129 unresolved xAPI" and wants to
know what to do about it.

**Last reviewed:** 2026-05-07

---

## Why this doc exists

WorkforceAP gets Coursera learning data from **two independent pipelines**.
For things to add up, those pipelines must agree on **who the learner is** —
and they often don't, because Coursera and WAP can use different emails for
the same person.

This doc explains:
- The three-pipeline picture
- The exact identity-matching logic
- Why a row ends up "unmatched"
- How to diagnose and fix it

---

## The three sources of truth

```
┌────────────────────────────────────┐
│ 1. CSV import                      │
│  Manual upload of Coursera Skills  │  → coursera_course_progress
│  Dashboard exports.                │  → coursera_badge_progress
│  Run from /admin/coursera          │
│  Updated: when an admin uploads    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ 2. xAPI webhook                    │
│  Live statements from Coursera as  │  → xapi_statements (raw)
│  members complete activities.      │  → coursera_xapi_events (parsed +
│  POST /api/webhooks/coursera       │     identity-match status)
│  Updated: real-time                │  → CourseProgress (per-user normalized)
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ 3. WAP users                       │
│  Anyone who signed up via /apply.  │  → users
│  Email + full_name + enrolled_     │
│  program live here.                │
└────────────────────────────────────┘
```

The "matching" problem is connecting (1) and (2) to a row in (3).

---

## How matching works (`lib/xapi/mappings.ts → resolveXapiUser`)

For every xAPI event Coursera sends, we try **three paths in order**:

### Path 1 — Manual actor mapping
Look up `coursera_identity_mappings` by `(actor_identifier, actor_home_page)`.
Set when an admin manually mapped a Coursera SSO account to a WAP user.

If hit → `mappingMethod = 'manual_actor'`. Done.

### Path 2 — Manual email mapping
Look up `coursera_identity_mappings` by `LOWER(coursera_email)`.
Set when an admin manually entered a Coursera email → WAP user binding, OR
when path 3 ran successfully and auto-saved a mapping for next time.

If hit → `mappingMethod = 'manual_email'`. Done.

### Path 3 — Direct email match
Run `prisma.user.findFirst({ where: { email: { equals: actorEmail, mode: 'insensitive' } } })`.

If a `users` row matches → `mappingMethod = 'direct_email'`, AND a mapping
row is auto-created so the next event for the same Coursera identity hits
Path 2 (faster + survives email changes on the WAP side).

If still no hit → event is recorded with `completion_status = 'unmatched'`
and never reaches `CourseProgress` until something maps the identity.

---

## Why an event ends up "unmatched"

In rough order of frequency:

| Reason | Signal | Fix |
|---|---|---|
| Member uses different email on Coursera vs WAP signup | `actor_email` is set, no `users` row matches | Manual mapping via the unmatched detail page |
| Member never signed up to WAP — Coursera-only | `actor_email` is set, no `users` row at all | Either invite them to apply, or accept Coursera-only status |
| Test / smoke-test traffic | Email like `test-smoke@workforceap.org`, `force-test-*`, etc. | Tag those users explicitly; don't include them in the unmatched view |
| xAPI uses an `account.name` instead of `mbox` | `actor_email` is null, only `actor_identifier` set | Manual actor mapping (path 1) |
| Member existed but auto-heal hadn't run yet | `actor_email` matches a real user, status still `unmatched` | Wait for the cron, or click "Run auto-heal" |

---

## Diagnostic walkthrough — the May 2026 snapshot

Mike pulled `/admin/coursera` and saw:

```
test-smoke@workforceap.org    — 0 courses · 0 badges · 81 unresolved xAPI
Robert Noel (noel2764@…)      — 1 course  · 0 badges ·  9 unresolved xAPI
drew.l.harris14@gmail.com     — 0 courses · 0 badges · 37 unresolved xAPI
force-test-…@workforceap.org  — 0 courses · 0 badges ·  1 unresolved xAPI
test@workforceap.org          — 0 courses · 0 badges ·  1 unresolved xAPI
```

**Total: 129 unresolved events across 5 emails.**

**Diagnosis:**
- **`test-smoke@…` (81 events):** Smoke-test traffic. Confirm by checking
  if there's a `users` row with that email and `is_test=true` or similar.
  Action: set up a filter so test traffic doesn't appear in this view.
- **`force-test-…`, `test@workforceap.org`:** Same. Test accounts.
- **Robert Noel (9 events):** He IS in the CSV (1 course, "unmapped"
  meaning the COURSE slug didn't bind, not the user). His xAPI events are
  unmatched, suggesting he signed up to WAP with a different email than the
  Coursera one, OR the auto-heal cron hasn't run since his events arrived.
  Action: open the unmatched detail page for `noel2764@gmail.com`, see if
  the suggestions panel surfaces a matching WAP user (likely yes), one-click
  map.
- **`drew.l.harris14@gmail.com` (37 events):** Largest real-member backlog.
  Either Drew is a Coursera-only learner (Mike's team enrolled him in
  Coursera before he applied to WAP) or he signed up with a different
  email. Action: same — open detail page, check suggestions, map or invite.

---

## Where to look in the code

| Concern | File |
|---|---|
| Identity matching logic (3 paths) | `lib/xapi/mappings.ts → resolveXapiUser` |
| Auto-heal logic | `lib/xapi/reprocess.ts → autoHealUnmatchedXapiEvents` |
| Auto-heal cron | `app/api/cron/coursera-auto-heal/route.ts` (hourly) |
| Auto-heal manual trigger | `POST /api/admin/coursera/auto-heal` |
| Inbound pipeline | `lib/xapi/inboundStatementPipeline.ts` |
| Webhook entry | `app/api/webhooks/coursera/route.ts` |
| Mapping CRUD endpoint | `app/api/admin/coursera/mappings/route.ts` |
| Unmatched-detail page | `app/admin/coursera/learners/unmatched/[externalEmail]/page.tsx` |

---

## Auto-heal — what it does and when it runs

`autoHealUnmatchedXapiEvents(limit=200)` (in `lib/xapi/reprocess.ts`) does:

1. Find rows in `coursera_xapi_events` with `completion_status='unmatched'`
   that **don't already have a mapping** (defensive).
2. For each row, look up `users.email` case-insensitively against
   `actor_email`.
3. If a user is found:
   - Insert/update a row in `coursera_identity_mappings` (source `auto-healed`).
   - Re-run the inbound pipeline against the original raw payload — which
     now hits Path 1 or 2 and writes a real `CourseProgress` row.

**Schedules:**
- **Hourly cron**: `/api/cron/coursera-auto-heal` (added 2026-05-07; was
  fire-on-demand only before).
- **Manual**: `POST /api/admin/coursera/auto-heal` from the admin UI.

**Caveats:**
- Only handles rows where `actor_email` is set. If Coursera sent only
  `actor_identifier` (account-based actor, no mbox), auto-heal can't help —
  needs a manual actor mapping.
- Runs in priority order (newest first). Capped at 200 per run.

---

## Filtering test traffic (recommended)

The "129 unresolved" feels alarming. Once you separate test traffic it's
**46 unresolved across 2 real members** (Robert: 9, Drew: 37) — both
mappable in 30 seconds via the detail page.

A future PR should tag users with `email LIKE '%test%' OR email LIKE 'force-%'`
or an explicit `is_test` flag and filter them out of the admin view by
default. Tracked as **MATCHING-DEBT-001**.

---

## Document history

| Date | Change |
|---|---|
| 2026-05-07 | Initial doc; `/api/cron/coursera-auto-heal` added; unmatched detail page upgraded to surface xAPI events + suggested matches |

---

*Update this doc whenever the matching pipeline or the unmatched-learner
detail page changes.*
