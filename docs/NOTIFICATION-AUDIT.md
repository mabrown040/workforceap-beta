# Notification System Audit

**Date:** 2026-03-20  
**Scope:** All email/notification flows for members, partners, and admins

---

## 1. Email Provider

| Provider | Usage | Config |
|----------|-------|--------|
| **Resend** | All app-triggered transactional emails | `RESEND_API_KEY`, `EMAIL_FROM` |
| **Supabase Auth SMTP** | Auth emails (confirm, password reset, invite) | Configure in Supabase Dashboard → Auth → SMTP |

**Environment variables:**
- `RESEND_API_KEY` – Required for app emails; optional in dev
- `EMAIL_FROM` – Sender address (default: `noreply@workforceap.org`)

---

## 2. All Notification Types

### Partner Notifications

| Notification | Trigger | Recipient | Location | Status |
|--------------|---------|-----------|----------|--------|
| Member enrolled in program | Member enrolls, admin assigns program, or admin creates member | Partner `contactEmail` | `lib/notifications/partner-notify.ts` | Implemented |
| Member completed course | Member marks course complete | Partner `contactEmail` | `app/api/member/courses/complete/route.ts` | Implemented |
| Member earned certification | Member marks cert earned | Partner `contactEmail` | `app/api/member/certifications/route.ts` | Implemented |
| Member placed in job | Admin records placement | Partner `contactEmail` | `app/api/admin/placements/route.ts` | Implemented |
| New member assigned to partner | Admin assigns partner to member | Partner `contactEmail` | `lib/notifications/partner-notify.ts` | Implemented |
| Weekly/monthly partner summary | — | — | — | **Missing** |

### Member/Student Notifications

| Notification | Trigger | Recipient | Location | Status |
|--------------|---------|-----------|----------|--------|
| Welcome / Email verification | Signup (Supabase Auth) | Member | Supabase Auth | Via Supabase |
| Password reset | Forgot password | Member | Supabase Auth | Via Supabase |
| Assessment complete | Member submits pre-assessment | Member | `app/api/member/assessment/submit/route.ts` | Implemented |
| Application submitted confirmation | — | Member | — | **Missing** (application is internal) |
| Application accepted/rejected | Admin changes status | Member | — | **Missing** |
| Course enrollment confirmation | Member enrolls | Member | — | **Missing** |
| Course completion | Member completes course | Member | — | **Missing** |
| Certification earned | Member marks cert | Member | — | **Missing** |
| Counselor assigned | — | Member | — | **Missing** |
| Weekly recap available | Cron or member request | Member | — | **Missing** (API exists, no email) |
| Deadline reminders | — | Member | — | **Missing** |
| Inactive nudge | Cron (7+ days inactive) | Member | `app/api/cron/automations/route.ts` | **TODO** |

### Admin Notifications

| Notification | Trigger | Recipient | Location | Status |
|--------------|---------|-----------|----------|--------|
| Contact form submission | Public submits contact form | `info@workforceap.org` | `app/api/contact/route.ts` | Implemented |
| New assessment submitted | Member completes assessment | `info@workforceap.org` | `app/api/member/assessment/submit/route.ts` | Implemented |
| New application submitted | Member signs up | — | — | **Missing** (no admin email on signup) |
| Partner signup request | — | — | — | N/A (no partner self-signup) |
| Member milestone achieved | — | — | — | Via partner notifications |
| System errors/alerts | — | — | — | **Missing** |
| Weekly summary report | — | — | — | **Missing** |

---

## 3. Code Locations

### Email Sending (Resend)

| File | Purpose |
|------|---------|
| `app/api/contact/route.ts` | Contact form → info@workforceap.org |
| `app/api/member/assessment/submit/route.ts` | Admin notification + member branded email |
| `lib/notifications/partner-notify.ts` | Partner milestone emails (4 types) |

### Email Templates

| File | Purpose |
|------|---------|
| `lib/email/template.ts` | `brandedEmailLayout()` – dark header, white body, CTA |

### Auth Emails (Supabase)

- **Confirm signup** – Supabase Auth (SMTP in dashboard)
- **Reset password** – Supabase Auth
- **Invite user** – `supabase.auth.admin.inviteUserByEmail()` (partner invite, admin create member)

---

## 4. Trigger Call Sites

| Notification | Call Sites |
|--------------|------------|
| Partner: Program enrollment | `app/api/member/enroll/route.ts`, `app/api/admin/members/create/route.ts`, `app/api/admin/members/[id]/program/route.ts` |
| Partner: Course completed | `app/api/member/courses/complete/route.ts` |
| Partner: Certification earned | `app/api/member/certifications/route.ts` |
| Partner: Job placement | `app/api/admin/placements/route.ts` |
| Partner: New member assigned | `app/api/admin/members/[id]/partner/route.ts` |
| Admin: Contact form | `app/api/contact/route.ts` (POST from contact page) |
| Admin: New assessment | `app/api/member/assessment/submit/route.ts` |
| Member: Assessment complete | `app/api/member/assessment/submit/route.ts` |

---

## 5. Configuration Checklist

- [ ] `RESEND_API_KEY` set in production
- [ ] `EMAIL_FROM` set (e.g. `noreply@workforceap.org`)
- [ ] Domain verified in Resend (workforceap.org)
- [ ] Supabase Auth SMTP configured (Resend SMTP: smtp.resend.com, port 465/587)
- [ ] Supabase email templates customized (confirm, reset)

---

## 6. Dependencies

- `resend` ^4.0.1 (package.json)
- No SendGrid, AWS SES, or Nodemailer
