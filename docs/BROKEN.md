# Broken Notifications – Status

**Original audit:** 2026-03-20
**Last reviewed:** 2026-05-03

All five originally-flagged issues have been verified against the current
code base. Status below.

---

## 1. Assessment Emails Fail Silently — RESOLVED 2026-05-03

**Location:** `app/api/member/assessment/submit/route.ts`

The route now returns both `emailsSent` (member) and `adminEmailSent`
(admin) so the client can detect partial-success states and surface a
warning when the admin notification did not go out.

PR #953.

---

## 2. Email Template Logo 404 — RESOLVED

**Location:** `lib/email/template.ts` referenced `/images/logo-tight.png`.

`public/images/logo-tight.png` and `logo-tight.svg` both exist in the
repo. The branded layout renders correctly.

---

## 3. Partner Milestone: No Error Propagation — INTENTIONAL

**Location:** `lib/notifications/partner-notify.ts`

`sendPartnerMilestoneEmail` catches errors and logs them. This is
intentional fire-and-forget behavior so a partner email failure never
blocks the user-facing flow (enroll, course complete, certify, place).

If admin visibility is needed later, surface failures via an
`AuditLog` entry rather than changing the function signature.

---

## 4. Contact Form: No HTML Version — RESOLVED

**Location:** `app/api/contact/route.ts`

Sends both `text` and `html` (the latter via `brandedEmailLayout()`).
HTML body is built with `escapeHtml()` for safety.

---

## 5. Partner Notify: Redundant Map — RESOLVED

**Location:** `lib/notifications/partner-notify.ts`

`detailLines` is now built directly with a guarded `for…of` push:

```ts
const detailLines: string[] = [];
if (details) {
  for (const [k, v] of Object.entries(details)) {
    if (v) detailLines.push(`${k}: ${v}`);
  }
}
```

No redundant `.map().filter()` chain remains.
