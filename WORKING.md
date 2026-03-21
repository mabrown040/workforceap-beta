# WORKING.md

Notes for developers working on WorkforceAP.

## Notification System (Phase 2 – 2026-03-20)

Seven missing notifications have been implemented:

1. **Application Accepted** – Sent when admin approves application
2. **Application Rejected** – Sent when admin denies application
3. **New Application Admin Alert** – Sent when user signs up (creates Application)
4. **Program Enrollment Confirmation** – Sent when member enrolls in a program
5. **Course Completion Congratulations** – Sent when member completes a course
6. **Weekly Recap Email** – Cron Sundays 6 PM to enrolled members
7. **Inactive Member Nudge** – Cron daily to members inactive 7+ days

See `NOTIFICATION-AUDIT.md` for full details. Cron endpoints require `CRON_SECRET` and `Authorization: Bearer <CRON_SECRET>`.
