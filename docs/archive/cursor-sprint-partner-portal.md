# Cursor Sprint: Partner Portal + Member Assignment + Notification System

**Date:** 2026-03-19  
**Priority:** High — requested by Mike Sr. (Dad) for operational use  
**Branch:** `feature/partner-portal-v2`

---

## Context

WorkforceAP has a Partner model and basic admin Partners page already. This sprint upgrades the full partner experience:

1. **Partner Portal** — Partners get their own login view with scoped member visibility
2. **Member ↔ Partner Assignment** — When adding members from admin, assign to a partner for referral tracking
3. **Email Notifications** — Partners get email updates on their students' progress
4. **How It Works** — Improve the content/visibility of the 10-step process page
5. **Bug Backlog** — Known fixes from prior PRs

---

## Feature 1: Partner Portal (Scoped Dashboard)

### Goal
Partners log in and see ONLY their referred members, progress analytics, and notifications. They cannot see other partners' data.

### Schema Changes Needed (add to `prisma/schema.prisma`)

Add `partnerUser` concept — a user with role `partner` linked to a `Partner` record:

```prisma
model PartnerUser {
  id        String   @id @default(uuid())
  partnerId String   @map("partner_id")
  userId    String   @unique @map("user_id")  // links to User with role = partner
  createdAt DateTime @default(now()) @map("created_at")

  partner Partner @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([partnerId])
  @@map("partner_users")
}
```

Also add to `Partner` model:
```prisma
  partnerUsers PartnerUser[]
```

Also add to `User` model:
```prisma
  partnerUser  PartnerUser?
```

Generate and run migration: `npx prisma migrate dev --name add_partner_users`

### New Pages to Create

#### `/app/admin/partners/[id]/page.tsx` — Admin Partner Detail
- Show partner name, contact info, assigned counselors
- Table of all referred members (via `PartnerReferral`) with columns: Name, Program, Progress %, Status, Enrolled Date
- Analytics summary: Total referred, Active members, Completions, Placements
- Action: "Invite Partner User" button — sends invite email to partner contact email

#### `/app/(portal)/partner/page.tsx` — Partner Dashboard  
Route guard: must have role `partner` (check via `PartnerUser` record)

Sections:
1. **Stats row**: Total Members · Active · Completed · Placed
2. **Members table**: Name | Program | Progress | Last Active | Status
3. **Recent Activity**: Last 10 milestone events for their members (program enrollment, course completions, certifications, placements)

No cross-partner data. Filter ALL queries by `partner.id` from `PartnerUser.partnerId`.

#### `/app/(portal)/partner/members/[id]/page.tsx` — Partner Member Detail
Partner can view (read-only):
- Member profile info (no PII beyond name + progress)
- Course completion checklist
- Program milestones
- Placement status

**Partner CANNOT see**: contact info, assessment scores, benefit requests, full profile.

### Auth / Role Logic
- Add `isPartner(userId)` function to `lib/auth/roles.ts`
- Add `getPartnerForUser(userId)` function returning the `PartnerUser` with partner

### Nav
- Add "Partner Portal" to the nav dropdown (only visible when `role === partner`)
- Partner portal uses the existing `(portal)` layout but with a "Partner View" header indicator

---

## Feature 2: Member → Partner Assignment (Admin Side)

### Goal
When admin adds or edits a member, they can assign the member to a partner organization. This creates a `PartnerReferral` record and enables tracking.

### Changes to `AddMemberWizard` (or final step)
In `app/admin/members/new/AddMemberWizard.tsx`:
- Add a "Partner Referral" step (or add to existing step)
- Dropdown: "Referred by partner?" — fetches all active partners from `/api/admin/partners`
- If selected, stores `partnerId` and creates `PartnerReferral` on member creation

### Changes to Member Edit Page (`app/admin/members/[id]/page.tsx`)
- Add "Partner Assignment" section
- Show current assigned partner (if any)
- Allow admin to assign or change partner
- API: `PATCH /api/admin/members/[id]/partner` — upserts `PartnerReferral`

### Admin Members Table
- Add "Partner" column to the members table showing partner name (if assigned)
- Make it filterable by partner

### API Route: `app/api/admin/members/[id]/partner/route.ts`
```typescript
// PATCH: assign or update partner for a member
// Body: { partnerId: string | null }
// Creates or deletes PartnerReferral record
```

---

## Feature 3: Email Notifications for Partners

### Goal
When a member (referred by a partner) hits key milestones, the partner contact email gets a notification.

### Milestone Events to Notify On
1. Member enrolls in a program
2. Member completes a course (every course)
3. Member earns a certification
4. Member gets placed in a job

### Implementation

#### `lib/notifications/partner-notify.ts`
```typescript
// sendPartnerMilestoneEmail(memberId, milestone, details)
// 1. Look up PartnerReferral for memberId
// 2. Look up Partner contactEmail
// 3. Send email via existing email provider (check how other emails are sent in the app)
// Milestone types: 'program_enrolled' | 'course_completed' | 'certified' | 'placed'
```

#### Email Template (simple, professional)
Subject: `[WorkforceAP] Update on [Member First Name] — [Milestone]`

Body:
```
Hi [Partner Contact Name],

Here's an update on a member you referred to WorkforceAP:

Member: [First Name Last Name]
Program: [Program Title]
Update: [Milestone description]
Date: [Date]

You can view their full progress by logging into your partner portal at workforceap.org/partner

— WorkforceAP Team
```

#### Hook Notification Triggers
Wire `sendPartnerMilestoneEmail` calls into these existing locations:
- Program enrollment: wherever `enrolledProgram` is set on the user
- Course completion: wherever `coursesCompleted` is updated
- Certification: wherever `UserCertification` records are created
- Placement: wherever `PlacementRecord` is created

Check existing API routes in `app/api/` for these mutation points.

### Optional: Partner Notification Preferences
Add to `Partner` model:
```prisma
  notifyOnEnrollment   Boolean @default(true) @map("notify_on_enrollment")
  notifyOnCourse       Boolean @default(true) @map("notify_on_course")
  notifyOnCertified    Boolean @default(true) @map("notify_on_certified")
  notifyOnPlaced       Boolean @default(true) @map("notify_on_placed")
```

Admin can toggle these per partner on the partner edit page.

---

## Feature 4: How It Works — Better Visibility & Copy

File: `app/how-it-works/page.tsx`

### Issues to Fix
1. **Step descriptions are too thin** — "Quick online application" tells nobody anything. Expand each step.
2. **Phase background numbers overlap content** on mobile (the giant "01" watermark)
3. **No CTA at the bottom** — page just ends, no "Ready to apply?" section

### Updated Step Copy (use this exactly — no slop, no buzzwords)

**Phase 1: Get Started**
- Step 1 Apply: "Fill out a 5-minute online form. We'll reach out within 48 hours."
- Step 2 Overview: "Meet with a counselor to review programs, timelines, and what to expect."
- Step 3 Interview: "A 30-minute one-on-one to confirm you're a fit and answer your questions."

**Phase 2: Build Your Future**
- Step 4 Membership: "Join at no cost. All accepted members receive free access to resources, support, and training."
- Step 5 Assessment: "Skills and goals evaluation to match you with the right career path."
- Step 6 Workforce Readiness: "Soft skills, job search basics, and workplace expectations — the foundation employers require."
- Step 7 Resources: "Loaner laptop program, resume support, community network, and on-demand tools."

**Phase 3: Launch Your Career**
- Step 8 Training: "Industry certification courses taught by certified instructors or approved online platforms."
- Step 9 Certify: "Earn credentials recognized by employers — CompTIA, AWS, Google, Microsoft, and more."
- Step 10 Job Placement Assistance: "Resume review, interview prep, employer connections, and job search support until you land."
- Step 11 Better Life & Future: "A career that pays. Graduates average $42K+ starting salary in their new field."

### Add Bottom CTA Section
```tsx
<section style={{ background: 'var(--color-accent)', color: 'white', padding: '4rem 2rem', textAlign: 'center' }}>
  <h2 style={{ color: 'white', marginBottom: '1rem' }}>Ready to Start?</h2>
  <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '480px', margin: '0 auto 2rem' }}>
    Applications take 5 minutes. Counselors reach out within 48 hours.
  </p>
  <Link href="/apply" className="btn" style={{ background: 'white', color: 'var(--color-accent)', fontWeight: 700 }}>
    Apply Now — It's Free
  </Link>
</section>
```

### Fix Mobile Layout
- `.phase-bg-number` — on mobile (< 768px), reduce to `font-size: 6rem; opacity: 0.06` so it doesn't obscure steps
- Ensure step items stack cleanly on mobile with `gap: 1rem`

---

## Feature 5: Bug Fixes from Backlog

### Bug 1: UI Visibility Fixes (from PR #57 — confirm merged or re-apply)
File: `css/main.css`

Verify these are in place (if PR #57 not merged, apply manually):
- `.trust-logos img` → remove `grayscale(100%)`, use `brightness(0.95) opacity(0.92)`
- `.partner-logos-small img` → same fix
- `.partners-grid img` → same fix  
- `.photo-highlight-overlay` → gradient alpha `0.72 → 0.45 → 0.30` (not 0.92)

### Bug 2: Referral Source Fallback Array (from PR review)
File: wherever the application form referral sources fallback array is defined (client-side)

Keep full partner list in fallback:
```typescript
const FALLBACK_REFERRAL_SOURCES = [
  'Workforce Solutions',
  'Texas Workforce Commission (TWC)',
  'Austin Area Urban League',
  'African American Youth Harvest Foundation',
  '211 Texas',
  'Community Organization',
  'Flyer or Brochure',
  'WorkforceAP Counselor',
  'Other',
];
```

### Bug 3: Partner Empty State Description (Admin)
File: `app/admin/partners/page.tsx`

Update the empty state copy from:
> "Partners are employers, workforce boards, and training providers who refer candidates to your programs."

To:
> "Partner organizations refer candidates to WorkforceAP. Each partner gets their own portal login, referral tracking, and milestone notifications for their members."

---

## Definition of Done

- [ ] `PartnerUser` schema model added, migration created and runs without errors
- [ ] `/admin/partners/[id]` shows referred members + analytics
- [ ] Partner invite flow sends email to partner contact
- [ ] `/partner` portal route works for partner-role users, shows only their members
- [ ] Member add wizard includes partner assignment step
- [ ] Member list table shows assigned partner column
- [ ] `PATCH /api/admin/members/[id]/partner` route works
- [ ] `sendPartnerMilestoneEmail` wired to enrollment, course completion, certification, placement
- [ ] How It Works step copy updated (all 11 steps)
- [ ] How It Works bottom CTA section added
- [ ] How It Works mobile phase number fix applied
- [ ] CSS visibility bugs verified fixed
- [ ] Referral source fallback array complete
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] No new slop copy introduced (no buzzwords, no placeholders)

---

## Anti-Slop Rules (Mandatory)

- No buzzwords: "revolutionary," "seamless," "cutting-edge," "holistic," "world-class"
- No vague benefits — use specific numbers and timelines
- No placeholder text anywhere
- Partner emails must sound human and specific, not template-generic
- WorkforceAP tone: Direct, practical, specific, respectful

---

## Branch & PR

- Branch: `feature/partner-portal-v2`
- Auto-create PR with detailed description of all changes
- PR title: `feat: Partner portal, member assignment, milestone notifications, How It Works copy`
