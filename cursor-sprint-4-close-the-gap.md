# WorkforceAP Sprint 4 — Close the 3→7 Star Gap
**For:** Cursor Cloud Agent  
**Repo:** mabrown040/workforceap-beta  
**Branch:** master  
**Date:** 2026-03-23  
**Context:** Sprints 1-3 shipped. Platform is functional but not yet end-to-end tested with real users. Sprint 4 closes the gap between "website + portals" and "working product." Vision: become the operating system for workforce development nonprofits.

---

## Language Rules (CRITICAL — ALL new code and copy)
- Members are **members** — never "students", never "qualifying participants"
- Use **"no-cost training for members"** not "free training"
- Use **"accepted member"** not "enrolled student"
- Python only for file edits — never PowerShell Get-Content/Set-Content

---

## P0 — Make the End-to-End Journey Actually Work

### P0-1: Fix automated AI matching trigger on job publish
**Problem:** The employer pipeline page shows "Matches appear here after admin runs job–candidate matching." Employers have to wait for an admin to manually trigger matching. This is a UX blocker before showing the portal to paying employers.

**Fix:** In `app/api/employer/jobs/route.ts` (POST — job creation) and/or `app/api/employer/jobs/[id]/route.ts` (PATCH — job status change to "live"), trigger AI matching automatically when a job is published:
1. After job status becomes "live", call the match computation logic
2. Check `lib/admin/aiJobMatchCompute.ts` — use or adapt that function
3. Run asynchronously (don't block the job publish response) — use `setImmediate` or background queue pattern
4. Log: `[employer_match_auto] jobId={id} triggered` on success, `[employer_match_auto] jobId={id} error={msg}` on failure

**Commit:** `feat(employer): auto-trigger AI matching when job is published — removes manual admin step`

---

### P0-2: Admin enrollment approval → confirmation email → member status update (full flow)
**Problem:** The enrollment confirmation email was built in Sprint 3 but the trigger was not fully verified. Need to confirm the complete flow: admin approves member → DB status updates → email sends → member sees "Accepted" in dashboard.

**Fix:** In `app/api/admin/members/[id]/status/route.ts` (or wherever admin sets member approval status):
1. When status changes to APPROVED: call `enrollmentConfirmationHtml` from `emails/enrollment-confirmation.ts` and send via Resend
2. Confirm the member's `application.status` is set to APPROVED in the DB
3. Confirm `memberApplicationStatus.ts` returns stage "accepted" after APPROVED
4. Add a test: `lib/admin/enrollmentApprovalFlow.test.ts` — mock the DB update and assert email was called with correct params

Read `app/api/admin/members/[id]/status/route.ts` before editing — Cursor may have already wired part of this.

**Commit:** `feat(admin): verify and complete enrollment approval → email → status flow with integration test`

---

### P0-3: Placement outcome tracking in admin
**Problem:** When a member gets a job, there's no way to record it. Grant funders need placement metrics. The homepage says "X members placed" but there's no data source for this.

**Fix:**
1. Add `PlacedOutcome` model to Prisma schema:
   ```prisma
   model PlacedOutcome {
     id         String   @id @default(uuid())
     userId     String   @unique @map("user_id")
     user       User     @relation(fields: [userId], references: [id])
     employerName String @map("employer_name")
     jobTitle   String   @map("job_title")
     startingSalary Int? @map("starting_salary")
     placedAt   DateTime @default(now()) @map("placed_at")
     programSlug String? @map("program_slug")
     notes      String?
     createdAt  DateTime @default(now()) @map("created_at")
     @@map("placed_outcomes")
   }
   ```
2. Add migration: `prisma migrate dev --name add_placed_outcomes`
3. In `app/admin/members/[id]/page.tsx`, add a "Mark as Placed" section with fields: employer name, job title, starting salary (optional), date
4. On submit: `POST /api/admin/members/[id]/placement` (create this route)
5. In `app/admin/page.tsx` (admin dashboard), show placement count: query `prisma.placedOutcome.count()`

**Commit:** `feat(admin): add placement outcome tracking — PlacedOutcome model, admin form, dashboard count`

---

## P1 — Employer Monetization Foundation

### P1-1: Employer "Hiring Partner" pricing page / CTA
**Problem:** The employer portal has no price tag. No employer has been asked to pay. The "Hiring Partner" tier badge exists in code but there's no public-facing page explaining what it is or how to sign up.

**Fix:** Add a section to `app/employers/page.tsx` — after the "Hiring Partnership Options" section that already exists:
- Heading: "Become a Hiring Partner"
- 3 tiers (visual comparison cards):
  - **Free:** Post jobs, see matched candidates. No cost ever.
  - **Hiring Partner ($299/mo):** First access to graduating cohorts, co-branded job postings, quarterly hiring events, placement support, dedicated contact.
  - **Corporate Training Partner (Custom):** Upskill your existing workforce, custom curriculum, contact us.
- CTA button on Hiring Partner: "Get Started → " links to `#employer-contact` (existing contact form)
- Add a `data-tier="hiring-partner"` hidden field to the employer contact form so we know which tier they're inquiring about

This is the first time WorkforceAP is publicly asking employers for money. The price ($299/mo) is a placeholder — adjust if Mike has a different number.

**Commit:** `feat(employers): add Hiring Partner pricing section with 3-tier comparison to employers page`

---

### P1-2: Homepage live stats (enrolled + programs + partners — NOT placements)
**Problem:** The homepage has static copy. We need live stats from the WorkforceAP DB.

**IMPORTANT:** Do NOT show a "members placed" counter on the public site. The historical placement data (from before WorkforceAP was founded) belongs to the founder's prior work and cannot be attributed to WorkforceAP. Only show stats that are genuinely WorkforceAP numbers.

**Fix:**
1. Create `app/api/stats/route.ts` — public endpoint returning:
   ```json
   { "membersEnrolled": 0, "programsOffered": 19, "partnersActive": 8 }
   ```
   - `membersEnrolled`: `prisma.profile.count({ where: { enrolledProgram: { not: null } } })`
   - `programsOffered`: `PROGRAMS.length` from lib/content/programs.ts (static — 19)
   - `partnersActive`: `prisma.partner.count({ where: { active: true } })`
2. In `app/page.tsx`, fetch this endpoint and update stat values with live DB values
3. Change the stat labels to: "Members Enrolled", "Programs Available", "Partner Organizations" (remove any "Members Placed" stat)
4. Cache: `revalidate = 3600`
5. Fallback to reasonable defaults (0, 19, 0) if fetch fails

**Commit:** `feat(homepage): add live stats API for enrolled members, programs, partners — no fake placement numbers`

---

## P2 — Trust + Grant Signals

### P2-1: Member success stories / Impact page
**Problem:** No page exists to show what members have achieved. This is critical for both employer trust and grant funder reporting.

**Fix:** Create `app/impact/page.tsx`:
- Page title: "Member Outcomes — WorkforceAP Impact"
- Hero stat row: members enrolled (from DB), certifications earned (from DB), partner organizations (from DB)
- NOTE: Do NOT show historical placement numbers from pre-WorkforceAP data. Only show genuine WorkforceAP outcomes. If PlacedOutcome table is empty, show "First placements coming soon" or omit the stat.
- "Programs that have placed members" — list programs with at least 1 placement
- Placeholder section: "Member Stories — coming soon" (blank for now, ready for testimonials)
- SEO metadata: target "Austin workforce training outcomes" keywords

Also add `/impact` to the sitemap in `app/sitemap.ts`.

**Commit:** `feat(impact): add /impact page with live outcome stats from DB`

---

### P2-2: Program completion tracking
**Problem:** When a member earns their certification, it's not formally logged in the platform. Partners can't see "my referral just got their Google cert."

**Fix:** In `app/(portal)/dashboard/` — check if there's a certifications page or assessments page. If a member's `assessmentCompleted` flag or `coursesCompleted` count suggests cert completion:
1. Trigger a `PortalWorkflowEvent` (the workflow events system already exists in `lib/portal/workflowEvents.ts`)
2. Event type: `CERTIFICATION_EARNED`
3. Surface this in the partner portal: `/partner/milestones` should show "earned certification" events for their referred members
4. Optionally: send a congratulatory email to the member when cert is earned (create `emails/certification-earned.ts`)

Read `lib/portal/workflowEvents.ts` and `app/(portal)/partner/milestones/page.tsx` before editing.

**Commit:** `feat(member): log CERTIFICATION_EARNED workflow event and surface in partner milestones`

---

## P3 — Network Seeds (plant the SaaS idea)

### P3-1: /platform landing page
**Problem:** Other workforce nonprofits Googling "workforce development software" or "workforce case management" will never find WorkforceAP. We need to plant this seed now — it's a free organic channel for B2B leads.

**Fix:** Create `app/platform/page.tsx`:
- Title: "WorkforceAP Platform — Software for Workforce Development Organizations"
- Hero: "The platform that runs WorkforceAP Austin — available for your organization"
- Features list (pull from what actually exists): member intake + case management, employer portal + AI matching, partner referral network, outcome reporting
- "Built for:" nonprofits, workforce boards, community colleges, faith-based training programs
- CTA: "Request Early Access" → mailto:info@workforceap.org?subject=Platform+Interest
- Add to sitemap

**Commit:** `feat(platform): add /platform landing page for B2B SaaS lead generation`

---

### P3-2: Partner self-registration flow
**Problem:** A new partner org wanting to refer members has to contact WorkforceAP staff and wait for admin to create their account. This is a friction point that prevents the partner network from scaling.

**Fix:**
1. Create `app/partner-signup/page.tsx` — a public form for partner orgs to register:
   - Fields: organization name, contact name, contact email, phone, org type (nonprofit, church, community org, school, employer), how many referrals do you expect monthly
   - On submit: `POST /api/partner/signup` — creates a PartnerSignupRequest record (NOT a full partner yet)
2. Create `app/api/partner/signup/route.ts` — save to a `PartnerSignupRequest` model (or send an email to info@workforceap.org with the details)
3. In `app/admin/partners/page.tsx` — show pending partner signup requests that admin can approve
4. Link from `app/partners/page.tsx`: "Are you an organization? Refer your community →"

**Commit:** `feat(partner): add partner self-registration form and admin approval queue`

---

## Definition of Done

1. `npm run build` passes with zero errors
2. Push all commits to master
3. AI matching fires automatically when a job goes live (no admin step)
4. Employer pricing section with 3 tiers is live on `/employers`
5. `/impact` page exists with live stats
6. `/platform` page exists and is in sitemap
7. Admin can mark a member as placed and see the count on the admin dashboard
8. Partner self-registration form exists at `/partner-signup`
9. All new features have at least one test

---

## Testing (write alongside each feature)

Follow existing test patterns in `lib/admin/*.test.ts` and `lib/member/*.test.ts`.

Required per feature:
- P0-1: test that matching is triggered on job status → live
- P0-2: integration test for approval → email trigger
- P0-3: test PlacedOutcome creation and count query
- P1-2: test stats API returns correct structure with fallbacks
- P2-2: test CERTIFICATION_EARNED event is logged correctly

---

## Commit Format
One atomic commit per feature: `feat(area): description`  
Tests in same commit or immediately after: `test(area): description`

## Critical Rules
- Python for all file edits — never PowerShell
- Read before editing
- `npm run build` must pass after every commit
- Members not students — everywhere
- No placeholder copy — use real data or clearly labeled "coming soon"
