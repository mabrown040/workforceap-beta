# Branded Email Setup (Resend + Supabase)

WorkforceAP uses Resend for transactional emails. This guide covers configuring branded emails for auth (Supabase) and app-triggered emails.

## 1. Resend Configuration

- Create a Resend account at [resend.com](https://resend.com)
- Add and verify your domain (e.g. `workforceap.org`)
- Create an API key and set `RESEND_API_KEY` in your environment
- Set `EMAIL_FROM` (e.g. `noreply@workforceap.org`)

## 2. Supabase Auth → Resend SMTP

To replace Supabase's default auth emails (Confirm, Password Reset) with Resend:

1. In **Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Use Resend's SMTP credentials:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (TLS)
   - **Username:** `resend`
   - **Password:** Your Resend API key (`re_...`)

4. Set **Sender email** to your verified domain (e.g. `noreply@workforceap.org`)
5. Set **Sender name** to `Workforce Advancement Project`

## 3. Customize Supabase Email Templates

In **Supabase Dashboard** → **Authentication** → **Email Templates**:

### Confirm signup
- **Subject:** `Confirm your WorkforceAP account`
- **Body:** Use Supabase variables (`{{ .ConfirmationURL }}`, `{{ .Email }}`) with your branding. Example:

```html
<h2>Confirm your email</h2>
<p>Thanks for signing up for Workforce Advancement Project. Click below to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#4a9b4f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Confirm Email</a></p>
<p>Or copy this link: {{ .ConfirmationURL }}</p>
<p>— WorkforceAP Team</p>
```

### Reset password
- **Subject:** `Reset your WorkforceAP password`
- **Body:** Use `{{ .ConfirmationURL }}` for the reset link.

## 4. App-Triggered Emails

These are sent by the Next.js app via Resend:

| Email | Trigger | Recipient |
|-------|---------|-----------|
| Assessment Complete | Member completes pre-assessment | Member |
| Contact Form | Public submits contact form | info@workforceap.org |
| New Assessment (admin) | Member completes assessment | info@workforceap.org |

The app uses `lib/email/template.ts` for branded HTML layout (dark header, white body, footer).
