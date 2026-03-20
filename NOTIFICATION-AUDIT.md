# Notification System Audit

**Last updated:** 2026-03-20  
**Phase 2:** Missing notifications implemented.

## Implemented Notifications

### P1: Application Status (Critical)

| Notification | Trigger | Recipient | Status |
|--------------|---------|-----------|--------|
| Application Accepted | Admin approves application | Applicant | ✅ Implemented |
| Application Rejected | Admin rejects application | Applicant | ✅ Implemented |
| New Application Admin Alert | New application submitted (signup) | info@workforceap.org | ✅ Implemented |

### P2: Member Progress

| Notification | Trigger | Recipient | Status |
|--------------|---------|-----------|--------|
| Program Enrollment Confirmation | Member enrolls in program | Member | ✅ Implemented |
| Course Completion Congratulations | Member completes course | Member | ✅ Implemented |
| Weekly Recap Email | Weekly cron (Sundays 6 PM) | Active members | ✅ Implemented |

### P3: Engagement

| Notification | Trigger | Recipient | Status |
|--------------|---------|-----------|--------|
| Inactive Member Nudge | 7 days inactive | Inactive member | ✅ Implemented |

## Implementation Details

- **Email provider:** Resend
- **Templates:** `emails/*.ts` using `lib/email/template.ts` branded layout
- **Send functions:** `lib/email.ts`
- **Cron routes:** `/api/cron/weekly-recap`, `/api/cron/inactive-nudge`
- **Vercel Cron:** `vercel.json` schedules Sundays 6 PM (weekly recap) and daily 10 AM (inactive nudge)

## Triggers Wired

- `app/api/member/signup/route.ts` → New application admin email
- `app/api/admin/members/[id]/status/route.ts` → Accept/reject emails
- `app/api/member/enroll/route.ts` → Program enrollment confirmation
- `app/api/member/courses/complete/route.ts` → Course completion congratulations

## Environment Variables

- `RESEND_API_KEY` – Required for sending
- `EMAIL_FROM` – Sender (default: noreply@workforceap.org)
- `CRON_SECRET` – Required for cron endpoints (Bearer token in Authorization header)
