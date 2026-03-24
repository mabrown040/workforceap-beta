# WorkforceAP Sprint 5 — Polish, Partner Onboarding & Employer Form
**For:** Cursor Cloud Agent  
**Repo:** mabrown040/workforceap-beta  
**Branch:** master  
**Date:** 2026-03-23  
**Context:** Sprint 4 shipped messaging, logo upload, job gating, certifications routing. Bugbot flagged 2 issues (logo race condition + partner page duplicate logic). Sprint 5 fixes those plus adds partner self-registration, homepage partner CTA, real employer contact form, and production config cleanup.

---

## Language Rules (CRITICAL — ALL new code and copy)
- Members are **members** — never "students", never "qualifying participants"
- Use **"no-cost training for members"** not "free training"
- Python for all file edits — never PowerShell Get-Content/Set-Content

---

## P0 — Bugbot Fixes (from PR #191 review)

### P0-1: Fix logo upload race condition in EmployerSettingsForm
**Problem:** In `components/employer/EmployerSettingsForm.tsx`, `handleLogoChange` uploads the logo asynchronously and writes `logoUrl` to the DB. But if the user clicks "Save" while the upload is still in progress, `handleSubmit` sends the stale (empty) `logoUrl` to `PATCH /api/employer/settings`, overwriting the just-uploaded logo. Logo is lost.

**Fix:** 
1. Track a `logoUploading` state: `const [logoUploading, setLogoUploading] = useState(false)`
2. Set `logoUploading = true` at the start of `handleLogoChange`, `false` when it completes (success or error)
3. Disable the submit button when either `saving` OR `logoUploading` is true: `disabled={saving || logoUploading}`
4. Show a subtle indicator while uploading: e.g., "Uploading logo..." near the logo field

**Commit:** `fix(employer): disable save during logo upload to prevent race condition overwriting logoUrl`

---

### P0-2: Deduplicate partner page mapping logic
**Problem:** `app/(portal)/partner/page.tsx` has an inline `.map()` building `PartnerMembersList` props that duplicates `toPartnerMembersListRows` from `lib/partner/referralBundle.ts`. The inline version omits the `?? stage` fallback for `stageLabel` and accesses `referredAt` differently.

**Fix:**
1. Read `lib/partner/referralBundle.ts` — find or create `toPartnerMembersListRows` function
2. Import and use that function in `app/(portal)/partner/page.tsx` instead of the inline map
3. Ensure `referredAtLabel` is included (the new field added in Sprint 4)
4. Delete the inline mapping logic

**Commit:** `refactor(partner): use shared toPartnerMembersListRows utility — removes duplicate mapping`

---

## P1 — Employer Contact Form

### P1-1: Build a real employer contact form
**Problem:** The `/employers` page says "Fill out the form or reach out directly" but there is NO form — just an email address and phone number. HR managers won't email; they need a structured intake form.

**Fix:** In `app/employers/page.tsx` and `app/employers/EmployerContactForm.tsx`:
- The form component already exists — verify it renders at the `#employer-contact` anchor section
- If the form is not visible, check why the `EmployerContactForm` component isn't rendering on the page
- The form should have: Company Name, Contact Name, Role/Title, Email, Phone, "What roles are you hiring for?", "How many hires are you looking for in the next 6 months?" (dropdown: 1-2, 3-5, 6-10, 10+)
- On submit: send to the existing `/api/contact` route with `topic: "Employer Inquiry"`
- After submit: show "We'll reach out within 24-48 hours" confirmation

If the form component exists but isn't rendering, add `<EmployerContactForm />` to the `#employer-contact` section in `app/employers/page.tsx`.

**Commit:** `fix(employers): ensure employer contact form renders — visible intake form at #employer-contact`

---

## P2 — Partner Onboarding

### P2-1: Build /partner-signup page
**Problem:** `/partner-signup` returns 404. Case managers and community orgs can't register without emailing WorkforceAP staff. This blocks partner network growth.

**Fix:** Create `app/partner-signup/page.tsx` with a self-registration form:
- Title: "Register Your Organization as a WorkforceAP Partner"
- Description: "Partner organizations refer community members to WorkforceAP programs. Registration is free. We'll set up your partner portal account within 1-2 business days."
- Fields:
  - Organization name *
  - Contact name *
  - Contact email *
  - Contact phone
  - Organization type (select): Nonprofit, Church/Faith org, Community center, Workforce board, School/College, Veterans org, Other
  - City/County you serve *
  - Estimated monthly referrals (select): 1-5, 6-15, 16-30, 30+
  - How did you hear about WorkforceAP? (text)
- On submit: `POST /api/partner/signup` — save to DB or send email to info@workforceap.org with all fields
- Create `app/api/partner/signup/route.ts` if it doesn't exist: validate fields, send email via Resend to `info@workforceap.org`, return 200 with confirmation message
- After submit: "Thank you! We'll review your registration and set up your partner portal within 1-2 business days."

**Commit:** `feat(partner): add /partner-signup self-registration page and API route`

---

### P2-2: Add "For Partners" section to homepage
**Problem:** The homepage (`app/page.tsx`) has zero content for referral organizations. A case manager landing on the homepage would think WorkforceAP is only for job-seekers and leave.

**Fix:** In `app/page.tsx`, after the "Who WorkforceAP is for" section, add a "For Partner Organizations" subsection:
- Brief heading: "Refer your community"
- 2-3 sentences: "Do you work with job-seekers at a church, community center, or workforce program? WorkforceAP partners refer clients and track their progress through a dedicated partner portal. No cost, no paperwork — just outcomes you can report."
- Two CTAs: "Register your organization →" (links to /partner-signup) and "Already a partner? Sign in →" (links to /login?redirectTo=/partner)
- Keep it visually consistent with the existing "Who WorkforceAP is for" section

**Commit:** `feat(homepage): add For Partners section with self-registration CTA`

---

## P3 — Production Config Documentation

### P3-1: Document required Supabase Storage bucket setup
**Problem:** Employer logo uploads depend on a `employer-logos` Supabase Storage bucket that may not be configured in production. No documentation exists for this setup step.

**Fix:** Add to `docs/LAUNCH-PREP-AUDIT.md` (or create `docs/SUPABASE-STORAGE-SETUP.md`):
```
## Supabase Storage Setup

### employer-logos bucket
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `employer-logos`
3. Set to Public (logos need to be publicly accessible for display)
4. Add policy: authenticated users can upload to their own folder
5. Bucket URL format: {SUPABASE_URL}/storage/v1/object/public/employer-logos/{filename}
```

**Commit:** `docs: add Supabase Storage bucket setup instructions for employer logos`

---

## Definition of Done

1. `npm run build` passes with zero errors
2. Push all commits to master
3. Logo upload race condition fixed — Save button disabled during upload
4. Partner page uses shared mapping utility — no duplicate logic
5. Employer contact form is visible and submittable at `workforceap.org/employers#employer-contact`
6. `/partner-signup` exists and submits successfully
7. Homepage has "For Partners" section with link to /partner-signup
8. Supabase Storage setup documented

---

## Testing (write alongside each feature)
- P0-1: test that submit button is disabled when `logoUploading=true`
- P1-1: test that employer contact form renders and submits to /api/contact
- P2-1: test that /partner-signup form submits and shows confirmation
- P2-2: test that "For Partners" section links are correct

## Commit Format
One atomic commit per fix: `fix(area): description` or `feat(area): description`

## Critical Rules
- Python for all file edits — never PowerShell
- Read before editing
- `npm run build` must pass after every commit
- All new copy uses "members" not "students"
- No pricing information on the employers page (this is intentional — pricing will be added separately)
