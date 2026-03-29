# Pending Stitch Screen Prompts

Project: `18255988866302206897`

These prompts are ready to run once a fresh Stitch bearer token is available.

---

## 1) Employers Mobile Screen

**Target filename:** `mobile-employers.html`

**Prompt:**

```text
Create a mobile-first WorkforceAP "For Employers" screen (390px viewport) in the same visual system as our existing mobile files (Tailwind CDN, Inter, Material Symbols, maroon/gold civic palette, high contrast, rounded cards, sticky bottom nav).

Goal: convert employers into leads and partnership inquiries.

Include sections in this order:
1) Top app bar with brand + back/menu affordance.
2) Hero headline: "Build Your Workforce Pipeline" with subcopy about no-cost employer partnerships.
3) Primary CTA button: "Partner With Us".
4) Secondary CTA text button: "Schedule a Call".
5) "Why Partner" value cards (3 cards):
   - Pre-screened candidates
   - Industry-aligned training
   - Ongoing placement support
6) "How It Works" 3-step horizontal/stack flow:
   - Share hiring needs
   - Review candidate matches
   - Hire + onboard with support
7) Testimonial quote block from an employer (placeholder text acceptable).
8) Industries chips/list (Healthcare, IT/Cyber, Business Ops, Skilled Trades).
9) Contact form preview card with fields:
   - Company name
   - Hiring roles
   - Contact email
   - Preferred timeline
   And a submit CTA "Request Employer Outreach".
10) Sticky bottom quick action bar with phone/email icon actions.
11) Standard WorkforceAP mobile bottom navigation with Employers tab highlighted.

Design constraints:
- Keep text concise and conversion-oriented.
- Maintain accessibility (tap targets >= 44px, readable type scale, strong contrast).
- No external JS frameworks beyond Tailwind CDN.
- Output a complete standalone HTML file.
```

---

## 2) What We Do Mobile Screen

**Target filename:** `mobile-what-we-do.html`

**Prompt:**

```text
Create a mobile-first WorkforceAP "What We Do" screen (390px viewport) consistent with our existing mobile design language (Tailwind CDN, Inter, Material Symbols, maroon/gold accent, clean editorial card layout, soft shadows, rounded corners).

Goal: clearly explain WorkforceAP services and program model for prospective learners and partners.

Include sections in this order:
1) Top app bar with brand + navigation affordance.
2) Hero section:
   - Title: "What We Do"
   - Subtitle summarizing WorkforceAP mission: helping people transition into in-demand careers.
3) 4 service pillars as icon cards:
   - Career Discovery
   - Skills Training
   - Career Coaching
   - Employer Connections
4) "Who We Serve" segment with 3 audience cards:
   - Career changers
   - Job seekers
   - Employers
5) "Program Pathway" vertical timeline:
   - Discover
   - Enroll
   - Train
   - Get Hired
6) Impact stats row (3 metrics placeholders):
   - Learners supported
   - Completion rate
   - Employer partners
7) Short FAQ accordion-style card list (static UI acceptable):
   - Cost
   - Duration
   - Eligibility
8) Primary CTA: "Explore Programs"
9) Secondary CTA: "Take Career Quiz"
10) Footer/support strip with contact/help link.
11) WorkforceAP bottom mobile nav with "What We Do" (or About) state visually active.

Design constraints:
- Prioritize clarity and scanability.
- Keep copy concise, professional, civic-impact tone.
- Ensure accessible spacing, typography, and touch targets.
- Output complete standalone HTML only.
```

---

## Notes

- Existing generated screen IDs already mapped in `STITCH-REFRESH-PROTOCOL.md`.
- After token refresh, run each prompt through Stitch and save outputs in `.stitch/`.

---

## 3) Member Portal - Resume & Certifications

**Target filename:** `portal-member-resume.html`

**Prompt:**
```text
Create a desktop-first screen for the WorkforceAP "Member Portal - Resume & Certifications" page.
It should use the existing WorkforceAP visual system (Tailwind CSS, Inter font, Material Symbols, primary maroon color #8c0f37, light gray backgrounds #f8fafc).
Include a left sidebar navigation with links: Dashboard, Resume, Job Matches, Learning, Messages, and AI Tools.
The main content area should have:
1) A header "My Resume & Certifications".
2) A prominent card section to either upload a PDF resume or build one using the "AI Resume Rewriter" (with a clear call-to-action button).
3) A section listing currently saved skills as chips/tags, with an "+ Add Skill" button.
4) A section listing uploaded or verified certifications (e.g., CompTIA A+, OSHA 30) with status badges (Verified, Pending).
5) A primary call to action button at the top right to "Generate PDF Resume" based on the profile data.
```

---

## 4) Employer Portal - Post a Job

**Target filename:** `portal-employer-new-job.html`

**Prompt:**
```text
Create a desktop-first screen for the WorkforceAP "Employer Portal - Post a New Job" page.
Use the established WorkforceAP design language (Tailwind CSS, Inter font, Material Symbols, maroon/gold civic palette).
Include a left sidebar navigation for Employers: Dashboard, Jobs, Applications, Talent Pipeline, Settings.
The main content area should feature a clean, multi-step form wizard layout:
1) A header "Create New Job Posting".
2) A progress indicator at the top (Step 1: Job Details, Step 2: Requirements, Step 3: Match Criteria, Step 4: Review).
3) A form card (representing Step 1) containing standard inputs: Job Title, Location (Remote/Hybrid/On-site), Employment Type (Full-time, Part-time), and Salary Range.
4) A rich text editor placeholder for the Job Description.
5) Form action buttons at the bottom: "Cancel", "Save Draft", and a primary "Next: Requirements" button.
```

---

## 5) Partner Portal - Member Management

**Target filename:** `portal-partner-members.html`

**Prompt:**
```text
Create a desktop-first screen for the WorkforceAP "Partner Portal - Member Management" page.
Design constraints: Tailwind CSS, Inter font, Material Symbols, maroon/gold accent colors.
Include a left sidebar navigation for Partners: Dashboard, Members, Needs Attention, Milestones, Outcomes, Settings.
The main content area should be a robust data table view:
1) A header "Manage Referred Members".
2) A top action bar with a search input, a "Filter by Status" dropdown, and an "Export CSV" button.
3) A large data table listing members referred by the partner organization. Columns should include:
   - Member Name (with avatar placeholder)
   - Referral Date
   - Current Status (e.g., Enrolled, Placed, Needs Attention - use colored badges)
   - Pathway (e.g., IT Support, Healthcare)
   - Last Activity Date
   - Quick Actions (View Profile, Send Message)
4) Pagination controls at the bottom of the table.
```

---

## 6) Member Portal - AI Tool: Interview Practice

**Target filename:** `portal-ai-tool-interview-practice.html`

**Prompt:**
```text
Create a desktop-first screen for the WorkforceAP "Member Portal - AI Interview Practice" tool.
Use the established WorkforceAP design language (Tailwind CSS, Inter, Material Symbols, maroon/gold).
Include the standard left sidebar navigation for the Member Portal.
The main content area should feel like an interactive chat interface:
1) A header "AI Interview Practice" with a "New Session" button.
2) A configuration card at the top to select the "Target Role" (e.g., Junior IT Support) and "Interview Type" (e.g., Behavioral, Technical).
3) A split view below the configuration:
   - Left pane: The chat log between the user and the "AI Interviewer". Include sample messages (AI asking a question, user responding, AI providing constructive feedback).
   - Right pane: "Real-time Feedback & Tips" card showing metrics like "Clarity", "Confidence", and "Keywords Used".
4) A message input box at the bottom of the chat pane with a "Send" button and a microphone icon for voice input.
```
