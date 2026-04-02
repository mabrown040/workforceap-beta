# WorkforceAP Portal Design Audit
## Stitch vs Implementation Gap Analysis
**Generated:** 2026-04-01

---

## 🎯 Executive Summary

### Priority: Navigation System Overhaul
All portal roles need unified navigation that works across desktop/mobile with dark/light mode support.

### Coverage Status
| Role | Live Pages | Stitch Designs | Mobile Coverage | Dark Mode |
|------|-----------|----------------|-----------------|-----------|
| Member | 35 | 18 screens | Partial | Partial |
| Employer | 13 | 11 screens | Partial | Partial |
| Counselor | 7 | 5 screens | **MISSING** | Partial |
| Partner | 13 | 10 screens | Partial | Partial |
| Admin | 26 | **NONE** | **MISSING** | **MISSING** |

---

## 👤 MEMBER PORTAL

### Core Navigation Structure
```
Dashboard (Home)
├── AI Career Toolkit
│   ├── Resume Rewriter
│   ├── Interview Coach
│   ├── Interview Practice
│   ├── Job Match Scorer
│   ├── Gap Analyzer
│   ├── Cover Letter
│   ├── LinkedIn Headline
│   ├── LinkedIn About
│   ├── Salary Negotiation
│   ├── Application Tracker
│   └── History
├── Training & Learning
│   ├── Learning Hub
│   ├── Coursera
│   ├── Certifications
│   ├── Interest Profiler
│   └── Training
├── Career Tools
│   ├── Career Brief
│   ├── Job Applications
│   ├── Readiness Score
│   ├── Assessments
│   └── Skills Assessment
├── Support
│   ├── My Counselor
│   ├── Mentors
│   ├── Messages
│   ├── Resources
│   └── Help
├── Profile
│   ├── Profile
│   ├── Program
│   ├── Weekly Recap
│   └── Settings
```

### Feature Inventory

| Feature | Live Route | Stitch Desktop | Stitch Mobile | Dark Mode | Priority |
|---------|-----------|----------------|---------------|-----------|----------|
| **Dashboard** | `/dashboard/` | ✅ `member-dashboard` | ✅ `dashboard-mobile` | ✅ | P1 |
| **Messages** | `/dashboard/messages/` | ✅ `member-messages` | ✅ | ✅ | P1 |
| **Profile** | `/dashboard/profile/` | ✅ `member-profile` | ❌ | ✅ | P2 |
| **Program** | `/dashboard/program/` | ✅ `member-program` | ❌ | ✅ | P2 |
| **Readiness** | `/dashboard/readiness/` | ✅ `member-readiness` | ✅ `readiness-mobile` | ✅ | P1 |
| **Resume** | `/dashboard/resume/` | ✅ `member-resume` | ✅ `resume-mobile` | ✅ | P1 |
| **Certifications** | `/dashboard/certifications/` | ✅ `member-certifications` | ✅ `certifications-mobile` | ✅ | P1 |
| **Learning** | `/dashboard/learning/` | ✅ `member-learning` | ❌ | ⚠️ | P2 |
| **Career Brief** | `/dashboard/career-brief/` | ✅ `member-career-brief` | ❌ | ✅ | P2 |
| **Weekly Recap** | `/dashboard/weekly-recap/` | ✅ `member-weekly-recap` | ❌ | ✅ | P3 |
| **Settings** | `/dashboard/settings/` | ✅ `member-settings` | ✅ `settings-mobile` | ✅ | P2 |
| **Resources** | `/dashboard/resources/` | ✅ `member-resources` | ❌ | ✅ | P3 |
| **Job Applications** | `/dashboard/job-applications/` | ❌ **MISSING** | ❌ | ✅ | **STITCH NEEDED** |
| **Training** | `/dashboard/training/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |
| **Mentors** | `/dashboard/mentors/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |
| **Counselor** | `/dashboard/counselor/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |
| **Assessments** | `/dashboard/assessments/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |
| **Skills Assessment** | `/dashboard/skills-assessment/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |
| **Interest Profiler** | `/dashboard/learning/interest-profiler/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |
| **Guide** | `/dashboard/guide/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |

### AI Tools (All Live)
| Tool | Live | Stitch | Mobile | Dark |
|------|------|--------|--------|------|
| Resume Rewriter | ✅ | ✅ | ✅ | ✅ |
| Interview Coach | ✅ | ❌ | ❌ | ✅ |
| Interview Practice | ✅ | ✅ | ✅ | ✅ |
| Job Match Scorer | ✅ | ✅ | ✅ | ✅ |
| Gap Analyzer | ✅ | ✅ | ❌ | ✅ |
| Cover Letter | ✅ | ✅ | ❌ | ✅ |
| LinkedIn Headline | ✅ | ✅ | ❌ | ✅ |
| LinkedIn About | ✅ | ✅ | ❌ | ✅ |
| Salary Negotiation | ✅ | ✅ | ❌ | ✅ |
| Application Tracker | ✅ | ✅ | ❌ | ✅ |
| History | ✅ | ❌ | ❌ | ✅ |

---

## 🏢 EMPLOYER PORTAL

### Core Navigation Structure
```
Dashboard
├── Jobs
│   ├── Job List
│   ├── New Job
│   └── Import Jobs
├── Pipeline
├── Applications
├── Matches
├── Messages
├── Work Queue
├── Settings
└── Guide
```

### Feature Inventory

| Feature | Live Route | Stitch Desktop | Stitch Mobile | Dark Mode | Priority |
|---------|-----------|----------------|---------------|-----------|----------|
| **Dashboard** | `/employer/` | ✅ `employer-dashboard` | ❌ | ✅ | P1 |
| **Jobs** | `/employer/jobs/` | ✅ `employer-jobs` | ✅ `employer-jobs-mobile` | ✅ | P1 |
| **New Job** | `/employer/jobs/new/` | ✅ `employer-job-new` | ❌ | ✅ | P2 |
| **Job Import** | `/employer/jobs/import/` | ✅ `employer-job-import` | ❌ | ✅ | P2 |
| **Pipeline** | `/employer/pipeline/` | ✅ `employer-pipeline` | ✅ `pipeline-mobile` | ✅ | P1 |
| **Applications** | `/employer/applications/` | ✅ `employer-applications` | ❌ | ✅ | P2 |
| **Matches** | `/employer/matches/` | ✅ `employer-matches` | ✅ `matches-mobile` | ✅ | P1 |
| **Messages** | `/employer/messages/` | ✅ `employer-messages` | ❌ | ⚠️ | P1 |
| **Settings** | `/employer/settings/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |
| **Work Queue** | `/employer/work-queue/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |

---

## 👨‍🏫 COUNSELOR PORTAL

### Core Navigation Structure
```
Dashboard
├── My Students
│   ├── Student List
│   └── Student Detail
├── Messages
├── Resources
└── Guide
```

### Feature Inventory

| Feature | Live Route | Stitch Desktop | Stitch Mobile | Dark Mode | Priority |
|---------|-----------|----------------|---------------|-----------|----------|
| **Dashboard** | `/counselor/` | ✅ `counselor-students` | ❌ | ✅ | P1 |
| **Students** | `/counselor/students/` | ✅ `counselor-students` | ❌ | ✅ | P1 |
| **Student Detail** | `/counselor/students/[id]/` | ✅ `counselor-student-detail` | ❌ | ✅ | P1 |
| **Messages** | `/counselor/messages/` | ✅ `counselor-messages` | ❌ | ⚠️ | P1 |
| **Resources** | `/counselor/resources/` | ✅ `counselor-resources` | ❌ | ✅ | P2 |
| **Mobile Overview** | ❌ | ✅ `counselor-mobile` | ✅ | ✅ | **IMPLEMENT** |

**CRITICAL GAP:** No mobile designs for counselor portal aside from overview.

---

## 🤝 PARTNER PORTAL

### Core Navigation Structure
```
Dashboard
├── Referred Members
│   ├── Member List
│   └── Member Detail
├── Attention
├── Milestones
├── Outcomes
├── Messages
├── Resources
├── Exports
└── Settings
```

### Feature Inventory

| Feature | Live Route | Stitch Desktop | Stitch Mobile | Dark Mode | Priority |
|---------|-----------|----------------|---------------|-----------|----------|
| **Dashboard** | `/partner/` | ✅ `partner-dashboard` | ✅ `partner-mobile` | ✅ | P1 |
| **Members** | `/partner/members/` | ✅ `partner-members` | ❌ | ✅ | P1 |
| **Attention** | `/partner/attention/` | ✅ `partner-attention` | ❌ | ✅ | P2 |
| **Milestones** | `/partner/milestones/` | ✅ `partner-milestones` | ❌ | ✅ | P2 |
| **Outcomes** | `/partner/outcomes/` | ✅ `partner-outcomes` | ❌ | ✅ | P2 |
| **Messages** | `/partner/messages/` | ✅ `partner-messages` | ❌ | ⚠️ | P2 |
| **Resources** | `/partner/resources/` | ❌ **MISSING** | ❌ | ⚠️ | **STITCH NEEDED** |
| **Exports** | `/partner/exports/` | ✅ `partner-exports` | ❌ | ✅ | P3 |
| **Settings** | `/partner/settings/` | ✅ `partner-settings` | ❌ | ✅ | P3 |

---

## 🔧 ADMIN PORTAL

### Core Navigation Structure
```
Dashboard
├── Members
│   ├── Member List
│   ├── New Member
│   ├── Member Detail
│   └── Readiness Review
├── Counselors
├── Employers
├── Partners
├── Jobs
├── Programs
├── Subgroups
├── Pipeline
├── Assessments
├── AI Tools
├── Weekly Recap
├── Invites
├── Blog
├── Certifications
├── Mentors
├── Messages
├── Metrics
├── Diagnostics
└── Settings
```

### Feature Inventory

| Feature | Live Route | Stitch Desktop | Stitch Mobile | Dark Mode | Priority |
|---------|-----------|----------------|---------------|-----------|----------|
| **ALL PAGES** | 26 routes | ❌ **NONE** | ❌ **NONE** | ❌ **NONE** | **STITCH NEEDED** |

**CRITICAL GAP:** Zero Stitch designs for admin portal. Must create from scratch or use member/counselor patterns.

---

## 📱 Mobile Coverage Analysis

### Member Mobile - Partial
✅ Covered: Dashboard, Readiness, Resume, Certifications, Settings, AI Tools index
❌ Missing: Profile, Program, Learning, Career Brief, Weekly Recap, Resources, Job Applications

### Employer Mobile - Partial  
✅ Covered: Jobs, Pipeline, Matches
❌ Missing: Dashboard, New Job, Import, Applications, Messages, Settings, Work Queue

### Counselor Mobile - MINIMAL
✅ Covered: Overview only
❌ Missing: Students, Student Detail, Messages, Resources

### Partner Mobile - Partial
✅ Covered: Dashboard
❌ Missing: Members, Attention, Milestones, Outcomes, Messages, Resources, Exports, Settings

### Admin Mobile - NONE
❌ Missing: Everything

---

## 🎨 Dark Mode Status

### Member - PARTIAL
- ✅ Most pages have dark mode
- ⚠️ Learning, Assessments, Training need audit

### Employer - PARTIAL
- ✅ Core pages have dark mode
- ⚠️ Messages, Work Queue need audit

### Counselor - PARTIAL
- ✅ Desktop pages have dark mode
- ❌ Mobile completely missing

### Partner - PARTIAL
- ✅ Most pages have dark mode
- ⚠️ Messages needs audit

### Admin - NONE
- ❌ No dark mode implementation

---

## 🎯 STITCH DESIGN REQUESTS NEEDED

### High Priority (Navigation Blockers)
1. **Member Job Applications** - Kanban board design
2. **Member Training** - Course list/progress
3. **Member Mentors** - Mentor directory
4. **Member Counselor** - Counselor connection page
5. **Employer Work Queue** - Task management
6. **Employer Settings** - Company profile
7. **Counselor Mobile** - Full mobile suite

### Medium Priority (Feature Completion)
8. **Member Profile Mobile**
9. **Member Program Mobile**
10. **Member Learning Mobile**
11. **Member Career Brief Mobile**
12. **Member Resources Mobile**
13. **Member Assessments**
14. **Member Skills Assessment**
15. **Member Interest Profiler**
16. **Member Guide**
17. **Employer Dashboard Mobile**
18. **Employer New Job Mobile**
19. **Employer Import Mobile**
20. **Employer Applications Mobile**
21. **Employer Messages Mobile**
22. **Partner Resources**
23. **Partner Members Mobile**
24. **Partner Messages Mobile**

### Admin Portal (Complete Design Needed)
25. **Admin Dashboard** (Desktop + Mobile)
26. **Admin Members** (Desktop + Mobile)
27. **Admin Member Detail** (Desktop + Mobile)
28. **Admin Counselors** (Desktop + Mobile)
29. **Admin Employers** (Desktop + Mobile)
30. **Admin Partners** (Desktop + Mobile)
31. **Admin Jobs** (Desktop + Mobile)
32. **Admin Programs** (Desktop + Mobile)
33. **Admin Pipeline** (Desktop + Mobile)
34. **Admin Messages** (Desktop + Mobile)
35. **Admin Settings** (Desktop + Mobile)

---

## 🔀 Navigation Improvement Priorities

### Universal Nav Issues
1. **Consistent Bottom Nav** - All mobile portals need persistent bottom navigation
2. **Active State Styling** - Clear visual indication of current page
3. **Back Navigation** - Consistent back button behavior
4. **Search Integration** - Global search in top nav
5. **Notification Badge** - Unified notification system

### Role-Specific Nav Patterns
- **Member**: Dashboard → AI Tools → Training → Profile
- **Employer**: Dashboard → Jobs → Pipeline → Matches → Messages
- **Counselor**: Students → Messages → Resources (simple, focused)
- **Partner**: Dashboard → Members → Milestones → Outcomes
- **Admin**: Dashboard → Members → Pipeline → Jobs → Settings

---

## 📋 Implementation Order for Cursor

### Phase 1: Navigation Foundation
1. Create shared navigation components (desktop sidebar, mobile bottom nav)
2. Implement dark mode toggle in all portals
3. Add consistent page headers across all roles

### Phase 2: Mobile Completion
4. Member portal mobile gaps (Profile, Program, Learning, Career Brief)
5. Employer portal mobile gaps (Dashboard, New Job, Applications)
6. Counselor portal mobile suite (Students, Student Detail, Messages)

### Phase 3: Missing Pages
7. Member: Job Applications, Training, Mentors, Counselor, Assessments
8. Employer: Work Queue, Settings
9. Partner: Resources

### Phase 4: Admin Portal
10. Complete admin design system
11. Core admin pages (Dashboard, Members, Jobs, Pipeline)
12. Admin dark mode

---

## 📁 Files Reference

### Stitch Designs Location
```
~/.openclaw/workspace/projects/workforceap-beta/.stitch/
├── portal-member-*.html
├── portal-employer-*.html
├── portal-counselor-*.html
├── portal-partner-*.html
└── portal-ai-tool-*.html
```

### Live Code Location
```
app/(portal)/
├── dashboard/ (Member)
├── employer/
├── counselor/
├── partner/
└── admin/
```

---

**Next Steps:**
1. Generate Stitch prompts for missing designs
2. Create Cursor implementation plan
3. Build navigation component library
4. Implement mobile-first responsive layouts
