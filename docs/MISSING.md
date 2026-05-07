# Notification Audit

**Last reviewed:** 2026-05-07

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

---

## Outstanding gaps (not yet wired)

### Course completion celebration (member)

**Trigger:** `POST /api/member/courses/complete` or equivalent course-completion event.
**Recipient:** Member email.
**Content:** "Congratulations on completing [Course]. Here's what's next."
**Priority:** Low — partner already gets the milestone email; member sees the completion in the UI; counselor triage already surfaces a milestone-celebrate flag for outbound nudge. Acceptable to defer.
**Helper:** `sendCourseCompletedEmail` exists in `lib/email.ts` (template: `emails/course-completed.ts`).

### Weekly recap email to member

**Trigger:** Cron — Monday morning, generates `WeeklyRecap` row and emails it.
**Recipient:** Member email.
**Priority:** Medium — increases engagement.
**Helper:** `sendWeeklyRecapEmail` exists; cron not deployed.
**Status:** Generation logic in `lib/recap/generate.ts`; no scheduled cron route yet.

### Deadline reminders

**Trigger:** Cron — members with upcoming program/course deadlines.
**Recipient:** Member email.
**Priority:** Low — depends on whether deadlines are tracked. Currently they aren't, so no-op until they are.

### Admin weekly summary report

**Trigger:** Cron — Monday morning.
**Recipient:** Admin email.
**Priority:** Low — admin has `/admin/outcomes` for live numbers; weekly email is convenience, not critical.
**Helper:** `sendAdminWeeklySummaryEmail` exists (template: `emails/admin-weekly-recap.ts`); cron not deployed.

### System errors / Sentry alerts

**Trigger:** Critical errors via Sentry webhook.
**Recipient:** Admin email / Slack.
**Priority:** Low (Sentry already sends alerts to its own UI; this would be a redundant channel).

---

## Note on `app/api/cron/automations/route.ts`

The previous version of this doc claimed an inactive-nudge TODO existed at line 42 of that file. As of 2026-05-07 the inactive-nudge work is **shipped** in `app/api/cron/inactive-nudge/` and `app/api/cron/inactivity-nudge/` (two different windows). The `automations/route.ts` reference is stale.
