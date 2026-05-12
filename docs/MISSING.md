# Notification Audit

**Last reviewed:** 2026-05-12

This file tracks notification gaps. The priority labels reflect impact: HIGH means a stakeholder reaches for the platform and finds silence in a moment that erodes trust.

---

## ✅ Implemented (audited and confirmed wired)

| Notification | Trigger | Recipient | Wired in |
|---|---|---|---|
| **New member assigned to partner** | Admin assigns member to a partner | Partner `contactEmail` | `lib/notifications/partner-notify.ts`, `app/api/admin/members/[id]/partner/route.ts` |
| **Application accepted** | Admin sets `Application.status = APPROVED` | Member email | `app/api/admin/members/[id]/status/route.ts` (calls `sendEnrollmentConfirmationEmail`) |
| **Application denied** | Admin sets `Application.status = DENIED` | Member email | `app/api/admin/members/[id]/status/route.ts` (calls `sendApplicationRejectedEmail`) |
| **Counselor assigned** | Admin assigns counselor to a member | Member email | `app/api/admin/members/[id]/counselor/route.ts` (calls `sendCounselorAssignedEmail`) |
| **Course enrollment confirmation** | Member enrolls via `/api/member/enroll` | Member email | `app/api/member/enroll/route.ts` (calls `sendCourseEnrolledEmail`) |
| **Inactive nudge** | Daily / weekly cron, 7+ and 14+ day windows | Member email | `app/api/cron/inactive-nudge/route.ts`, `app/api/cron/inactivity-nudge/route.ts` |
| **Application submitted (admin alert)** | Member completes apply signup | `info@workforceap.org` | `app/api/apply/signup/route.ts` — wired 2026-05-07 |
| **Application submitted (member confirmation)** | Member completes apply signup | Member email | `app/api/apply/signup/route.ts` — wired 2026-05-07 |
| **Pre-screening interview ready (admin alert)** | Member completes pre-screening | `info@workforceap.org` | `sendPreScreeningReadyEmail` (called from pre-screening completion) |
| **Partner weekly digest** | Cron | Partner contact | `sendPartnerWeeklyDigest` |
| **Partner milestone events** (enrollment, course, certification, placement) | Per-event triggers | Partner contact (per opt-in) | `lib/notifications/partner-notify.ts` (fire-and-forget) |
| **Member weekly recap email** | Cron (Vercel) Sun 18:00 UTC | Enrolled members without a recap row for current week | `app/api/cron/weekly-recap/route.ts`, `sendWeeklyRecapEmail`, `lib/recap/generate.ts` |
| **Admin weekly recap email** | Cron (Vercel) Fri 22:00 UTC | Internal admin recipients (`sendAdminWeeklyRecapEmail`) | `app/api/cron/weekly-recap-email/route.ts` |

---

## Outstanding gaps (not yet wired)

### Course completion celebration (member)

**Trigger:** `POST /api/member/courses/complete` or equivalent course-completion event.
**Recipient:** Member email.
**Content:** "Congratulations on completing [Course]. Here's what's next."
**Priority:** Low — partner already gets the milestone email; member sees the completion in the UI; counselor triage already surfaces a milestone-celebrate flag for outbound nudge. Acceptable to defer.
**Helper:** `sendCourseCompletedEmail` exists in `lib/email.ts` (template: `emails/course-completed.ts`).

### Deadline reminders

**Trigger:** Cron — members with upcoming program/course deadlines.
**Recipient:** Member email.
**Priority:** Low — depends on whether deadlines are tracked. Currently they aren't, so no-op until they are.

### System errors / Sentry alerts

**Trigger:** Critical errors via Sentry webhook.
**Recipient:** Admin email / Slack.
**Priority:** Low (Sentry already sends alerts to its own UI; this would be a redundant channel).

---

## Note on `app/api/cron/automations/route.ts`

The previous version of this doc claimed an inactive-nudge TODO existed at line 42 of that file. As of 2026-05-07 the inactive-nudge work is **shipped** in `app/api/cron/inactive-nudge/` and `app/api/cron/inactivity-nudge/` (two different windows). The `automations/route.ts` reference is stale.
