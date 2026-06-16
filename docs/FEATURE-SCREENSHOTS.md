# WorkforceAP — Feature & Page Screenshot Documentation
**Date:** 2026-06-16  
**Deploy URL:** https://workforceap-beta-8wydewc3e-mabrown040-5207s-projects.vercel.app  
**Production Domain:** https://workforceap.org  
**Status:** Build passing ✅

---

## Screenshots Captured

### 1. Homepage (`/`)
**URL:** https://workforceap.org  
**Screenshot:** `browser_screenshot_76521e2d3c5d4d298391ca96429e8947.png`

**Features shown:**
- Hero: "Empowering People. Advancing Futures." with maroon CTA buttons
- Trust badges: "Reviewed by a real team", "25+ years experience", "Employer-recognized pathways"
- Program quick-start cards: Digital Literacy, IT Support, AI/Software Dev, Project Management
- Partner logos: Google, AT&T, Coursera, Microsoft, IBM
- Stakeholder sections: Members, Partners, Employers with CTAs
- Stats: 2,000+ learners, 20 programs, no upfront cost
- 11-step career journey visualization
- Footer with language toggle, site map, social links

---

### 2. Programs Catalog (`/programs`)
**URL:** https://workforceap.org/programs  
**Screenshot:** `browser_screenshot_bd9f3ec6f7f44e6386a16f011546aae1.png`

**Features shown:**
- Search bar: "Search by name, skill, partner, or topic"
- Category filter pills: All (20), Digital Literacy (1), IT Support (6), Database (3), Programming (2), Web (1), Leadership (2), Medical (2), Mfg & Logistics (2), Construction (1)
- Program cards with: WIOA/GRANT badges, duration, salary range, language options, skill tags
- "Compare Programs" and "View Salary Guide" CTAs
- "Start here" recommendations: Digital Literacy, IT Support, Project Management
- Pathfinder quiz link

---

### 3. Single Program Page (`/programs/[slug]`)
**URL:** https://workforceap.org/programs/it-support-professional-certificate-ibm  
**Screenshot:** `browser_screenshot_ec952994cbc0415181bcfae247930729.png`

**Features shown:**
- Program header: IT Support Professional Certificate (IBM)
- Metadata: 3-5 months, 10 hrs/week, $55K–$72K starting range
- "Best for" and "Job outcomes" summaries
- 9-course accordion list with ~10hr per course
- Skills tags: Help desk, Hardware, Software, Customer service
- Career outcomes: IT Support Specialist, Help Desk Technician, Technical Support
- Difficulty rating (1/3 stars)
- Funding info: WIOA for qualifying members
- Language support: English, Spanish (auto), Portuguese, French (auto)
- Related programs at bottom
- Apply Now CTA

---

### 4. Career Quiz (`/career-quiz`)
**URL:** https://workforceap.org/career-quiz  
**Screenshot:** `browser_screenshot_8239aca705a047dea2322330c3a6c9ab.png`

**Features shown:**
- RIASEC assessment: 6 questions, no account needed
- Question 1: "Build, fix, or work hands-on with tools, machines, or the outdoors" (Realistic category)
- 5-point Likert scale: Dislike → Slightly dislike → Neutral → Like → Love it
- Progress indicator: "QUESTION 1 OF 6"
- O*NET attribution in footer
- Lead magnet: results → program recommendations → apply CTA

---

### 5. Application Form (`/apply`)
**URL:** https://workforceap.org/apply  
**Screenshot:** `browser_screenshot_ff19790c4e1342d1b564d97d33c07ae4.png`

**Features shown:**
- 3-step progress sidebar: You & eligibility → Program choices → Account
- Step 1: Eligibility screening
  - Employment status (unemployed/underemployed)
  - Household income (<$60K)
  - Work authorization
- Contact info: First name, Last name, Email, Phone
- Demographics: Age group, City, State, ZIP, County
- Barriers: Multi-select checkboxes
- "About 5 minutes · Save and finish later" note
- Advisor contact: Phone (512) 777-1808, email link
- Funding disclosure: "Programs offered at no cost for qualifying members"

---

## Build Status

**Vercel Deploy:** ✅ Ready (production)  
**Migration Status:** ✅ Resolved (20260614180000 force-resolved, recovery migration applied)  
**Tests:** 686 pass, 0 fail  
**Build time:** ~6 minutes  

## Files Added/Modified in This Session

- `docs/SITE-FEATURES-COMPLETE.md` — Comprehensive site documentation (470 lines)
- `prisma/migrations/20260616000000_recovery_failed_20260614180000/migration.sql` — Migration recovery
- `scripts/vercel-deploy-fix.sh` — Deploy fix script
- `app/programs/[slug]/page.tsx` — Deleted (duplicate route fix)
- `docs/DISPATCH_BOARD.md` — Lane routing documentation
- `docs/ENGINEER_ORCHESTRATION.md` — Engineer workflow documentation

---

*Screenshots cached at: /home/claw/.hermes/profiles/coder-kimi/cache/screenshots/*
