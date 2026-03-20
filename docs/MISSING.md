# Missing Notifications

**Date:** 2026-03-20

Notifications that should exist but are not implemented.

---

## Partner Notifications (Requested by Mike)

### ~~New Member Assigned to Partner~~ ✅ Implemented

**Status:** Implemented in `lib/notifications/partner-notify.ts` and `app/api/admin/members/[id]/partner/route.ts`.

---

### Weekly/Monthly Partner Summary

**Trigger:** Cron job (e.g. weekly).

**Recipient:** Partner `contactEmail`

**Content:** Summary of member progress: enrollments, courses completed, certifications, placements in the period.

**Priority:** Medium – nice-to-have for partner engagement.

---

## Member Notifications

### Application Accepted/Rejected

**Trigger:** Admin changes application status to APPROVED or DENIED in `PATCH /api/admin/members/:id/status`.

**Recipient:** Member email (from `application.user.email`)

**Content:**
- **Approved:** "Your application has been approved. Log in to access your training."
- **Denied:** "Your application status has been updated. Log in to view details."

**Priority:** High – members expect to be notified of status changes.

---

### Course Enrollment Confirmation

**Trigger:** Member enrolls in program via `POST /api/member/enroll`.

**Recipient:** Member email

**Content:** "You're enrolled in [Program]. Access your courses in the dashboard."

**Priority:** Medium – reinforces commitment.

---

### Course Completion

**Trigger:** Member marks course complete via `POST /api/member/courses/complete`.

**Recipient:** Member email

**Content:** "Congratulations! You completed [Course]. Keep going in your program."

**Priority:** Low – partner already gets notified; member sees it in UI.

---

### Counselor Assigned

**Trigger:** Admin assigns counselor to member (if such feature exists).

**Recipient:** Member email

**Content:** "[Counselor Name] has been assigned as your career counselor. Schedule a meeting from your dashboard."

**Priority:** Depends on product – verify if counselor assignment exists.

---

### Weekly Recap Email

**Trigger:** Cron (e.g. Monday morning) or on-demand.

**Recipient:** Member email

**Content:** "Your weekly recap is ready" with summary (from `lib/recap/generate.ts`). Link to dashboard.

**Priority:** Medium – increases engagement.

---

### Deadline Reminders

**Trigger:** Cron – members with upcoming program/course deadlines.

**Recipient:** Member email

**Content:** "Reminder: [Deadline] is approaching for [Program/Course]."

**Priority:** Low – depends on whether deadlines are tracked.

---

### Inactive Nudge

**Trigger:** Cron automations – members with no activity in 7+ days.

**Recipient:** Member email

**Content:** "We miss you! Pick up where you left off in your training."

**Status:** TODO in `app/api/cron/automations/route.ts` line 42.

**Priority:** Medium – re-engagement.

---

## Admin Notifications

### New Application Submitted

**Trigger:** Member completes signup with application (`POST /api/member/signup` or apply flow).

**Recipient:** info@workforceap.org (or configurable)

**Content:** "New application from [Name]. Review in admin."

**Priority:** High – admins need to know when to review.

---

### System Errors/Alerts

**Trigger:** Critical errors (e.g. payment failure, auth outage). Would require error boundary or Sentry webhook.

**Recipient:** Admin email

**Priority:** Low – depends on monitoring setup.

---

### Weekly Summary Report

**Trigger:** Cron (e.g. Monday).

**Recipient:** Admin email

**Content:** Metrics: new signups, assessments, enrollments, completions, placements.

**Priority:** Low – reporting.
