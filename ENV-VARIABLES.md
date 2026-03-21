# WorkforceAP Environment Variables — Production Configuration

**File:** `.env.local` (for local dev) or Vercel Environment Variables (for production)  
**Last Updated:** 2026-03-20  
**Status:** ⚠️ Production missing RESEND_API_KEY

---

## Required Variables

### Email Service (Resend)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `RESEND_API_KEY` | ❌ **NOT SET** — Add from https://resend.com/api-keys | (your dev key) | Resend Dashboard |
| `EMAIL_FROM` | `info@workforceap.org` | `info@workforceap.org` | Your domain |
| `EMAIL_TO_ADMIN` | `info@workforceap.org` | (your test email) | Admin notification recipient |

### Database (Supabase)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | (set in Vercel) | (same) | Supabase Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (set in Vercel) | (same) | Supabase Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | (set in Vercel) | (same) | Supabase Project Settings → API |

### Authentication (Supabase Auth)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.workforceap.org` | `http://localhost:3000` | Your domain |

### Optional: Analytics/Monitoring
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `NEXT_PUBLIC_GA_ID` | (optional) | (optional) | Google Analytics |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` | (auto-set by Vercel) | — | Vercel |

---

## Current Vercel Production Status

**Checked:** 2026-03-20  
**Status:** ❌ INCOMPLETE — Email service broken

**Missing:**
- [ ] `RESEND_API_KEY` — Critical for all email functionality
- [ ] `EMAIL_FROM` — Should be `info@workforceap.org`

**Likely Present:**
- [x] `NEXT_PUBLIC_SUPABASE_URL` — Database works (site is functional)
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Auth works (login functional)
- [x] `SUPABASE_SERVICE_ROLE_KEY` — Server-side DB operations work

---

## How to Add Missing Variables to Vercel

### Step 1: Get Resend API Key
1. Go to https://resend.com
2. Login with your email
3. Click **API Keys** in left sidebar
4. Click **Create API Key**
5. Name: `WorkforceAP Production`
6. Permission: Select **Sending**
7. Click **Create**
8. **Copy the key** (starts with `re_`)

### Step 2: Add to Vercel
1. Go to https://vercel.com/dashboard
2. Select **workforceap-beta** project
3. Click **Settings** tab at top
4. Click **Environment Variables** in left menu
5. Click **Add** button:
   - Name: `RESEND_API_KEY`
   - Value: (paste the key from Step 1)
   - Environment: ✓ Production, ✓ Preview, ☐ Development
6. Click **Save**
7. Repeat for:
   - Name: `EMAIL_FROM`
   - Value: `info@workforceap.org`
   - Environment: ✓ Production, ✓ Preview, ☐ Development

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **...** menu → **Redeploy**
4. Select **Use Existing Build Cache**: Yes
5. Wait 2-3 minutes for deployment

### Step 4: Test
1. Go to https://www.workforceap.org/contact
2. Submit test form
3. Check `info@workforceap.org` inbox

---

## Local Development Setup

Create `.env.local` file in project root:

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Email (use Resend test key or skip for local)
RESEND_API_KEY=re_your_test_key_here
EMAIL_FROM=info@workforceap.org
EMAIL_TO_ADMIN=your-test-email@gmail.com

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Get Supabase keys:**
1. Go to https://app.supabase.com
2. Select your project
3. Project Settings → API
4. Copy URL and anon/service_role keys

---

## Security Notes

⚠️ **NEVER commit this file to git**  
⚠️ **NEVER share service_role_key** — it bypasses all Row Level Security  
⚠️ **Rotate keys if accidentally exposed**

**Protection:**
- `.env.local` is in `.gitignore` (should not be committed)
- Vercel env vars are encrypted at rest
- Use `NEXT_PUBLIC_` prefix only for client-safe variables

---

## Troubleshooting

### "Email service is not configured"
- Missing `RESEND_API_KEY` in Vercel
- Fix: Add key and redeploy

### "Invalid Supabase credentials"
- Wrong project URL or anon key
- Fix: Verify keys in Supabase dashboard

### Emails work locally but not in production
- Vercel env vars not set
- Fix: Check Settings → Environment Variables in Vercel

### Changes not taking effect
- Didn't redeploy after adding env vars
- Fix: Redeploy latest build

---

## Related Files

- `EMAIL-SETUP.md` — Full email configuration guide
- `lib/email.ts` — Email sending functions
- `app/api/contact/route.ts` — Uses RESEND_API_KEY
- `.env.local.example` — Template (create this if missing)

---

## Next Actions

1. [ ] Get Resend API key from https://resend.com
2. [ ] Add `RESEND_API_KEY` to Vercel production environment
3. [ ] Add `EMAIL_FROM=info@workforceap.org` to Vercel
4. [ ] Redeploy production
5. [ ] Test contact form on live site
6. [ ] Document actual key value in password manager (1Password, etc.)

---

*Document for Mike — WorkforceAP Tech Lead*
