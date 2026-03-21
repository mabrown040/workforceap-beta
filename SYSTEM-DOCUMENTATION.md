# WorkforceAP System Documentation
**Version:** 2026-03-20  
**Purpose:** Complete guide to the WorkforceAP platform for stakeholders, parents, partners, and staff

---

## Table of Contents
1. [What is WorkforceAP?](#what-is-workforceap)
2. [How the System Works](#how-the-system-works)
3. [User Journeys](#user-journeys)
4. [Technology Stack](#technology-stack)
5. [Key Features Explained](#key-features-explained)
6. [For Parents](#for-parents)
7. [For Partners](#for-partners)
8. [For Employers](#for-employers)
9. [For Staff](#for-staff)

---

## What is WorkforceAP?

Workforce Advancement Project (WorkforceAP) is a **free career training platform** that helps Austin-area residents enter or advance in high-demand careers through industry-recognized certifications.

### The Core Promise
- **No cost** to accepted members
- **No loans** or income-sharing agreements
- **Job-ready skills** in 3-5 months
- **Job placement support** until hired

### Target Audience
- Adults 18+ in Austin metro area
- Income-eligible individuals (under ~$60K household)
- Career changers with no prior tech experience
- Veterans and underserved communities

---

## How the System Works

### The 11-Step Member Journey

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: GET STARTED                                           │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ 1.Apply │→│ 2.Overview│→│ 3.Interview│                     │
│  │  5 min  │  │  30 min  │  │  30 min   │                      │
│  └─────────┘  └──────────┘  └──────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: BUILD YOUR FUTURE                                     │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐ ┌──────────┐      │
│  │4.Membership│→│5.Assessment│→│6.Workforce    │→│7.Resources│     │
│  │   Free   │  │  Skills  │  │   Readiness   │  │  Laptop  │     │
│  └──────────┘ └──────────┘ └───────────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: LAUNCH YOUR CAREER                                    │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ ┌──────────┐    │
│  │8.Training│→│9.Certify │→│10.Job Placement │→│11.Better │    │
│  │3-5 months│  │  Exams   │  │   Assistance   │  │  Life    │    │
│  └──────────┘ └──────────┘ └─────────────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Workflows

#### Application Flow
1. Visitor browses programs or takes quiz
2. Clicks "Apply Now" on chosen program
3. Fills out 5-minute application form
4. System emails confirmation + counselor assignment
5. Counselor contacts applicant within 48 hours
6. Interview scheduled
7. Acceptance decision within 2 weeks
8. Accepted members get portal login

#### Dashboard Flow (Members)
1. Member logs in at `/login`
2. Sees personalized dashboard with program progress
3. Accesses training materials through "Training" tab
4. Uses AI tools for career prep (resume, interviews)
5. Tracks certifications earned
6. Receives job placement assistance

#### Partner Referral Flow
1. Partner sends candidate to workforceap.org
2. Candidate selects partner in "How did you hear about us?"
3. System creates PartnerReferral record
4. Partner gets milestone notifications (enrollment, completion, placement)
5. Partner views aggregate stats in portal

#### Admin Management Flow
1. Admin logs in, toggles to "Admin View"
2. Manages members (add, edit, assign to partners)
3. Manages partners (create, invite users)
4. Publishes blog posts
5. Views analytics (cohort stats, weekly recap data)

---

## User Journeys

### Journey A: First-Time Applicant (Student)

**Persona:** Maria, 28, works retail, wants to break into tech

1. **Discovery** — Sees LinkedIn post about free IT training
2. **Exploration** — Visits workforceap.org, clicks "Find Your Path"
3. **Matching** — Takes 2-minute quiz, recommended Google Cybersecurity
4. **Application** — Clicks "Apply Now", fills form (5 min)
5. **Confirmation** — Gets email: "We'll contact you within 48 hours"
6. **Counselor Call** — Discusses program fit, answers questions
7. **Interview** — 30-minute video call, confirms motivation
8. **Acceptance** — Email with portal login credentials
9. **Onboarding** — Completes skills assessment, gets laptop
10. **Training** — 3-5 months of coursework, 10 hrs/week
11. **Certification** — Passes CompTIA Security+ exam
12. **Job Search** — Resume help, interview prep, employer intros
13. **Placement** — Hired as Security Analyst at $75K

### Journey B: Referring Partner

**Persona:** James, case manager at nonprofit helping job seekers

1. **Discovery** — Hears about WorkforceAP at workforce development meeting
2. **Exploration** — Visits `/partners` page, learns benefits
3. **Contact** — Emails info@workforceap.org to discuss partnership
4. **Setup** — Gets partner portal login
5. **Referral** — Sends client to apply, selects "James's Organization"
6. **Tracking** — Gets email when client enrolls
7. **Updates** — Receives milestone notifications (course completions, certification, placement)
8. **Reporting** — Views aggregate stats: 12 referrals, 8 enrolled, 5 placed

### Journey C: Hiring Employer

**Persona:** Sarah, HR manager at tech company needing entry-level talent

1. **Discovery** — Sees WorkforceAP graduate's LinkedIn post
2. **Exploration** — Visits `/partners` page, sees "Hire Graduates" section
3. **Contact** — Emails michael.brown@techvera.com
4. **Discussion** — Reviews hiring needs, gets graduate profiles
5. **Interviews** — Meets 3 pre-qualified candidates
6. **Hire** — Offers position to WorkforceAP graduate
7. **Feedback** — Reports successful placement to WorkforceAP

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + custom CSS variables
- **UI Components:** Custom components
- **Authentication:** Custom auth context
- **Deployment:** Vercel

### Backend/Data
- **Database:** (See Prisma schema for details)
- **API:** Next.js API routes
- **AI Tools:** Custom AI integrations (resume, interview prep)

### Key Pages
| Route | Purpose |
|-------|---------|
| `/` | Homepage with program highlights |
| `/programs` | All 19 programs with filtering |
| `/program-comparison` | Side-by-side comparison |
| `/how-it-works` | 11-step process explanation |
| `/apply` | Application form |
| `/dashboard` | Member portal (requires login) |
| `/admin/*` | Admin panel (requires admin role) |
| `/partners` | Public partner information |
| `/faq` | Frequently asked questions |
| `/blog` | Content marketing |

---

## Key Features Explained

### Member Dashboard
After login, members access 10 sections:

1. **Home** — Welcome, next actions, enrollment status
2. **My Program** — Progress percentage, courses completed
3. **Training** — Active courses, materials, progress
4. **AI Tools** — Career prep assistants:
   - Job Match Scorer
   - Resume Rewriter
   - Interview Practice
   - Cover Letter Builder
   - LinkedIn Optimizer
   - Salary Negotiation Script
   - Application Tracker
5. **Resources** — Loaner laptop info, templates, guides
6. **Career Brief** — Weekly career guidance articles
7. **Learning** — Skills library, supplementary courses
8. **Weekly Recap** — Activity summary, goals tracking
9. **Career Readiness** — Readiness score, milestones
10. **My Profile** — Personal info, password management

### Partner Portal
Partners get scoped dashboard access:

- **Stats Overview** — Total referrals, active, completed, placed
- **Members Table** — Referral progress (no contact details)
- **Recent Activity** — Last 10 milestone events
- **Notifications** — Email alerts for enrollments, completions, placements

### Admin Panel
Staff can manage:

- **Members** — View all, add new, edit, assign to partners
- **Partners** — Create partners, invite users, view analytics
- **Programs** — Enrollment data, curriculum management
- **Blog** — Create, edit, publish posts
- **Analytics** — Cohort stats, tool usage, certifications

---

## For Parents

### What Your Family Member Gets

**Before Starting:**
- Free skills assessment
- Dedicated career counselor
- Clear timeline and expectations

**During Training:**
- 10 hours/week commitment (flexible around work)
- Loaner laptop if needed (awarded upon completion)
- Regular check-ins with counselor
- 24/7 access to training materials

**After Graduation:**
- Industry-recognized certification
- Job placement assistance
- Resume and interview support
- Direct employer connections
- Alumni network access

### Expected Outcomes
- **Timeline:** 3-5 months of training
- **Certification:** Google, IBM, Microsoft, AWS, or CompTIA
- **Starting Salary:** $38K-$145K depending on program
- **Support:** Continues until job placement

### Safety & Support
- Background-checked counselors
- Mental health resource referrals
- Childcare and transportation assistance (when available)
- No debt or loans — ever

---

## For Partners

### Who Can Partner
- Workforce boards (Workforce Solutions, TWC)
- Community organizations
- Nonprofits
- Government agencies
- Faith-based organizations
- Employers

### Partner Benefits
1. **Dedicated Portal** — Track referrals in real-time
2. **Milestone Notifications** — Emails when referrals:
   - Enroll in programs
   - Complete courses
   - Earn certifications
   - Get job placements
3. **Analytics Dashboard** — View aggregate stats
4. **Priority Support** — Direct contact with WorkforceAP staff

### How to Refer
1. Send candidate to workforceap.org
2. Have them select your organization in "How did you hear about us?"
3. They complete application
4. You receive confirmation and milestone updates

### Getting Portal Access
Contact Michael Brown: michael.brown@techvera.com

---

## For Employers

### Why Hire Our Graduates
- **Pre-screened:** Skills assessments completed
- **Certified:** Industry credentials from top providers
- **Job-ready:** Soft skills + technical training
- **Supported:** We assist with onboarding

### How to Connect
Email: michael.brown@techvera.com  
Phone: (512) 777-1808

### Hiring Process
1. Contact us with job openings
2. Review pre-qualified candidate profiles
3. Interview selected candidates
4. Hire and report placement

---

## For Staff

### Admin Access
1. Log in at workforceap.org/login
2. Toggle "Admin View" in header
3. Access admin sections from sidebar

### Key Workflows

**Adding a Member:**
1. Admin → Members → Add Member
2. Fill out member information
3. Assign to partner (optional)
4. Complete wizard

**Creating a Partner:**
1. Admin → Partners → Add Partner
2. Enter organization details
3. Invite partner users
4. Partner gets portal access

**Publishing Blog Posts:**
1. Admin → Blog → New Post
2. Write content, add featured image
3. Set category and publish date
4. Publish

---

## Contact Information

**General Inquiries:**  
Email: info@workforceap.org  
Phone: (512) 777-1808

**Executive Director:**  
Michael Brown  
michael.brown@techvera.com

**Website:**  
https://www.workforceap.org

**LinkedIn:**  
https://linkedin.com/company/workforceap

---

*Last Updated: March 20, 2026*
