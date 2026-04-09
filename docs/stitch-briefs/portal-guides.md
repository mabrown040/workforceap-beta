# Stitch Brief: Portal Guides & Overviews

Build a guide/overview page for each of the three user portals. Each guide is a first-stop orientation that helps a new user understand what the portal does, what their first actions are, and what success looks like.

These are not help docs. They are onboarding experiences that make someone feel like they landed in the right place.

---

## Portal 1: Member Portal Guide
**URL:** `/dashboard/guide` (also linked prominently from `/dashboard`)

### Who This Is For
Someone who just enrolled. Excited but overwhelmed. They've seen the dashboard but don't know where to start. Many are nervous — they've been out of the workforce, they're pivoting careers, or they've been rejected before and aren't sure this will be different.

### Emotional Goal
Leave this page feeling: "I know exactly what to do next. I can do this."

### Page Structure

```
[Header]
Your WorkforceAP Journey
Here's how to get from enrolled to employed.

[Progress Path — visual timeline, 5 stages]
  1. Complete your profile
     → Resume, skills, career goals
     → Link: /dashboard/profile

  2. Get assessment ready
     → Career readiness assessment
     → Link: /dashboard/assessment

  3. Build your materials
     → Resume Rewriter, Cover Letter Builder, LinkedIn About
     → Link: /dashboard/ai-tools

  4. Practice interviews
     → AI Interview Coach (voice)
     → Link: /dashboard/interview-coach

  5. Connect with a counselor
     → Book a 1-on-1 session
     → Link: /dashboard/counselor

[Your Benefits — horizontal cards]
  • LinkedIn Premium (request in dashboard)
  • Coursera Access (free certifications)
  • AI Career Tools (7 tools)
  • Human Counselor (assigned to you)

[FAQ — accordion]
  Q: How long does the program take?
  Q: Is everything free for me?
  Q: When will I get matched with a job?
  Q: Who is my counselor and how do I reach them?
  Q: What if I need help with something specific?
```

### Design Direction
- Visual progress path — not a list, a journey. Show where they are in it.
- Warm, encouraging tone. Not corporate. Not clinical.
- Each step has a clear action button, not just information.
- Mobile-first — most members are on phones.

### Technical Notes
- Server component — pull member's current stage from `member.enrollmentState` to highlight the active step
- No new API routes needed
- Add "View Guide" card to member dashboard (`/dashboard/page.tsx`)

---

## Portal 2: Employer Portal Guide
**URL:** `/employer/guide`

### Who This Is For
An HR manager or hiring lead who just got portal access. They're busy. They have real hiring needs. They want to know: what exactly is WorkforceAP, how fast can I get candidates, and what do I have to do?

### Emotional Goal
Leave this page feeling: "This is easy and this is worth my time."

### Page Structure

```
[Header]
How WorkforceAP Works for Employers
Access vetted, job-ready talent — in a few simple steps.

[3-Step Visual Flow]
  1. Post a Job
     → Describe the role. We match it to qualified members.
     → Action: Post a Job → /employer/jobs/new

  2. Review Candidates
     → WorkforceAP pre-screens candidates before you see them.
     → Action: View Pipeline → /employer/pipeline

  3. Hire & Give Back
     → When you hire a WorkforceAP member, a 10% first-year salary giveback
       supports the program and trains the next candidate.
     → (No upfront cost. Optional but appreciated.)

[What Sets WorkforceAP Candidates Apart]
  ✓ Completed career readiness training
  ✓ Practiced interviews with AI coach
  ✓ Resume reviewed and optimized
  ✓ Assigned a counselor — they're supported through onboarding

[Your Portal — quick nav]
  📋 Post a Job
  👥 Browse Pipeline
  📩 View Applications
  📊 Hiring Outcomes
  ⚙️  Settings

[FAQ]
  Q: Is there a cost to post jobs?
  Q: What's the 10% giveback?
  Q: How are candidates screened?
  Q: How long until I see candidates?
  Q: What industries do you serve?

[Contact CTA]
  "Have questions? Email us at partnerships@workforceap.org"
```

### Design Direction
- Business-grade but human. Not stuffy.
- Emphasize speed and quality of candidates, not the nonprofit mission (they'll get that later).
- The 10% giveback gets its own clear explanation — it's not a fee, it's a choice that funds the mission.
- Desktop-first layout — most employers are on desktop.

### Technical Notes
- Server component — auth check via `getEmployerForUser()`
- Add link to guide from employer dashboard header/nav
- File: `app/(portal)/employer/guide/page.tsx`

---

## Portal 3: Counselor Portal Guide
**URL:** `/counselor/guide`

### Who This Is For
A WorkforceAP staff counselor or affiliate counselor just starting to use the portal. They're already bought in to the mission. They need to know: where are my assigned members, what does the tool give me, and what should I do first?

### Emotional Goal
Leave this page feeling: "I have everything I need to actually help these members."

### Page Structure

```
[Header]
Your Counselor Portal
The tools to guide your members from enrollment to employment.

[Your Caseload — live data box]
  X members assigned
  Y need attention this week
  [View Your Students → /counselor/students]

[What You Can Do Here]
  → View member progress (enrollment stage, tools used, readiness score)
  → Message members directly
  → Flag issues or escalate to program staff
  → Log session notes
  → Mark milestones (interview completed, job offer, placement)

[Member Journey Reference — compact]
  Stage 1: Profile complete
  Stage 2: Assessment done
  Stage 3: AI tools used (resume, interview)
  Stage 4: Interview ready
  Stage 5: Active job search
  Stage 6: Placed ✓

  → Members can be at any stage. Your job: move them forward.

[Quick Actions]
  → Message a member
  → Log a session note
  → View flagged members
  → Add a resource to a member's dashboard

[FAQ for Counselors]
  Q: How do I get assigned new members?
  Q: Can I see what AI tools my members have used?
  Q: How do I flag a member for additional support?
  Q: How do I mark a placement?
```

### Design Direction
- Functional and clear — counselors are professional users who want tools, not inspiration.
- Data front and center: how many members, who needs attention.
- Still warm — this work matters and the UI should reflect that.
- Desktop-first.

### Technical Notes
- Server component — auth via `isCounselor()` 
- Pull live member count from `counselorAssignment` table
- File: `app/(portal)/counselor/guide/page.tsx`
- Add link from counselor dashboard

---

## Partner Portal Guide Update
**URL:** `/partner/guide` (exists but needs upgrade)

Current state: 4 bare steps. Needs warmth and actual content.

Update the existing page to match the same quality as the others:

```
[Header]
How to Refer Members to WorkforceAP
A practical guide for [Partner Name] staff.

[Who Is WorkforceAP For?]
  Job seekers who are unemployed, underemployed, or changing careers.
  Free for members. Your referrals help them access job training, AI career tools,
  counseling, and employer connections.

[3-Step Referral Process — visual]
  1. Identify a candidate
     → Meets criteria: committed, available, motivated to work

  2. Send them to Apply
     → workforceap.org/apply — takes 10 minutes
     → Tell them to list [Your Org] as how they heard about us

  3. Track their progress
     → Referred members appear on your dashboard with stage updates

[Your Referral Impact — live data if available]
  X members referred
  Y completed assessment
  Z placed in jobs

[FAQ]
  Q: What if someone doesn't qualify?
  Q: How do I know if my referral was accepted?
  Q: Can I refer someone who is already employed?
  Q: What if they need additional support?

[Contact]
  Questions? partnersupport@workforceap.org
```

File: update `app/(portal)/partner/guide/page.tsx`

---

## Shared Implementation Notes

1. All guides share the same warm, clear design language
2. Use `var(--color-accent)` for primary CTAs
3. Use `stitch-card` class for card containers
4. Mobile-first for member guide, desktop-first for employer/counselor
5. Each guide links back to the portal dashboard via breadcrumb
6. Add "Guide" / "How it works" link to each portal's nav/header

## Files to Create/Update
- `app/(portal)/dashboard/guide/page.tsx` — NEW
- `app/(portal)/employer/guide/page.tsx` — NEW
- `app/(portal)/counselor/guide/page.tsx` — NEW
- `app/(portal)/partner/guide/page.tsx` — UPDATE (exists, needs rewrite)
- Update nav links in each portal layout to include the guide
