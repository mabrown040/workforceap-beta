# WorkforceAP — Site & Feature Documentation

> Generated: 2026-06-16  
> Repo: `mabrown040/workforceap-beta`  
> Stack: Next.js 14 (App Router), Prisma, Supabase, Stripe, Vercel

---

## Table of Contents

1. [Route Architecture](#route-architecture)
2. [User Portals](#user-portals)
3. [Member Dashboard](#member-dashboard)
4. [AI Tools Suite](#ai-tools-suite)
5. [Admin Panel](#admin-panel)
6. [Counselor Portal](#counselor-portal)
7. [Employer Portal](#employer-portal)
8. [Partner Portal](#partner-portal)
9. [Marketing Pages](#marketing-pages)
10. [API Surface](#api-surface)
11. [Background Jobs](#background-jobs)
12. [Data Model](#data-model)

---

## Route Architecture

### Route Groups

| Group | Path Prefix | Purpose |
|-------|-------------|---------|
| `(auth)` | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/setup-mfa`, `/verify-mfa` | Authentication flows |
| `(decision-journey)` | `/programs`, `/programs/[slug]`, `/find-your-path`, `/program-comparison`, `/salary-guide` | Public program discovery |
| `(portal)` | `/dashboard`, `/employer`, `/partner`, `/admin`, `/counselor` | Authenticated user portals |

### Public Marketing Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Homepage |
| `/programs` | `app/(decision-journey)/programs/page.tsx` | Program listing |
| `/programs/[slug]` | `app/(decision-journey)/programs/[slug]/page.tsx` | Program detail |
| `/programs/google-it-support` | `app/programs/google-it-support/page.tsx` | Google IT landing |
| `/career-quiz` | `app/career-quiz/page.tsx` | Career quiz |
| `/interest-profiler` | `app/interest-profiler/page.tsx` | Interest profiler |
| `/employers` | `app/employers/page.tsx` | Employer marketing |
| `/impact` | `app/impact/page.tsx` | Impact/social proof |
| `/outcomes` | `app/outcomes/page.tsx` | Outcomes data |
| `/how-it-works` | `app/how-it-works/page.tsx` | How it works |
| `/what-we-do` | `app/what-we-do/page.tsx` | What we do |
| `/faq` | `app/faq/page.tsx` | FAQ |
| `/contact` | `app/contact/page.tsx` | Contact |
| `/blog` | `app/blog/page.tsx` | Blog listing |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | Blog post |
| `/leadership` | `app/leadership/page.tsx` | Leadership page |
| `/mentor` | `app/mentor/page.tsx` | Mentor program |
| `/careers` | `app/careers/page.tsx` | Careers (jobs at WAP) |
| `/apply` | `app/apply/page.tsx` | Public application |
| `/wioa-qualification` | `app/wioa-qualification/page.tsx` | WIOA eligibility check |
| `/donate` | `app/donate/page.tsx` | Donation page |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Terms of service |
| `/accessibility` | `app/accessibility/page.tsx` | Accessibility statement |
| `/api-docs` | `app/api-docs/page.tsx` | API documentation |

### Apply Funnel

| Route | Purpose |
|-------|---------|
| `/apply` | Eligibility + application form |
| `/apply/create-account` | Account creation |
| `/apply/results` | Application results |
| `/apply/confirmation` | Confirmation page |
| `/apply/thank-you` | Thank you |
| `/apply/status` | Status lookup |
| `/q/[token]` | Public eligibility questionnaire |

---

## User Portals

### Member Portal (`/dashboard/*`)

The member portal is the primary user experience for enrolled members. It includes:

#### Dashboard Home (`/dashboard`)
- **DesktopDashboard**: Full desktop layout with sidebar
- **MobileDiscoverSection**: Mobile-first discover feed
- **MobileJourneyTimeline**: Visual journey progress
- **MobilePointsSection**: Gamification points
- **MobilePriorityActionCard**: Next recommended action
- **MobileProgramTrainingCard**: Active program training
- **MobileQuickActions**: Quick action buttons
- **MobileRecentActivity**: Recent activity feed
- **MobileStateANextStepCard**: State-specific next steps

#### AI Tools (`/dashboard/ai-tools/*`)

| Tool | Route | Purpose |
|------|-------|---------|
| Resume Analysis | `/dashboard/ai-tools/resume-analysis` | AI resume review |
| Resume Rewriter | `/dashboard/ai-tools/resume-rewriter` | AI resume rewrite |
| Resume Coach | `/dashboard/ai-tools/resume-coach` | Live resume coaching |
| Resume Studio | `/dashboard/ai-tools/resume-studio` | Resume builder |
| Cover Letter | `/dashboard/ai-tools/cover-letter` | Cover letter generator |
| Elevator Pitch | `/dashboard/ai-tools/elevator-pitch` | Pitch generator |
| LinkedIn Headline | `/dashboard/ai-tools/linkedin-headline` | Headline optimizer |
| LinkedIn About | `/dashboard/ai-tools/linkedin-about` | About section writer |
| Interview Coach | `/dashboard/ai-tools/interview-coach` | Interview prep |
| Interview Practice | `/dashboard/ai-tools/interview-practice` | Practice questions |
| Interview Prep | `/dashboard/ai-tools/interview-prep` | Prep materials |
| Voice Interview | `/dashboard/ai-tools/voice-interview` | Voice practice |
| Job Match Scorer | `/dashboard/ai-tools/job-match-scorer` | Job fit scoring |
| Gap Analyzer | `/dashboard/ai-tools/gap-analyzer` | Skill gap analysis |
| Skill Mapper | `/dashboard/ai-tools/skill-mapper` | Skill mapping |
| Skill Checkpoints | `/dashboard/ai-tools/skill-checkpoints` | Skill verification |
| Salary Negotiation | `/dashboard/ai-tools/salary-negotiation` | Negotiation prep |
| Career Business Coach | `/dashboard/ai-tools/career-business-coach` | Business coaching |
| Readiness Coach | `/dashboard/ai-tools/readiness-coach` | Readiness assessment |
| Application Tracker | `/dashboard/ai-tools/application-tracker` | Track applications |
| Benefits Cliff | `/dashboard/ai-tools/benefits-cliff` | Benefits analysis |
| Training Bridge | `/dashboard/ai-tools/training-bridge` | Training gaps |
| History | `/dashboard/ai-tools/history` | AI tool history |

#### Learning (`/dashboard/learning/*`)

| Route | Purpose |
|-------|---------|
| `/dashboard/learning` | Learning hub |
| `/dashboard/learning/interest-profiler` | Interest assessment |
| `/dashboard/learning/find-your-career` | Career finder |
| `/dashboard/learning/wioa-qualification` | WIOA qualification |
| `/dashboard/coursera` | Coursera integration |
| `/dashboard/training` | Training progress |
| `/dashboard/assessment` | Skills assessment |
| `/dashboard/assessments` | Assessment list |
| `/dashboard/skills-assessment` | Skill assessment |
| `/dashboard/certifications` | Certifications |
| `/dashboard/guide` | Program guide |
| `/dashboard/resources` | Resources library |
| `/dashboard/career-library` | Career library |
| `/dashboard/career-brief/[slug]` | Career briefs |

#### Jobs (`/dashboard/jobs/*`)

| Route | Purpose |
|-------|---------|
| `/dashboard/jobs` | Job board |
| `/dashboard/jobs/[id]` | Job detail |
| `/dashboard/job-applications` | My applications |

#### Career Support (`/dashboard/*`)

| Route | Purpose |
|-------|---------|
| `/dashboard/counselor` | My counselor |
| `/dashboard/mentor` | My mentor |
| `/dashboard/mentors` | Mentor directory |
| `/dashboard/messages` | Messages |
| `/dashboard/weekly-recap` | Weekly recap |
| `/dashboard/missions` | Skill missions |
| `/dashboard/survey` | Surveys |
| `/dashboard/readiness` | Readiness dashboard |
| `/dashboard/resume` | Resume management |
| `/dashboard/profile` | Profile |
| `/dashboard/settings` | Settings |
| `/dashboard/account` | Account |
| `/dashboard/points` | Points/gamification |
| `/dashboard/program` | Program details |
| `/dashboard/program/change` | Change program |
| `/dashboard/program/start` | Start program |
| `/dashboard/program/employer-screening` | Employer screening |
| `/dashboard/eligibility` | Eligibility check |
| `/dashboard/help` | Help center |

---

## Admin Panel (`/admin/*`)

### Dashboard & Analytics

| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard |
| `/admin/dashboard` | Overview dashboard |
| `/admin/analytics` | Analytics hub |
| `/admin/analytics/ai-efficacy` | AI tool efficacy |
| `/admin/metrics` | Key metrics |
| `/admin/health` | System health |
| `/admin/diagnostics` | Diagnostics |
| `/admin/growth` | Growth metrics |

### Member Management

| Route | Purpose |
|-------|---------|
| `/admin/members` | Member list |
| `/admin/members/[id]` | Member detail |
| `/admin/members/[id]/lifecycle` | Member lifecycle |
| `/admin/members/[id]/readiness` | Readiness view |
| `/admin/members/[id]/stakeholder` | Stakeholder view |
| `/admin/members/new` | Add member |
| `/admin/members/duplicates` | Duplicate detection |
| `/admin/members/merge` | Merge members |
| `/admin/members/training` | Training progress |
| `/admin/members/job-ready` | Job-ready members |
| `/admin/members/interview-ready` | Interview-ready |
| `/admin/members/at-risk` | At-risk members |

### Program & Training

| Route | Purpose |
|-------|---------|
| `/admin/programs` | Program management |
| `/admin/coursera` | Coursera admin |
| `/admin/coursera/csv-import` | CSV import |
| `/admin/coursera/health` | Health check |
| `/admin/coursera/learners/[userId]` | Learner detail |
| `/admin/training-progress` | Training progress |
| `/admin/assessments` | Assessments |
| `/admin/certifications` | Certifications |
| `/admin/program-change-requests` | Change requests |
| `/admin/career-mappings` | Career mappings |

### Employer Management

| Route | Purpose |
|-------|---------|
| `/admin/employers` | Employer list |
| `/admin/employers/[id]` | Employer detail |
| `/admin/employer-screening-packs` | Screening packs |
| `/admin/jobs` | Job management |
| `/admin/jobs/[id]` | Job detail |
| `/admin/placements` | Placements |
| `/admin/placements/new` | New placement |
| `/admin/pipeline` | Pipeline |
| `/admin/placement-surveys` | Placement surveys |

### Partner Management

| Route | Purpose |
|-------|---------|
| `/admin/partners` | Partner list |
| `/admin/partners/[id]` | Partner detail |
| `/admin/partners/new` | New partner |

### Outcomes & Reporting

| Route | Purpose |
|-------|---------|
| `/admin/outcomes` | Outcomes dashboard |
| `/admin/outcomes/methodology` | Methodology |
| `/admin/reports/quarterly-outcomes` | Quarterly reports |
| `/admin/reports/wioa` | WIOA reports |
| `/admin/reports/wioa/generate` | Generate WIOA report |
| `/admin/board` | Board view |
| `/admin/board/print` | Print board |
| `/admin/weekly-recap` | Weekly recaps |

### Communications

| Route | Purpose |
|-------|---------|
| `/admin/messages` | Message admin |
| `/admin/email-templates` | Email templates |
| `/admin/email-crons` | Email cron jobs |
| `/admin/feedback` | Feedback |
| `/admin/testimonials` | Testimonials |
| `/admin/blog` | Blog management |
| `/admin/blog/[id]/edit` | Edit blog post |
| `/admin/blog/new` | New blog post |
| `/admin/blog/ai` | AI blog tools |
| `/admin/blog/preview/[slug]` | Blog preview |

### System Administration

| Route | Purpose |
|-------|---------|
| `/admin/users` | User management |
| `/admin/users/deleted` | Deleted users |
| `/admin/invites` | Invitations |
| `/admin/invites/new` | New invite |
| `/admin/settings` | Settings |
| `/admin/feature-flags` | Feature flags |
| `/admin/crons` | Cron jobs |
| `/admin/exports` | Data exports |
| `/admin/audit-logs` | Audit logs |
| `/admin/webhook-events` | Webhook events |
| `/admin/data-retention` | Data retention |
| `/admin/agent-inbox` | Agent inbox |
| `/admin/counselors` | Counselor management |
| `/admin/mentors` | Mentor management |
| `/admin/subgroups` | Subgroup management |
| `/admin/subgroups/new` | New subgroup |
| `/admin/subgroups/[id]` | Subgroup detail |
| `/admin/subgroups/[id]/edit` | Edit subgroup |
| `/admin/sessions` | Session management |
| `/admin/sessions/walk-in` | Walk-in sessions |
| `/admin/sessions/[memberId]/run` | Run session |

---

## Counselor Portal (`/counselor/*`)

| Route | Purpose |
|-------|---------|
| `/counselor` | Counselor dashboard |
| `/counselor/students` | Student list |
| `/counselor/students/[memberId]` | Student detail |
| `/counselor/inbox` | Inbox |
| `/counselor/messages` | Messages |
| `/counselor/placements` | Placements |
| `/counselor/queue` | Student queue |
| `/counselor/triage` | Triage |
| `/counselor/inactive-members` | Inactive members |
| `/counselor/resources` | Resources |
| `/counselor/guide` | Guide |
| `/counselor/sessions` | Sessions |
| `/counselor/sessions/walk-in` | Walk-in |
| `/counselor/sessions/[memberId]/run` | Run session |
| `/counselor/notifications` | Notifications |

---

## Employer Portal (`/employer/*`)

| Route | Purpose |
|-------|---------|
| `/employer` | Employer dashboard |
| `/employer/jobs` | Job management |
| `/employer/jobs/new` | Post new job |
| `/employer/jobs/post` | Post job (alt) |
| `/employer/jobs/[id]` | Job detail |
| `/employer/jobs/[id]/edit` | Edit job |
| `/employer/jobs/[id]/applicants` | Applicants |
| `/employer/jobs/import` | Import jobs |
| `/employer/candidates` | Candidate pool |
| `/employer/candidates/[studentId]` | Candidate detail |
| `/employer/applications` | Applications |
| `/employer/applications/[id]` | Application detail |
| `/employer/pipeline` | Hiring pipeline |
| `/employer/matches` | Candidate matches |
| `/employer/messages` | Messages |
| `/employer/settings` | Settings |
| `/employer/billing` | Billing/Stripe |
| `/employer/guide` | Guide |
| `/employer/work-queue` | Work queue |

---

## Partner Portal (`/partner/*`)

| Route | Purpose |
|-------|---------|
| `/partner` | Partner dashboard |
| `/partner/members` | Referred members |
| `/partner/members/[id]` | Member detail |
| `/partner/referred-members` | Referred members (alt) |
| `/partner/referred-members/[memberId]` | Member detail |
| `/partner/milestones` | Milestones |
| `/partner/outcomes` | Outcomes |
| `/partner/exports` | Data exports |
| `/partner/attention` | Needs attention |
| `/partner/resources` | Resources |
| `/partner/messages` | Messages |
| `/partner/settings` | Settings |
| `/partner/guide` | Guide |

---

## API Surface

### Public APIs

| Route | Purpose |
|-------|---------|
| `/api/public/career-quiz/score` | Career quiz scoring |
| `/api/public/interest-profiler/questions` | Interest profiler questions |
| `/api/public/interest-profiler/score` | Interest profiler scoring |
| `/api/public/wioa-qualification` | WIOA qualification check |
| `/api/recommend` | Program recommendations |
| `/api/careers/occupation/[onetCode]` | ONET occupation data |
| `/api/careers/program-matches/[programSlug]` | Program matches |
| `/api/contact` | Contact form |
| `/api/leads/careers` | Career lead capture |
| `/api/leads/employer` | Employer lead capture |
| `/api/waitlist` | Waitlist signup |
| `/api/health` | Health check |
| `/api/health/slo` | SLO metrics |
| `/api/feature-flags` | Feature flags |
| `/api/events` | Event tracking |
| `/api/gdpr/*` | GDPR endpoints |
| `/api/og/*` | Open Graph image generation |
| `/api/skill-missions/*` | Skill mission evaluation |
| `/api/webhooks/*` | Webhook handlers |
| `/api/xapi/*` | xAPI (Tin Can) endpoints |
| `/api/cron/*` | Cron job endpoints |
| `/api/stripe/webhook` | Stripe webhooks |
| `/api/placement-survey` | Placement surveys |
| `/api/referral-sources` | Referral tracking |
| `/api/apply/*` | Application API |
| `/api/invite/*` | Invitation handling |
| `/api/onboarding/*` | Onboarding |
| `/api/auth/*` | Authentication |
| `/api/member/*` | Member API |
| `/api/counselor/*` | Counselor API |
| `/api/employer/*` | Employer API |
| `/api/partner/*` | Partner API |
| `/api/admin/*` | Admin API |
| `/api/ai/*` | AI tool API |
| `/api/mentor/*` | Mentor API |
| `/api/portal/*` | Portal API |
| `/api/subgroup/*` | Subgroup API |
| `/api/org/*` | Organization API |
| `/api/q/*` | Public questionnaire |
| `/api/r/*` | Referral codes |
| `/api/api-docs` | API documentation |

---

## Background Jobs (Cron)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `applicant-followup` | Daily | Follow up with applicants |
| `at-risk-alerts` | Daily | At-risk member alerts |
| `at-risk-check` | Daily | Check at-risk members |
| `course-accountability` | Daily | Course progress nudges |
| `coursera-auto-heal` | Hourly | Fix Coursera data issues |
| `coursera-b4b-sync` | Hourly | Sync B4B data |
| `coursera-sync` | Hourly | Coursera progress sync |
| `coursera-training-sync` | Hourly | Training sync |
| `data-cleanup` | Daily | Data cleanup |
| `deploy-health` | Hourly | Deployment health check |
| `inactive-nudge` | Daily | Nudge inactive members |
| `inactivity-nudge` | Daily | Inactivity reminders |
| `interview-reminders` | Daily | Interview reminders |
| `milestone-cascade-draft` | Daily | Draft milestone emails |
| `milestone-cascade-expire` | Daily | Expire old milestones |
| `milestone-celebration` | Daily | Celebrate milestones |
| `partner-outcome-digest` | Weekly | Partner outcome reports |
| `placement-survey` | Daily | Placement surveys |
| `smoke-test` | Hourly | Smoke tests |
| `stale-training-check` | Daily | Stale training alerts |
| `verification` | Daily | Verification checks |
| `weekly-recap-email` | Weekly | Weekly recap emails |
| `weekly-recap` | Weekly | Weekly recaps |
| `wioa-report` | Monthly | WIOA reporting |

---

## Data Model (Prisma)

### Core Entities

| Entity | Description |
|--------|-------------|
| `Member` | Program participant |
| `User` | Platform user (admin, counselor, etc.) |
| `Program` | Training program |
| `Enrollment` | Member program enrollment |
| `Course` | Individual course |
| `CourseProgress` | Member course progress |
| `Certification` | Earned certification |
| `Job` | Job posting |
| `JobApplication` | Member job application |
| `Placement` | Job placement outcome |
| `Employer` | Hiring employer |
| `Partner` | Referral partner |
| `Counselor` | Career counselor |
| `Mentor` | Career mentor |
| `Message` | Platform messaging |
| `Notification` | User notifications |
| `PointTransaction` | Gamification points |
| `Assessment` | Skills assessment |
| `Resume` | Member resume |
| `Invoice` | Billing invoice |
| `Subscription` | Stripe subscription |
| `WebhookEvent` | Webhook event log |
| `AuditLog` | Audit trail |
| `FeatureFlag` | Feature flag |
| `EmailTemplate` | Email template |
| `EmailCron` | Scheduled email |
| `BlogPost` | Blog content |
| `Testimonial` | Testimonial |
| `Feedback` | User feedback |
| `Subgroup` | Member subgroup |
| `Organization` | Multi-tenant org |
| `xAPIStatement` | Learning record |
| `CourseraBinding` | Coursera mapping |
| `CareerMapping` | ONET career mapping |
| `Invite` | Invitation |
| `Referral` | Referral tracking |
| `Milestone` | Achievement milestone |
| `Mission` | Skill mission |
| `Session` | Counseling session |
| `VoiceSession` | Voice coaching session |
| `ScreeningPack` | Employer screening |
| `EligibilityForm` | Eligibility data |
| `WIOAScreening` | WIOA screening |
| `PlacementSurvey` | Placement survey |
| `WeeklyRecap` | Weekly recap data |
| `DataRetentionPolicy` | Data retention |
| `GDPRConsent` | GDPR consent |
| `GDPRRequest` | GDPR request |

---

## Key Features

### AI-Powered Career Tools
- Resume analysis, rewriting, and coaching
- Cover letter and elevator pitch generation
- LinkedIn profile optimization
- Interview preparation and voice practice
- Job match scoring and gap analysis
- Skill mapping and checkpoint verification
- Salary negotiation preparation
- Career business coaching

### Gamification
- Points system for engagement
- Weekly recaps with progress
- Skill missions and checkpoints
- Achievement milestones
- Referral rewards

### Multi-Tenant Architecture
- Organization-based data isolation
- Role-based access control
- Feature flags for gradual rollout
- Subgroups for cohort management

### Integrations
- **Coursera**: Course progress, enrollments, B4B sync
- **Stripe**: Payments, subscriptions, billing
- **Supabase**: Database, auth, realtime
- **xAPI/Tin Can**: Learning record store
- **ONET**: Career data and mappings
- **Vercel**: Hosting, edge functions, OG images
- **OpenAI**: AI tool backend

### Compliance & Reporting
- WIOA reporting and qualification
- xAPI learning records
- GDPR consent and data export/deletion
- Audit logs for all actions
- Outcomes tracking and dashboards
- Quarterly reports

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma/Supabase connection |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client key |
| `OPENAI_API_KEY` | AI tools |
| `COURSERA_B4B_API_KEY` | Coursera B4B |
| `VERCEL_URL` | Deployment URL |
| `CRON_SECRET` | Cron job auth |
| `WEBHOOK_SECRET` | Webhook verification |

---

*Document version: 1.0*  
*Last updated: 2026-06-16*