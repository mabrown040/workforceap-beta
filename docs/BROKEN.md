# Broken Notifications – Fixes Required

**Date:** 2026-03-20

---

## 1. Assessment Emails Fail Silently

**Location:** `app/api/member/assessment/submit/route.ts`  
**Severity:** Medium

**Issue:** When `RESEND_API_KEY` is set but email send fails (e.g. invalid key, rate limit), the API still returns `{ ok: true }`. The member and admin never know the emails failed.

**Fix:** Either:
- Log the error and surface a warning to the client, or
- Return a partial success response when emails fail (e.g. `{ ok: true, emailsSent: false }`), or
- Fail the request when admin email fails (critical for ops)

**Recommended:** Log error, return 200 with `emailsSent: boolean` so UI can show "Check your email" only when member email succeeded.

---

## 2. Email Template Logo 404

**Location:** `lib/email/template.ts`  
**Severity:** Low

**Issue:** `brandedEmailLayout()` references `${SITE_URL}/images/logo-tight.png`. The file `public/images/logo-tight.png` does not exist (only `microsoft-logo.svg`, `ibm-logo.svg` in public/images). Emails will show broken image.

**Fix:** Add `public/images/logo-tight.png` or update template to use an existing logo (e.g. SVG or hosted URL).

---

## 3. Partner Milestone: No Error Propagation

**Location:** `lib/notifications/partner-notify.ts`  
**Severity:** Low

**Issue:** `sendPartnerMilestoneEmail` catches errors and logs them but does not propagate. Callers (enroll, courses/complete, certifications, placements) cannot know if the email failed. For most flows this is acceptable (fire-and-forget), but admins may want visibility.

**Fix:** Consider adding optional callback or returning a result for admin flows. Optional; current behavior may be intentional.

---

## 4. Contact Form: No HTML Version

**Location:** `app/api/contact/route.ts`  
**Severity:** Low

**Issue:** Contact form sends plain text only. Some email clients render plain text poorly. Branded HTML would improve readability.

**Fix:** Use `brandedEmailLayout()` or a simple HTML template for contact form notifications.

---

## 5. Partner Notify: Redundant Map

**Location:** `lib/notifications/partner-notify.ts` line 59  
**Severity:** Trivial

**Issue:** `...detailLines.map((l) => (l ? l : '')).filter(Boolean)` – `detailLines` is already built with truthy values. The map is redundant.

**Fix:** Use `...detailLines` directly.
