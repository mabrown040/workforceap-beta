# WorkforceAP Sprint 3 — Full Consolidated Prompt
**For:** Cursor Cloud Agent  
**Repo:** mabrown040/workforceap-beta  
**Branch:** master  
**Date:** 2026-03-23  
**Source:** Sprint 3 plan + conversion funnel audit + employer readiness audit + partner portal audit

---

## Language Rules (CRITICAL — apply to ALL new code and copy)

- Members are **members** — never "students", never "qualifying participants"  
- Use **"no-cost training for members"** not "free training for qualifying participants"  
- Use **"accepted member"** not "enrolled student"  
- These are nonprofit terminology requirements  

---

## P0 — Critical Conversion Fix (HIGHEST IMPACT)

### P0-1: Wire up apply funnel analytics
**Problem:** `trackApplyFunnel()` exists in `lib/analytics/events.ts` but is NEVER called anywhere in the apply flow. We're completely blind on where users drop off.

**Fix:** In `app/apply/ApplyFlowClient.tsx` (and `app/apply/ApplyEligibilityClient.tsx`), add calls:
```typescript
// On apply page mount / step 1 viewed
trackApplyFunnel(1, 'started');

// After funding eligibility questions completed (before step 2)
trackApplyFunnel(2, 'qualification_completed', { qualifies });

// Right before Formspree submit
trackApplyFunnel(3, 'form_submitted');

// On successful Formspree response
trackApplyFunnel(4, 'application_completed');
```
Check `lib/analytics/events.ts` to confirm exact function signature before calling.

**Commit:** `feat(analytics): wire up apply funnel tracking — trackApplyFunnel calls in ApplyFlowClient`

---

### P0-2: Connect apply confirmation to account creation
**Problem:** The main apply form submits to Formspree but never creates a user account. The account creation API exists at `/api/apply/signup` but is never surfaced after applying. Users who apply have no account and no path back.

**Fix:** On `app/apply/confirmation/page.tsx`, add a prominent "Create your account" section:
- Heading: "Last step — create your member account"
- Description: "Your application is submitted. Create an account to check your status and access resources while you wait."
- Pre-fill the email field from the URL param `?email=` (pass email from the confirmation redirect)
- Button: "Create My Account" → links to `/apply/create-account?email=<email>`

Also check `app/apply/ApplyFlowClient.tsx` — after successful Formspree submit, redirect to `/apply/confirmation?email=<submittedEmail>` so the email pre-fills.

**Commit:** `feat(apply): add account creation CTA to apply confirmation page with pre-filled email`

---

## P1 — Member Application Lifecycle

### P1-1: Application status card in member dashboard
**Problem:** After applying, members log in to `/dashboard` and see no indication of where their application is.

**Fix:** In `app/(portal)/dashboard/page.tsx` (or `DashboardHomeClient.tsx`), add an "Application Status" card that shows:
- Application submitted date
- Current status displayed as a progress bar or step indicator: Applied → Under Review → Accepted → Enrolled → Active
- Status-specific message: "Under Review — we typically respond in 24-48 hours" / "Accepted — check your email for next steps"
- If no application found: "Start your application → /apply"

Query: check for an Application or Profile.applicationStatus field in the Prisma schema. Use whatever tracks member application state.

**Commit:** `feat(member): add application status progress card to member dashboard`

---

### P1-2: Enrollment confirmation email
**Problem:** When admin changes a member's status to accepted/enrolled, no email is sent. Members don't know they've been approved.

**Fix:**
1. Find where admin approves a member — likely `app/api/admin/members/[id]/route.ts` or similar
2. After status update to "accepted" or "enrolled", send an email using Resend
3. Create `emails/enrollment-confirmation.ts` following the existing email template pattern (check `emails/application-accepted.ts` or `emails/invitation.ts`)
4. Email content: member name, program enrolled in, "Log in to your dashboard" button, counselor contact info

**Commit:** `feat(member): send enrollment confirmation email on admin approval`

---

### P1-3: Application status check page (/apply/status)
**Problem:** Members who applied but haven't created an account have no way to check their status.

**Fix:** Create `app/apply/status/page.tsx`:
- If logged in: redirect to `/dashboard`
- If not logged in: show email input form
- On submit: look up by email, return current status (Applied / Under Review / Accepted)
- Link to this page from the confirmation page: "Already applied? Check your status →"

**Commit:** `feat(apply): add /apply/status page for email-based application status lookup`

---

## P2 — Employer Portal Hardening

### P2-1: Company settings form
**Problem:** The `/employer/settings` page currently shows "Editable company profile fields are coming next" — employers cannot update their own profile. This is a blocker before showing the portal to paying customers.

**Fix:** In `app/(portal)/employer/settings/page.tsx`, replace the placeholder with a real form:
- Fields: Company name, company description (textarea), website URL, company size (select), industry (select), contact name, contact email, contact phone
- On save: `PATCH /api/employer/settings` (create this route)
- Create `app/api/employer/settings/route.ts`: validate and update the Employer record in the DB

**Commit:** `feat(employer): implement company settings form with save to DB`

---

### P2-2: Employer "Hiring Partner" tier badge
**Problem:** No way to differentiate committed employer partners from basic job posters. This is the visual foundation for future paid tiers.

**Fix:**
1. Add `tier String @default("basic")` to Employer model in `prisma/schema.prisma` (values: "basic" | "partner")
2. Add migration: `prisma migrate dev --name add_employer_tier`
3. In `components/portal/EmployerPortalShell.tsx`, show a "Hiring Partner ★" badge in the header if `employer.tier === "partner"`
4. In `app/admin/employers/page.tsx`, add a toggle button for admin to set/unset "partner" tier per employer

**Commit:** `feat(employer): add Hiring Partner tier to Employer model and portal UI`

---

### P2-3: Employer placement statistics
**Problem:** Employers have no at-a-glance view of how effective their WorkforceAP hiring has been.

**Fix:** In `app/(portal)/employer/page.tsx` (employer dashboard), add a stats row:
- "Candidates matched" — count of AI matches for this employer's jobs
- "Applications received" — count of applications across all jobs
- "Positions filled" — count of jobs with status "filled"
- "Active job postings" — count of live jobs (already exists — verify it's there)

All data should be queryable from existing Prisma models. No new schema needed.

**Commit:** `feat(employer): add placement statistics to employer dashboard`

---

### P2-4: Employer match history view
**Problem:** Employers can see suggested candidates in the pipeline view, but have no history of actions taken (contacted, hired, passed).

**Fix:** In `app/(portal)/employer/applications/page.tsx` or add `/employer/matches`:
- Show all candidates ever matched/applied to employer's jobs
- Add status column: Suggested / Contacted / Interviewing / Hired / Passed
- Add timestamp of last status change
- Add "Update Status" button (inline dropdown)

Check if `JobPostingApplication` has a status field with these values. If `employerStatus` is missing, add it.

**Commit:** `feat(employer): add match history view with employer action status tracking`

---

## P3 — Partner Portal

### P3-1: Weekly partner outcome digest email
**Problem:** Partners refer members but receive no ongoing feedback on how their referrals are progressing. This leads to disengagement.

**Fix:**
1. Create `app/api/cron/partner-outcome-digest/route.ts`
2. For each active partner with `notifyOnEnrollment: true`, query their referred members' current pipeline stages
3. Create `emails/partner-weekly-digest.ts` template showing:
   - "Your referrals this week" section
   - Member count by stage (Applied, Enrolled, In Training, Certified, Placed)
   - Any new certifications or placements since last week
4. Add to `vercel.json` cron: `{ "path": "/api/cron/partner-outcome-digest", "schedule": "0 13 * * 1" }` (Mondays 8am CT)

**Commit:** `feat(partner): add weekly outcome digest email cron route`

---

### P3-2: Referral attribution on apply flow
**Problem:** The `Partner` model has no `referralCode` field. Partners can't share a referral link and can't see if their outreach converted to applications.

**Fix:**
1. Add `referralCode String? @unique` to `Partner` model in `prisma/schema.prisma`
2. Populate referralCode for existing partners with their `slug` value (add to seed or migration)
3. Migration: `prisma migrate dev --name add_partner_referral_code`
4. In `app/apply/page.tsx` (or `ApplyFlowClient.tsx`): read `?ref=` query param and store in form state
5. On form submit, include `referralCode` in the application payload
6. In `/api/apply/signup/route.ts` or the Formspree handler: look up partner by referralCode and link the application to the partner
7. In `/partner` dashboard: show "Applied via your link: N" count

**Commit:** `feat(partner): add referralCode field and ?ref= attribution to apply flow`

---

## P4 — Test Account Infrastructure

### P4-1: Seed test accounts for all roles
**Problem:** Can't QA portals without test accounts for each role. Currently only admin seed exists.

**Fix:** Update `prisma/seed.ts` to create test accounts when `SEED_TEST_ACCOUNTS=true`:

```typescript
if (process.env.SEED_TEST_ACCOUNTS === 'true') {
  // Create test users in Supabase Auth + DB for each role
  // member-test@workforceap.org — role: member, has application in "under review"
  // partner-test@workforceap.org — role: partner_user, linked to a partner org
  // employer-test@workforceap.org — role: employer, has 2 job postings
  // All with password: TestWfAP2026! (document in seed comments only)
}
```

**Commit:** `chore(seed): add SEED_TEST_ACCOUNTS flag with test accounts for all portal roles`

---

## Definition of Done

1. `npm run build` passes with zero errors
2. Push all commits to master
3. `trackApplyFunnel` is called at each step of the apply flow
4. Apply confirmation page has "Create your account" CTA
5. Member dashboard shows application status card
6. Employer settings form saves to DB
7. Employer dashboard shows placement stats
8. Employer tier badge appears for partner-tier employers
9. Partner apply attribution (`?ref=`) is tracked
10. `/apply/status` page exists and loads
11. All new email templates render without error
12. All new Prisma migrations applied and schema consistent

---

## Commit Format
One atomic commit per feature: `feat(area): description` or `fix(area): description`

## Testing Requirements (MANDATORY)

Write a test for every feature you ship. The test goes in the same commit as the feature, or the commit immediately after. No exceptions.

### Testing patterns already in this repo
Check these for conventions before writing new tests:
- `lib/admin/runAdminJobMatchesGet.test.ts` — integration test pattern
- `lib/admin/applyEmployerNotifiedAfterSuggest.test.ts` — unit test pattern  
- `lib/email/escapeHtml.test.ts` — pure function test pattern
- `lib/employer/rankProgramsForEmployerJob.test.ts` — business logic test
- Run tests: `node --import tsx --test <file>` or `npm run test:unit`

### Required tests per feature

**P0-1 (analytics wiring):**
```
lib/analytics/applyFunnelTracking.test.ts
- test: trackApplyFunnel called with step=1 on apply page mount
- test: trackApplyFunnel called with step=4 on successful submission
- test: trackApplyFunnel NOT called if analytics disabled
```

**P0-2 (apply confirmation CTA):**
```
app/apply/confirmation/confirmationCta.test.ts
- test: account creation CTA renders when email param present
- test: CTA links to /apply/create-account with pre-filled email
- test: confirmation renders without CTA if no email param
```

**P1-2 (enrollment confirmation email):**
```
lib/admin/enrollmentEmail.test.ts
- test: Resend called with correct recipient email on status → enrolled
- test: Resend NOT called if status change is not to enrolled/accepted
- test: email contains member name and program title
```

**P2-1 (employer settings route):**
```
app/api/employer/settings/route.test.ts
- test: PATCH /api/employer/settings returns 200 with valid payload
- test: returns 401 if not authenticated as employer
- test: returns 400 if required fields missing
- test: DB record updated correctly after successful PATCH
```

**P3-2 (referral attribution):**
```
lib/partner/referralAttribution.test.ts
- test: ?ref=partner-slug stored in application on submit
- test: unknown ref code is ignored gracefully (no error)
- test: application linked to correct partner when ref matches referralCode
```

**P4-1 (seed test accounts):**
```
- test: seed creates member-test account when SEED_TEST_ACCOUNTS=true
- test: seed skips test accounts when SEED_TEST_ACCOUNTS is unset
```

### E2E smoke tests (Playwright — add to tests/e2e/)
Expand `tests/e2e/` with portal smoke tests:
```
tests/e2e/portal-smoke.spec.ts
- Member portal: login → /dashboard loads without JS error → application status card visible
- Employer portal: login → /employer loads → jobs page loads
- Partner portal: login → /partner loads → referrals list visible
```
Check `tests/e2e/member-portal-mvp.spec.ts` for existing Playwright patterns.

### CI enforcement
Verify `.github/workflows/` has a test job. If not, add one:
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:unit
```

---

## Critical Rules
- **Python only for file edits** — never PowerShell Get-Content/Set-Content (causes encoding corruption)
- Read files before editing — never guess at schema or component structure
- Check `emails/` folder for existing templates before creating new ones — match the exact pattern
- Only add new Prisma migrations forward — never modify migration history
- `npm run build` must pass after every commit
- All new copy uses "members" not "students" — no exceptions
- **Write tests** — every feature gets a test, same commit or next commit
