# Sprint 7 — Platform Foundation + Intake Flow
**Repo:** workforceap-beta (Next.js + Prisma + Supabase + Vercel)
**Priority:** Ship tonight. Platform-first thinking on every decision.

---

## Context: The Real Vision

WorkforceAP is not just one org's website. It is a **licensable workforce development platform**. The Austin program is proof-of-concept. Eventually, AAUL, NPower, Goodwill chapters, and training orgs will each run their own instance. Every architectural decision must support this.

**Platform model decided:**
- Each org gets their own branded site (subdomain `aaul.workforceap.org` OR custom domain)
- Zero cross-org data visibility — full tenant isolation
- Billing: nonprofits pay flat fee, training orgs pay per seat
- Members, programs, partners, employers are all org-scoped

---

## Part 1: Multi-Tenant DB Foundation

The most important thing we do tonight. Get this wrong and it's a painful re-architecture at 10 orgs.

### 1.1 — Organization Table

Add `Organization` model to Prisma schema:

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique  // used for subdomain: slug.workforceap.org
  customDomain String? @unique  // optional: their own domain
  logo        String?
  primaryColor String?
  billingType  String  @default("flat") // "flat" | "per_seat"
  plan        String   @default("nonprofit") // "nonprofit" | "training_org" | "enterprise"
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     Member[]
  partners    Partner[]
  employers   Employer[]
  programs    Program[]
  users       User[]
}
```

### 1.2 — Scope Existing Tables to Org

Add `organizationId` foreign key to:
- `Member`
- `Partner`
- `Employer`
- `User` (staff/admin accounts)
- `Program` (new — see Part 2)
- `JobPosting`
- `CourseEnrollment`

All queries must filter by `organizationId`. No exceptions.

### 1.3 — Seed Default Org

Create a migration that:
1. Inserts WorkforceAP as the default org (`slug: "workforceap"`)
2. Assigns all existing records to that org ID

This ensures zero data loss and existing site continues working unchanged.

---

## Part 2: Admin Program Catalog

Admins must be able to add/edit/remove programs without touching code. Changes auto-update everywhere they appear.

### 2.1 — Program Model

```prisma
model Program {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  name            String
  description     String
  category        String   // "IT" | "Healthcare" | "Trades" | "Business" | "Manufacturing"
  deliveryType    String   // "external_lms" | "youtube" | "in_person" | "virtual" | "internal"
  deliveryUrl     String?  // Coursera link, YouTube playlist, Zoom link, etc.
  deliveryDetails String?  // For in-person: location/schedule info
  
  certifications  String[] // List of certs earned (e.g. ["CompTIA A+", "Google IT Support"])
  duration        String?  // e.g. "12 weeks"
  cost            Float?   // Tuition cost for funding applications
  certCost        Float?   // Certification exam cost
  bookCost        Float?   // Book/materials cost
  miscCost        Float?   // Miscellaneous fees
  
  status          String   @default("active") // "active" | "coming_soon" | "inactive"
  displayOrder    Int      @default(0) // Admin can reorder
  featured        Boolean  @default(false)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  enrollments     CourseEnrollment[]
}
```

### 2.2 — Admin UI: Program Management

**Page:** `/admin/programs`

Features:
- List all programs with status badge, drag-to-reorder
- Create new program button → modal or drawer with all fields
- Edit existing program
- Toggle active/inactive (soft delete, never hard delete)
- Preview how it appears on homepage and employer portal

**Delivery type field** determines which secondary fields show:
- `external_lms` → URL field labeled "LMS Course URL"
- `youtube` → URL field labeled "YouTube Playlist URL"  
- `in_person` → text area labeled "Location & Schedule"
- `virtual` → URL field labeled "Meeting Link"
- `internal` → file upload or rich text

### 2.3 — Auto-Updates on Save

When a program is saved/updated, it should auto-reflect on:
1. **Homepage** "Available Talent" section — pulls active programs, respects displayOrder
2. **Employer portal** hiring filter dropdown
3. **Member portal** pathway selection
4. **Certification tracking** reference list

Use a shared `getActivePrograms(organizationId)` utility function called by all these pages. No hardcoded program lists anywhere.

---

## Part 3: Intake Flow Improvement

Goal: reduce dependency on manual outreach. Free value flows immediately. Training-track requires intent signals before interview.

### 3.1 — Overview Step: Loom Video Embed

**Page:** Step 2 of the onboarding funnel (Overview)

Add a video embed section:
- Admin-configurable video URL (Loom, YouTube, Vimeo — any embed)
- Fallback: text content if no video set
- Store as an org-level setting: `Organization.overviewVideoUrl`
- Admin can update from `/admin/settings` without code change

### 3.2 — Pre-Screening Form (Before Interview Step)

**Trigger:** After member completes Assessment (Step 4), before they can request an Interview (Step 5)

Add a `PreScreening` form with these required fields:
```
- Current employment status (dropdown): Employed / Unemployed / Underemployed / Student
- What's your primary goal? (dropdown): New career / Promotion / Certification / Exploring options
- How much time can you commit weekly? (dropdown): <5 hrs / 5-10 hrs / 10-20 hrs / 20+ hrs
- What's your biggest barrier right now? (text area, 200 char max)
- How did you hear about us? (dropdown + other)
- Phone number (required, if not already collected)
- Physical address (required, if not already collected)
- Are you currently receiving any workforce assistance? (yes/no)
```

**On submit:**
- Save to `PreScreeningResponse` table linked to Member
- Admin dashboard shows pre-screening responses alongside member profile
- Member status advances to "Interview Eligible"
- Admin gets notification that a member is ready for interview

**Why this matters:** Your dad reviews pre-screening data before the call. He already knows who they are and what they need. 20-min interview becomes 10 min because he's not gathering basics.

### 3.3 — Admin: Interview Request Queue

**Page:** `/admin/members` → new "Interview Ready" tab

Shows:
- Members who completed pre-screening
- Their assessment score
- Pre-screening summary (goal, time commitment, barrier)
- "Schedule Interview" button (for now: opens email compose with member's contact info)
- "Mark Interviewed" action

This queue replaces the ad-hoc process. Your dad works the queue.

---

## Part 4: Member Profile — Required Fields Gate

**Problem:** Members can become members without giving contact info. After the fact, they won't.

**Solution:** Before a member can access training enrollment (not tools, just training):
- Phone number required
- Physical address required
- Financial aid interest (yes/no)

**Implementation:**
- Check `member.phone` and `member.address` on training enrollment attempt
- If missing → show inline prompt "Complete your profile to enroll in training"
- Does NOT block tool access (resume builder, AI tools, job browsing)
- Does block course enrollment and interview scheduling

---

## Part 5: Org Settings Admin Page

Needed for multi-tenant — each licensed org must configure their own branding without touching code.

**Page:** `/admin/settings`

Fields:
- Org name
- Logo upload (reuse existing Supabase storage pattern)
- Primary color (hex input with preview)
- Overview video URL (Loom/YouTube/Vimeo — used in member onboarding Step 2)

Store on `Organization` model. Any org-scoped page reads `org.primaryColor` and `org.logo` for branding. The overview video URL replaces the hardcoded embed in the onboarding flow.

---

## Part 6: Texas State Funding Export

Your dad needs to submit 18 class records to TWC for state exemption approval. The Program model already has all the required fields. Add a one-click export.

**Page:** `/admin/programs` → "Export for TX State Approval" button

**Output:** CSV (or printable page) with one row per active program:
- Program name
- Short description (first 200 chars)
- Duration
- Tuition cost
- Certification exam cost
- Book/materials cost
- Miscellaneous fees
- Total cost (sum of above)
- Start date (if set, else "Rolling")
- End date (if set, else "Rolling")
- Certifications earned (comma-separated)

This saves hours on the TWC application. The data is already in the DB — this is purely a view layer.

---

## Part 7: Admin Enrollment Bypass

The profile-required gate (phone + address before training enrollment) must have an admin override. If your dad manually enrolls someone from his network, he shouldn't hit the same gate as a self-serve member.

**Implementation:**
- Add `enrolledByAdminId String?` to `CourseEnrollment` model (nullable — null = self-enrolled)
- When admin enrolls a member from the admin portal, set this field to the admin's user ID
- Skip the profile-required gate when `enrolledByAdminId` is set
- Member still sees a "Complete your profile" prompt after enrollment — soft nudge, not a hard block
- Admin dashboard enrollment action: shows a confirmation modal "Enroll [Name] in [Program]? Their profile is incomplete — they'll be prompted to complete it after enrollment."

---

## What NOT to Build in This Sprint

- Calendly integration (AI agent intake planned for next month)
- Coursera API integration (tomorrow — need creds first)
- Google Workspace provisioning (Sprint 8)
- Custom domain routing for tenant orgs (Sprint 9+)
- Billing/payments (post-launch)
- Member post-hire check-ins (Sprint 8)
- Partner referral attribution loop (Sprint 8)
- Employer co-funder tier (Sprint 9+)

---

## Definition of Done

- [ ] Organization model created, migration runs clean
- [ ] All existing data assigned to default WorkforceAP org
- [ ] Existing site works identically (zero regression)
- [ ] Admin can create/edit/deactivate programs from UI
- [ ] Homepage available talent section pulls from DB (no hardcoded list)
- [ ] Overview step has video embed (admin-configurable URL)
- [ ] Pre-screening form exists between Assessment and Interview steps
- [ ] Admin sees Interview Ready queue with pre-screening data
- [ ] Training enrollment gated on phone + address
- [ ] All tests pass, Vercel build succeeds
