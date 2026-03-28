## Deep QA — 2026-03-25 Pass 2

### ISSUE-004 — Employer job card PAY column: "Compensation not set" wraps mid-word
On the employer jobs board, job cards with no pay set showed "Compensati on not set" due to word-break
on a narrow grid column. Fix: shortened fallback string to "Not set".

Pages audited this pass (all passed except ISSUE-004):
- admin/programs, admin/blog, admin/jobs, admin/employers, admin/partners, admin/subgroups, admin/certifications, admin/settings
- dashboard/learning, dashboard/certifications, dashboard/messages, dashboard/readiness
- employer/jobs, employer/pipeline
- Mobile 375px: employer portal, member portal

Health score: 93 to 96/100
