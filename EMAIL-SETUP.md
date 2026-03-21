# WorkforceAP Email Configuration Guide

## Overview
WorkforceAP uses **Resend** for transactional email delivery (contact forms, notifications, alerts).

---

## Current Status

| Environment | Status | Notes |
|-------------|--------|-------|
| **Vercel Production** | ❌ NOT CONFIGURED | Missing RESEND_API_KEY |
| **Local Development** | ⚠️ UNVERIFIED | Requires .env.local setup |

---

## Required Environment Variables

| Variable | Example Value | Where to Get It |
|----------|---------------|-----------------|
| `RESEND_API_KEY` | `re_1234567890abcdef` | [Resend Dashboard](https://resend.com/api-keys) |
| `EMAIL_FROM` | `info@workforceap.org` | Your domain (any valid email) |
| `EMAIL_TO_ADMIN` | `info@workforceap.org` | Where admin alerts go |

---

## Vercel Setup Instructions

### Step 1: Get Resend API Key
1. Go to https://resend.com
2. Sign up/login with your email
3. Navigate to **API Keys** → **Create API Key**
4. Name: `WorkforceAP Production`
5. Permissions: `Sending` (minimum required)
6. Copy the key (starts with `re_`)

### Step 2: Add to Vercel
1. Go to https://vercel.com/dashboard
2. Select `workforceap-beta` project
3. Click **Settings** tab
4. Click **Environment Variables** in left sidebar
5. Add each variable:
   - Name: `RESEND_API_KEY`
   - Value: (paste your key)
   - Environment: Production ✓, Preview ✓, Development (optional)
6. Repeat for `EMAIL_FROM` = `info@workforceap.org`
7. Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click the latest deployment
3. Click **Redeploy** → **Use Existing Build Cache**
4. Wait for deployment to complete (~2 minutes)

### Step 4: Test
1. Go to https://www.workforceap.org/contact
2. Submit test form with your email
3. Check inbox (and spam folder) for email

---

## Domain Authentication (Recommended)

For better deliverability (emails not going to spam), set up domain authentication:

### Resend Domain Setup
1. In Resend dashboard → **Domains** → **Add Domain**
2. Enter: `workforceap.org`
3. Resend will provide DNS records (SPF, DKIM, DMARC)

### DNS Configuration
Add these records to your domain registrar (where workforceap.org is managed):

**Type: TXT** (SPF)
```
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**Type: TXT** (DKIM)
```
Name: resend._domainkey
Value: (copy from Resend dashboard)
```

**Type: TXT** (DMARC - optional but recommended)
```
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@workforceap.org
```

### Verification
- Return to Resend dashboard
- Click **Verify** next to your domain
- May take 5-30 minutes for DNS to propagate

---

## Testing Checklist

| Test | How | Expected Result |
|------|-----|-----------------|
| Contact form | Submit on /contact | Email to info@workforceap.org |
| Application submit | Apply as test user | Admin alert email |
| Application accept | Accept in admin | Welcome email to applicant |
| Partner milestone | Enroll member | Partner notification |

---

## Troubleshooting

### "Email service is not configured"
- Missing `RESEND_API_KEY` in Vercel env vars
- Fix: Add key and redeploy

### Emails going to spam
- Domain not authenticated (add SPF/DKIM records)
- Sender reputation (use authenticated domain)
- Email content (avoid spam trigger words)

### "Invalid API key"
- Key copied incorrectly
- Key has wrong permissions (needs "Sending")
- Fix: Regenerate key in Resend dashboard

### No emails received
- Check spam/junk folder
- Verify `EMAIL_FROM` domain matches verified domain in Resend
- Check Resend dashboard for delivery logs

---

## Nonprofit License Context

**Status:** Approved for 10 free nonprofit licenses  
**Applies to:** Other services (not Resend — Resend has generous free tier)  
**Action Needed:** Identify which services need licenses (Google Workspace, Slack, etc.)

---

## Related Files

- `lib/email.ts` — Email sending functions
- `app/api/contact/route.ts` — Contact form handler
- `app/api/applications/route.ts` — Application submission
- `emails/` — Email templates (React Email)

---

*Last updated: 2026-03-20*
