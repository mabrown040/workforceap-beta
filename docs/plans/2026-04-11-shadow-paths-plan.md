# Shadow Paths Implementation Plan

**Goal:** Fix the 5 broken data flow shadow paths by building the missing UI, triggers, and tracking mechanisms. All changes will be added to the existing `feat/proactive-career-os` branch.

**Architecture & Scope:**
These are full-stack Next.js App Router additions touching the Prisma database and UI components.

---

### Task 1: Stale Application Tracking (Member goes dark)
**Problem:** Applications sit in PENDING without counselor alerts.
**Implementation:**
1. **API/Query:** Create a Prisma query in `lib/data/applications.ts` to fetch `PENDING` applications older than 3 days.
2. **Admin UI:** Add a "Stale Applications" alert banner or dedicated list on the `/admin/dashboard` or `/admin/pipeline` page.
3. **Action:** Add a "Send Reminder" button that triggers an email via Resend and logs a `MemberEvent`.

### Task 2: Training Progress Visibility (Progress not surfaced)
**Problem:** Counselors can't see mid-course progress.
**Implementation:**
1. **API/Query:** Update the member detail fetcher to include the `LearningProgress` relation.
2. **Counselor UI:** Add a "Training Progress" card to the Counselor's Member View (`/admin/members/[id]`) showing active courses and completion percentage.

### Task 3: External Certificate Recording (Cert earned but not recorded)
**Problem:** External certs (AWS, Google) don't flow back into the system.
**Implementation:**
1. **Member UI:** Add a "Log External Certification" modal to the Member Dashboard.
2. **Server Action:** Create a server action to insert a `UserCertification` record.
3. **Counselor UI:** Highlight newly added (unverified) certs on the counselor's member review page.

### Task 4: Structured Employer Matching (Match = email thread)
**Problem:** Employer matching happens via email instead of the platform.
**Implementation:**
1. **Counselor UI:** Build an "AI Matches" tab on the Member detail page that lists `AIJobMatch` records.
2. **Action:** Add an "Introduce" button next to a match that automatically provisions a `MessageThread` (kind: employer) linking the Member, Counselor, and Employer, bypassing messy email chains.

### Task 5: Placement Confirmation (Placement = unknown)
**Problem:** Placement records needed for WIOA grant reporting aren't generated.
**Implementation:**
1. **Member UI:** Add a "Did you get the job?" prompt to the dashboard for members with an active `JobApplication` in the "OFFER" stage.
2. **Server Action:** When confirmed, automatically draft a `PlacementRecord` and set status to pending review.
3. **Counselor UI:** Add a "Pending Placements" queue for Counselors to finalize the salary/start date and approve the `PlacementRecord` for grant reporting.
