# WorkforceAP Sprint 3 — Conversion & Portal Hardening
**For:** Cursor Cloud Agent  
**Repo:** mabrown040/workforceap-beta  
**Branch:** master  
**Date:** 2026-03-23  
**Context:** Sprints 1+2 completed (SEO, a11y, design, language fixes). Sprint 3 focuses on member application lifecycle, portal completeness, and employer pipeline visibility.

---

## Objective

Build the missing glue in the member journey: application status visibility, enrollment confirmation, and end-to-end portal polish. Also lay the visual groundwork for employer "Hiring Partner" tiers (revenue prep).

All code changes committed to master, one atomic commit per feature. Use Python for all file edits — never PowerShell's Get-Content/Set-Content (encoding issues on Windows).

---

## Language Rules (CRITICAL — apply everywhere)

- Members are **members** — never "students", never "qualifying participants"
- Partners are **partners** or **referral partners**
- Use **"no-cost training for members"** not "free training for qualifying participants"
- Use **"accepted member"** not "enrolled student"
- These are nonprofit terminology requirements, not preferences

---

## P1 — Member Application Lifecycle

### P1-1: Application status page for members in dashboard
**Problem:** After applying, members have no way to see where they are in the process. The dashboard exists but has no "Your Application" status section.

**Fix:** In `app/(portal)/dashboard/page.tsx` (or the DashboardHomeClient component), add an "Application Status" card/section that shows:
- Application submitted date
- Current status: Applied → Under Review → Accepted → Enrolled → Active
- Next step text based on current status
- If status is "Applied" or "Under Review": show estimated response time

Query: `prisma.application.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' } })`

The Application model should exist in the schema. If it doesn't, check for whatever model stores the apply form submissions.

**Commit:** `feat(member): add application status card to member dashboard`

---

### P1-2: Enrollment confirmation email
**Problem:** When an admin approves a member's application (changes status to "accepted" or "enrolled"), no email is sent to the member. Members don't know they've been approved.

**Fix:**
1. Find where admin sets a member's status to accepted/enrolled — likely in `app/admin/members/[id]/page.tsx` or an API route like `app/api/admin/members/[id]/route.ts`
2. After the status update, send an enrollment confirmation email using Resend
3. Create email template at `emails/enrollment-confirmation.ts` using the existing email template pattern (see `emails/application-accepted.ts` if it exists, or `emails/invitation.ts` as a reference)
4. Email should include: member's name, program they're enrolled in, next steps (log into dashboard, complete profile), counselor contact

**Commit:** `feat(member): send enrollment confirmation email on admin approval`

---

### P1-3: "Where is my application" page for pre-login visitors
**Problem:** After submitting the apply form, members get a confirmation screen but have no persistent place to check their status before they have a login.

**Fix:** Add a simple page at `/apply/status` that:
- If logged in: redirect to `/dashboard` (status is there)
- If not logged in: show a form to enter their email and check status
- On submit: look up by email, return current status (Applied/Under Review/Accepted/Rejected) — no PII beyond what they already submitted
- Keep it simple — no auth required, just email lookup

This page is linked from the apply confirmation screen.

**Commit:** `feat(apply): add /apply/status page for pre-login application status check`

---

## P2 — Employer Portal Hardening

### P2-1: Employer "Hiring Partner" visual tier
**Problem:** The employer portal currently shows all employers the same view. We need to visually differentiate "Hiring Partner" employers (who have deeper integration) from basic job-posting employers. This is the visual/UX groundwork for future paid tiers — no paywall yet.

**Fix:**
1. Add a `tier` field to the Employer model: `tier String @default("basic")` with values "basic" | "partner"
2. Add migration: `prisma migrate dev --name add_employer_tier`
3. In the employer portal header/shell, show a "Hiring Partner" badge if `tier === "partner"`
4. In `app/admin/employers/page.tsx`, let admin toggle an employer's tier
5. Michael Brown's employer account (michael.brown@workforceap.org) should be set to "partner" tier for demo purposes

**Commit:** `feat(employer): add Hiring Partner tier badge and admin tier management`

---

### P2-2: Employer match history view
**Problem:** Employers can see suggested candidates but have no history of actions taken (contacted, passed, hired).

**Fix:** In `app/(portal)/employer/applications/page.tsx` or a new page at `/employer/matches`, add:
- List of all candidates matched to employer's jobs
- Status column: Suggested / Contacted / Interviewing / Hired / Passed
- Timestamp of last action
- Link to the candidate's job application

If application status is already tracked in `JobPostingApplication` model, use that. Add `employerStatus` field if missing.

**Commit:** `feat(employer): add match history view with employer action status`

---

### P2-3: Employer placement statistics
**Problem:** Employers want to know how successful WorkforceAP placements have been — this is a selling point for the "Hiring Partner" pitch.

**Fix:** In the employer dashboard (`/employer`), add a stats card:
- Total candidates matched to your jobs
- Total interviews scheduled
- Total hires made (status: filled/hired)
- Average time from match to hire (if data available)

Query from existing job and application data. If hire tracking isn't explicit in the schema, use `job.status === 'filled'` as a proxy.

**Commit:** `feat(employer): add placement statistics to employer dashboard`

---

## P3 — Partner Portal

### P3-1: Partner outcome digest — weekly email
**Problem:** Partners refer members but get no feedback on how their referrals are progressing. This makes partners feel disconnected and slows referral volume.

**Fix:**
1. Create a cron-style API route at `app/api/cron/partner-outcome-digest/route.ts`
2. For each active partner, query:
   - Members they referred (via referral/partner relationship)
   - Current status of each referred member
   - Any completions or job placements this week
3. Send a weekly digest email using Resend with template `emails/partner-weekly-digest.ts`
4. Email includes: "Your referrals this week", member count by stage, any success stories
5. Add to Vercel cron: every Monday at 8am CT

This does NOT need to be triggered immediately — just build the route and template. Vercel cron config goes in `vercel.json`.

**Commit:** `feat(partner): add weekly outcome digest email cron route`

---

### P3-2: Partner referral attribution on apply flow
**Problem:** When a partner's referral applies, there's no way to track which partner brought them. This breaks the partner's ability to see "my referral applied."

**Fix:**
1. Add `referralSource` and `referralPartnerId` fields to the application/apply form submission
2. If a user arrives at `/apply` with a `?ref=[partnerCode]` query param, store that as referral attribution
3. Partners should have a unique `referralCode` field — add to Partner model if missing
4. In the partner portal, show "Applied via your referral link: N" count

**Commit:** `feat(partner): add referral attribution to apply flow with partner UTM tracking`

---

## P4 — Test Account Infrastructure

### P4-1: Seed comprehensive test accounts
**Problem:** Can't QA portals without test accounts for each role.

**Fix:** Update `prisma/seed.ts` to create (or ensure existence of) test accounts:
- `member-test@workforceap.org` — role: member, with an application in "under review" status
- `partner-test@workforceap.org` — role: partner, linked to a partner org, with 2-3 referrals
- `employer-test@workforceap.org` — role: employer, with 2 job postings and some candidate matches
- `admin-test@workforceap.org` — role: admin

All test accounts use password: `TestWfAP2026!` (stored in seed comments for dev reference)

Note: These accounts are only created when DATABASE_URL points to a dev/staging database. Add a `SEED_TEST_ACCOUNTS=true` env check before creating them.

**Commit:** `chore(seed): add comprehensive test accounts for portal QA`

---

## Definition of Done

1. `npm run build` passes with zero errors
2. Push all commits to master
3. Member dashboard shows application status card
4. Employer dashboard shows placement stats + "Hiring Partner" badge for partner-tier employers
5. Partner portal has referral attribution display
6. `/apply/status` page exists and loads without error
7. All email templates render without error (test in email preview if available)

---

## Commit Format
One atomic commit per feature. Use format: `feat(area): description` or `fix(area): description`

## Important
- Read files before editing — never guess at the schema
- Use Python for all file edits (not PowerShell)  
- Check existing email templates in `/emails/` folder before creating new ones — match the pattern
- Do NOT modify the Prisma migration history — only add new migrations forward
- `npm run build` must pass after every commit
- Language rules above apply to ALL new copy — members, not students
