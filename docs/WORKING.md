# Notifications Confirmed Working

**Date:** 2026-03-20

These notifications are implemented and will work when `RESEND_API_KEY` is configured.

---

## Partner Notifications

| Notification | Condition | Notes |
|--------------|-----------|-------|
| **Program enrollment** | Member has `PartnerReferral` and partner has `contactEmail` | Sent on enroll, admin create, admin program change |
| **Course completed** | Same | Sent when member marks course complete |
| **Certification earned** | Same | Sent when member marks cert earned (first time only) |
| **Job placement** | Same | Sent when admin records first placement for member |
| **New member assigned** | Partner has `contactEmail` | Sent when admin assigns partner to member via partner assignment |

**Implementation:** `lib/notifications/partner-notify.ts` – no-ops gracefully when no referral/partner, no contact email, or Resend not configured.

---

## Member Notifications

| Notification | Condition | Notes |
|--------------|-----------|-------|
| **Assessment complete** | User authenticated, Resend configured | Branded HTML email with dashboard CTA |

**Implementation:** `app/api/member/assessment/submit/route.ts` – uses `brandedEmailLayout()`.

---

## Admin Notifications

| Notification | Condition | Notes |
|--------------|-----------|-------|
| **Contact form** | Resend configured | Plain text to info@workforceap.org, replyTo set to submitter |
| **New assessment** | Resend configured | Plain text to info@workforceap.org with link to admin |

**Implementation:** Contact form returns 503 if Resend not configured; assessment emails fail silently (API still returns 200).

---

## Auth Notifications (Supabase)

| Notification | Condition | Notes |
|--------------|-----------|-------|
| **Confirm signup** | Supabase Auth SMTP configured | Via `signUp()` |
| **Reset password** | Same | Via `resetPasswordForEmail()` |
| **Invite user** | Same | Via `inviteUserByEmail()` (partner invite, admin create member) |

**Configuration:** Supabase Dashboard → Auth → SMTP Settings. Use Resend SMTP (smtp.resend.com) for branded emails.

---

## Test Checklist

To verify working:

1. **Contact form:** Submit at `/contact` → check info@workforceap.org inbox
2. **Assessment:** Complete assessment as member → check member inbox + info@workforceap.org
3. **Partner milestone:** Create member with partner, enroll in program → check partner contactEmail
4. **Auth:** Sign up, request password reset → check member inbox
