# Future state: when a learner joins Coursera, auto-invite them to WAP

> **Status:** Deferred. Out of scope for the puller + manual reconcile UI
> shipped in `claude/coursera-b4b-puller-and-reconcile-S52it`. This doc
> captures the design so we don't have to rediscover it in 6 months.

## Problem

Today the flow is:

1. A partner adds a learner to the Coursera "Workforce Advancement Project" org.
2. The learner shows up in `b4bClient.listUsers()`, but they have no
   WorkforceAP account.
3. An admin runs the reconcile UI, sees them as `coursera-only`, and clicks
   "Add to WorkforceAP" per row.

That step 3 is the manual fallback. The future state is to auto-invite
learners by email as soon as they appear in the Coursera roster — but the
auto-invite has to be FERPA-friendly (we are operating on identifiable
education records of people who have not yet consented to a WAP account),
which is why it is deferred.

## Trigger

A nightly cron (likely `app/api/cron/coursera-invite-on-join/route.ts`)
that does:

```ts
const roster = await listAllUsers({ pageLimit: 1000 });
const wapEmails = await db.user.findMany({ select: { email: true } });
const alreadyInvited = await db.courseraJoinInviteLog.findMany({ select: { email: true } });

const newEmails = roster.elements
  .map((u) => u.email?.trim().toLowerCase())
  .filter(Boolean)
  .filter((email) => !wapEmailsSet.has(email))
  .filter((email) => !alreadyInvitedSet.has(email));

for (const email of newEmails) {
  await sendCourseraJoinInviteEmail(email);
  await db.courseraJoinInviteLog.create({ data: { email, sentAt: new Date() } });
}
```

## Required infrastructure

### `coursera_join_invite_log` table

Dedupe so we never re-invite. Minimal schema:

```sql
CREATE TABLE coursera_join_invite_log (
  email           TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  invite_sent_at  TIMESTAMPTZ,
  invite_clicked_at TIMESTAMPTZ,
  declined_at     TIMESTAMPTZ,
  /** opaque token used in the decline link (HMAC over email + secret) */
  decline_token   TEXT NOT NULL
);
```

Two reasons this lives in its own table rather than re-using
`coursera_identity_mappings`:

1. The mapping table assumes a WAP `User` exists; for an invitee we may
   never get one (they decline).
2. We want to track "first seen" separately from "invite sent" so we can
   tune the cadence (e.g. wait 24h before inviting, in case they're
   bulk-loaded as a roster import).

### Existing `EmailService`

The cron uses the existing email subsystem. Template name
`coursera-join-invite` should sit alongside the other transactional
templates in `emails/` so the React Email preview server picks it up.

### Decline link

Each invite carries an HMAC-signed decline link:

```
https://www.workforceap.org/coursera/decline?email=...&token=...
```

The handler verifies the token, sets `declined_at`, and returns a public
"You won't hear from us again" page. Future invites for that email are
suppressed by an additional `WHERE declined_at IS NULL` clause in the cron.

## Consent posture (FERPA)

The invite copy must read like an opt-in, not a notification:

> Hi, you were recently added to the Coursera "Workforce Advancement
> Project" org. WorkforceAP is the partner platform that complements
> your Coursera courses with career coaching, resume support, and
> employer matching. **Would you like a WorkforceAP account?**
>
> [Yes, create my WorkforceAP account]
>
> [No thanks — don't email me again]
>
> If you don't take action, we won't email you again. Your Coursera
> learning will continue regardless of what you decide here.

Key constraints:

- **Single-touch.** One email per address ever, unless they click "Yes".
  Re-running the cron MUST NOT re-send.
- **Honor decline.** Once `declined_at` is set, the email is suppressed
  forever, even if the row is re-imported via Coursera roster changes.
- **No identifiable content.** Don't disclose course progress, badges,
  or other education-record details in the email itself.
- **Tenant-scoped.** Each organization's invite copy must come from the
  tenant's branding (don't leak partner-specific names across tenants).

## When to ship this

Ship the auto-invite cron only after the following are all true:

- [ ] FERPA review with Mike has signed off on the email copy and the
      decline mechanism.
- [ ] Legal has confirmed the org-to-WAP data flow is covered by the
      Coursera For Business DPA we already have.
- [ ] We have a measured per-tenant invite cap (e.g. <500 invites/day) so
      we don't accidentally send 50k emails on first cron run after a
      large partner import.
- [ ] The reconcile UI's "Add to WorkforceAP" button has been used in
      anger by at least one tenant — i.e. the manual path is proven
      before we automate it.
- [ ] `coursera_join_invite_log` table is migrated, with backfill from
      existing `coursera_identity_mappings` rows so already-mapped users
      aren't re-invited.

## Out of scope for THIS PR

The PR that introduces this doc (`claude/coursera-b4b-puller-and-reconcile-S52it`)
ships:

- the typed `b4bClient` against the 6 working endpoints
- `GET /api/admin/coursera/reconcile` — diff between Coursera roster and WAP
- `POST /api/admin/coursera/reconcile/add-to-wap` — manual per-row add
- the `/admin/coursera` reconcile card UI

It explicitly does NOT ship:

- the `coursera_join_invite_log` table
- the nightly cron
- any auto-invite email
- a public decline endpoint

Those land in the follow-up PR once the checklist above is satisfied.
