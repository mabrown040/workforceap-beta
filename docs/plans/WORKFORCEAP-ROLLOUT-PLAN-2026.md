# WorkforceAP — Full Rollout Plan
**Confidential | March 2026 | Draft v1**

---

## Executive Summary

WorkforceAP is a full-stack workforce development platform targeting a $3B+ federally-funded market. We are a nonprofit building SaaS for the workforce ecosystem — connecting underserved adults, the organizations that serve them, and the employers that need them in a verified closed loop.

This document covers the product roadmap, go-to-market motions, revenue model, partnership strategy, AI capabilities, and open items requiring decision or research.

---

## The Problem

The U.S. workforce development system fails in the same three places every year:

1. **Fragmentation** — Job-seekers get referred, trained, certified, and placed by four different orgs that can't see each other's data. Every handoff is a fax, a spreadsheet, or a phone call.
2. **Exclusion by design** — Guild Education requires employer sponsorship. Handshake requires a college degree. NPower caps at age 29. The laid-off 34-year-old, the 42-year-old veteran, the 38-year-old mother restarting her career — they fall through every gap.
3. **Funders flying blind** — Government agencies and corporate sponsors pour money in and get PDF reports six months later. They can't see in real time whether their investment is working.

---

## The Platform (What We've Built)

### Four Integrated Portals

| Portal | Users | Key Capabilities |
|--------|-------|-----------------|
| **Member** | Job-seekers | AI career pathing, skills assessments, certification tracking, employer job access, counselor messaging, 180-day post-placement record |
| **Partner** | Nonprofits, churches, workforce centers, federal one-stops | Candidate referral, progress tracking, outcome data export, subgroup management |
| **Employer** | Hiring companies | Post jobs, search verified profiles by cert/skill, match scores, co-funding access |
| **Admin** | WorkforceAP staff | Full member lifecycle, counselor assignment, WIOA-compliant reporting, AI diagnostics, real-time dashboard |

### The Closed Loop

```
Partner refers member
    ↓
Member completes training → earns certification
    ↓
Employer searches verified profiles → hires member
    ↓
Placement recorded → partner sees outcome → funder gets proof
    ↓
Employer co-funds next cohort
```

No other platform closes this loop. That's the moat.

---

## AI Capabilities (Built + In Progress)

### Live in Product
- **Resume Rewriter** — AI-optimized resumes based on job description
- **Cover Letter Generator** — Role-specific cover letters
- **Interview Practice** — Question generation with answer frameworks
- **Job Match Scorer** — Match percentage between profile and job posting
- **LinkedIn Headline & About** — AI-drafted LinkedIn content
- **Salary Negotiation Coach** — Role/market-aware negotiation guidance
- **Gap Analyzer** — Skills gap identification against target roles
- **Application Tracker** — Centralized job application management

### In Active Development
- **AI Interview Coach (ElevenLabs)** — Voice-based mock interview with live transcript, AI feedback, session history. Falls back to text-based Anthropic AI if voice API unavailable. Branch: `feat/ai-interview-coach`
- **AI Support Bot (ElevenLabs)** — Grounded chatbot trained on WorkforceAP docs, program info, and FAQs. Replaces current Grok widget with branded, knowledgeable voice agent.

### Planned
- **Coursera Integration** — Direct access to Coursera catalog for course completion tracking (pending API key from Coursera account manager)
- **Office Hours / Live Mentorship** — Scheduled sessions with industry professionals (see Mentor Portal below)

---

## Mentor/Volunteer Portal

### Concept
Industry professionals volunteer time to mentor members. Key differentiators:
- Volunteer hours are logged and a **nonprofit tax deduction letter auto-generated** for mentors
- Members get career insight, path guidance, and professional connections
- Mentors are a separate user type from counselors — they're industry professionals, not staff
- WorkforceAP benefits: free expert capacity, employer brand-building, community goodwill

### Feature Set (Branch: `feat/mentor-portal`)
- Public "Become a Mentor" landing page
- Mentor application form (title, company, industry, bio, LinkedIn, hours/month, specialties)
- Member-facing mentor browse + filter (by industry, specialty)
- Mentor profile pages with session request flow
- Admin mentor management (approve/deactivate, oversight)
- Mentor dashboard: upcoming sessions, total hours donated, downloadable volunteer letter PDF

### Why This Matters
- Zero cost to acquire mentors (they give time to give back + get the tax write-off)
- Employers who sponsor their employees as mentors get brand visibility + talent pipeline exposure
- Creates a virtuous cycle: mentors meet members → some become employers or referrers

---

## Go-To-Market: Three Motions

### Motion 1 — Direct (WorkforceAP's Own Members)

**Who:** Adults with barriers to employment, reached via targeted digital advertising (Google Ads, Meta, church networks, community boards)

**How it works:**
- Member finds WorkforceAP via search/social
- Signs up, goes through intake and skills assessment
- Gets matched to programs, counselor, and job opportunities
- Employer sees verified, placed graduate — co-funds next cohort

**Funding:** Grant-funded (WIOA + workforce development grants) for qualifying members. Non-qualifying members are funded by partner/employer contributions.

**Member cost:** $0. Always. No exceptions.

---

### Motion 2 — Partner Referral Network

**Who:** Nonprofits, churches, workforce centers, federal one-stops, community orgs

**How it works:**
- Partner signs up for free
- Refers candidates to WorkforceAP
- Tracks their progress in real time
- Gets outcome data to report to their own funders
- WorkforceAP handles all program delivery

**Partner cost:** Free to refer. No platform fee.

**Partner incentive:** 10% revenue share on any funding that flows through their referral pipeline.

**Why partners join:** They get to deliver better outcomes to their existing clients without building or paying for a platform. They report better numbers to their funders. They get to offer AI-powered career tools to their members without building anything.

---

### Motion 3 — Nonprofit Licensing (SaaS)

**Who:** Other workforce development nonprofits that want to license the WorkforceAP platform for their own members

**How it works:**
- Partner nonprofit runs the platform under their own brand (white-label or co-branded)
- WorkforceAP provides the tech, they provide the members and local market knowledge
- Outcome data flows back for aggregate reporting

**Fee structure:** ⚠️ **Open Item — Requires Research** (see below)

---

## Revenue Model

| Stream | Source | Status |
|--------|--------|--------|
| Government grants | WIOA, state workforce funds, federal grants | Active — core funding |
| Employer co-funding | Employers pay to access pipeline + co-fund cohorts | Active — in product |
| Partner employer fees | Employers referred by partners who get first-look access | Active — in product |
| Partner revenue share | 10% of funding flowing through partner referrals | Model defined |
| Nonprofit SaaS licensing | Other nonprofits licensing the platform | **Pricing TBD** |

### Open Item: Nonprofit-to-Nonprofit SaaS Pricing

WorkforceAP is a nonprofit selling a platform to other nonprofits. This creates a nuanced pricing challenge:

**Questions to research:**
- How do other nonprofit-built SaaS platforms structure fees for peer nonprofits? (Examples: Salesforce.org, Apricot/Bonterra, Apricot by Social Solutions)
- Can licensing fees be grant-fundable? (i.e., structured as a service contract, not "software," so it's eligible as a program expense)
- Is an earned income model appropriate, or should this be structured as a fiscal sponsorship / sub-award?
- What UBIT (Unrelated Business Income Tax) exposure exists if WorkforceAP charges for software licensing?
- Is per-seat pricing, per-org pricing, or outcome-based pricing most appropriate for this market?

**Recommendation:** Get a nonprofit attorney and/or CPA familiar with earned income models to review before setting pricing. Ballpark research target: $500–$2,000/month per org depending on size, with grant-friendly invoicing language.

---

## AI Support Bot (ElevenLabs) — Planned Sprint

### Current State
AI support is powered by a Grok widget. It's generic and not grounded in WorkforceAP's programs, policies, or voice.

### What to Build
An ElevenLabs-powered voice + chat support agent that:
- Is trained on WorkforceAP documentation, program info, FAQ, and application process
- Answers member questions in a branded, consistent voice
- Handles common questions: "What programs do you have?", "Am I eligible?", "How do I apply?", "What certifications can I earn?"
- Escalates to a human counselor when the question is too specific or sensitive

### Why ElevenLabs
- Conversational AI quality far exceeds a generic chatbot
- Voice capability is on-brand for a workforce platform (accessibility + engagement)
- Already integrated in the product (lib/ai/elevenlabs.ts live)
- Nonprofit angle: AI support reduces counselor load, letting humans focus on high-touch members

---

## Office Hours Feature — Planned

### Concept
Live, scheduled video/audio sessions between members and staff, mentors, or counselors. Positioned as "office hours" rather than appointments — approachable, low-barrier.

### Feature Set
- Available slots calendar per counselor/mentor
- Member books a slot (30/60 min)
- Reminder emails/notifications
- Session notes recorded post-call
- Hours logged against mentor's volunteer total

### Integration Points
- Mentor Portal (mentor office hours)
- Counselor Portal (case manager drop-in hours)
- Possible: Calendly or native booking

---

## Technical Status

### Platform Health
- Framework: Next.js 14 (App Router)
- DB: PostgreSQL via Supabase (project: jqddnyuszufndwwezdwp)
- Auth: Supabase Auth
- Hosting: Vercel
- Styling: Custom design system with wa- Tailwind prefix

### Active Branches / PRs
| Branch | Feature | Status |
|--------|---------|--------|
| `feat/funding-source-schema` | FundingSource enum, workspace email provisioning, admin enrollment UI | ✅ Complete — needs PR |
| `feat/mobile-ai-tools-remaining` | Mobile wrappers for AI tool sub-pages + messages | ✅ Complete — needs PR |
| `feat/ai-interview-coach` | ElevenLabs Interview Coach | 🔄 In progress |
| `feat/mentor-portal` | Full mentor portal foundation | 🔄 In progress |

### Pending Decisions / Blockers
- **Coursera API keys** — Email/Slack Coursera account manager. Needed before Coursera integration sprint.
- **Anthropic nonprofit license** — ~$40. Buy before AI features hit production at launch scale to avoid throttling.
- **ElevenLabs API key** — Needed for Interview Coach and Support Bot production deployment.
- **Nonprofit SaaS pricing research** — Before Motion 3 can launch.

---

## Launch Readiness Checklist

### Must-Have Before Launch
- [ ] All active branches merged and verified on staging
- [ ] Counselor assignment workflow end-to-end tested
- [ ] Member enrollment → program → placement workflow verified
- [ ] WIOA-compliant reporting export tested
- [ ] Mobile experience verified (all portal pages)
- [ ] Partner referral flow tested end-to-end
- [ ] Employer job posting + matching tested
- [ ] Email notifications working (counselor assignment, placement, etc.)
- [ ] Privacy policy + terms of service live
- [ ] Supabase backups configured

### Nice-to-Have at Launch
- [ ] AI Interview Coach (ElevenLabs)
- [ ] Mentor Portal
- [ ] AI Support Bot
- [ ] Coursera integration
- [ ] Office hours booking

---

## Open Items Summary

| # | Item | Owner | Priority |
|---|------|-------|----------|
| 1 | Nonprofit SaaS pricing research (UBIT, earned income model, grant-fundable structure) | Mike + attorney/CPA | HIGH |
| 2 | Coursera API keys — contact account manager | Mike | HIGH |
| 3 | Anthropic nonprofit license (~$40) | Mike | HIGH |
| 4 | ElevenLabs API key for production | Mike | MEDIUM |
| 5 | SaaS fee structure for Motion 3 | Mike (after research) | MEDIUM |
| 6 | Partner revenue share agreement template | Mike + attorney | MEDIUM |
| 7 | Office hours feature spec + scheduling tool decision | Mike + Forge | LOW |

---

## Appendix: Signup Flow Audit (Pending)

From call notes #16, #18, #19 — a signup flow audit was flagged as needed. This covers:
- Review of current onboarding UX
- Drop-off analysis
- Intake form optimization
- Grant eligibility screening questions
- Post-signup counselor assignment timing

**Status:** Not yet started. Needs kickoff.

---

*Document owner: Forge ⚙️ | Last updated: 2026-03-29*
