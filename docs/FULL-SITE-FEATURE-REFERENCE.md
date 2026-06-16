# WorkforceAP Full Site & Feature Reference

**Last updated:** 2026-06-16  
**Source of truth:** current `app/`, `app/api/`, `components/`, `lib/`, `prisma/schema.prisma`, and `package.json` on `origin/master` after PRs #1723, #1728, #1730, #1731, #1734.  
**Current footprint:** 262 App Router pages, 436 API routes, 95 Prisma models.

This is the operator map for the whole WorkforceAP product. Use it when you need to know what exists, what each surface does, what audience it serves, and where to look before changing code.

---

## 1. Product in one page

WorkforceAP is a nonprofit workforce platform with four connected products:

1. **Public conversion site**  
   Explains the mission, programs, outcomes, FAQ, employers, partners, donations, careers, and application flow.

2. **Member portal**  
   Helps applicants and enrolled members pick a pathway, train through Coursera-backed programs, track progress, build resumes, practice interviews, collect certifications, manage applications, and get advisor support.

3. **Employer and partner portals**  
   Employers manage hiring intent, jobs, matches, candidate pipeline, LOIs, subscription/payment flow, and outcomes. Partners refer members, track milestones, handle exports, see impact, and manage referral/member attention queues.

4. **Admin/counselor operating system**  
   Staff manage members, programs, placements, WIOA outcomes, Coursera sync, counselor queues, jobs, employers, partners, messages, cron health, audit logs, and the Dad Command Center.

The site is not just marketing. It is a multi-sided operating system around training, placement, proof of outcomes, and partner/employer demand.

---

## 2. Top-level architecture

| Layer | Files / directories | What it owns |
|---|---|---|
| App shell | `app/layout.tsx`, `middleware.ts`, `components/MainNav.tsx`, `components/MobileBottomNav.tsx` | Global layout, locale handling, route protection, navigation, public chrome. |
| Public pages | `app/page.tsx`, `app/programs/**`, `app/apply/**`, `app/employers/**`, `app/partners/**`, `app/blog/**` | Marketing, SEO, trust, conversion, application intake, employer/partner acquisition. |
| Member portal | `app/(portal)/dashboard/**`, `components/portal/**`, `app/api/member/**` | Member dashboard, learning, jobs, AI tools, readiness, messages, account/privacy. |
| Admin portal | `app/admin/**`, `components/admin/**`, `app/api/admin/**` | Staff operations, reports, data quality, member/employer/partner management, command center. |
| Counselor portal | `app/(portal)/counselor/**`, `app/api/counselor/**` | Caseload, sessions, at-risk queues, reminders, placements, member notes, triage. |
| Employer portal | `app/(portal)/employer/**`, `app/api/employer/**` | Jobs, matches, applicants, billing/subscriptions, messages, outcomes. |
| Partner portal | `app/(portal)/partner/**`, `app/api/partner/**` | Referrals, referred members, payouts, milestones, exports, attention queue, settings. |
| AI tools | `app/(portal)/dashboard/ai-tools/**`, `app/api/ai/**`, `lib/ai/**` | Resume, interview, LinkedIn, cover letter, salary, job match, gap analysis, coaching. |
| Learning integrations | `lib/coursera/**`, `app/api/xapi/**`, `app/api/webhooks/coursera/route.ts`, `app/api/cron/coursera-*` | Coursera/xAPI identity, progress, sync, auto-heal, badge/progress ingestion. |
| Data model | `prisma/schema.prisma`, `prisma/migrations/**` | 95-model relational schema for users, orgs, programs, jobs, placements, messages, events, AI, and integrations. |
| Documentation | `README.md`, `DOCS-INDEX.md`, `docs/**`, `AGENTS.md` | Developer onboarding, operational runbooks, security, API, outcomes methodology, product docs. |

---

## 3. Audience map

| Audience | Entry points | Primary jobs |
|---|---|---|
| Prospective member | `/`, `/programs`, `/find-your-path`, `/career-quiz`, `/salary-guide`, `/apply` | Understand fit, pick a pathway, trust the offer, apply, create an account. |
| Active member | `/dashboard`, `/dashboard/training`, `/dashboard/program`, `/dashboard/jobs`, `/dashboard/ai-tools`, `/dashboard/messages` | Train, stay on track, prepare for job search, get advisor help, track applications. |
| Advisor / counselor | `/counselor`, `/counselor/students`, `/counselor/queue`, `/counselor/at-risk`, `/counselor/sessions` | Prioritize caseload, run sessions, nudge inactive members, log placements, manage risk. |
| Employer | `/employers`, `/employer/loi`, `/employer`, `/employer/jobs`, `/employer/matches`, `/employer/billing` | Understand pipeline offer, sign LOI/subscribe, post jobs, review matches, manage applicants. |
| Partner | `/partners`, `/partner-signup`, `/partner`, `/partner/referred-members`, `/partner/outcomes` | Refer members, track progress/outcomes, manage attention queue and reporting. |
| Admin/operator | `/admin`, `/admin/command-center`, `/admin/members`, `/admin/outcomes`, `/admin/coursera`, `/admin/employers`, `/admin/partners`, `/admin/crons` | Run the whole system, prove outcomes, manage users, debug integrations, export reports. |
| Board/funder | `/outcomes`, `/impact`, `/admin/outcomes`, `/admin/reports/quarterly-outcomes`, docs/OUTCOMES-METHODOLOGY.md | See evidence, methodology, placement value, retention and data quality. |

---

## 4. Public site surfaces

### Core marketing

| Route | Purpose | Notes |
|---|---|---|
| `/` | Homepage | Main public entry point. Redirect/locale behavior is handled by app shell and i18n. |
| `/what-we-do` | Mission and support model | Explains WorkforceAP support model and who it serves. |
| `/how-it-works` | Process explanation | Helps prospects understand intake, training, support, and job readiness. |
| `/faq` | FAQ | Data comes from `lib/content/faqData.ts`; also feeds server-rendered FAQ JSON-LD. |
| `/contact` | Contact form | Uses `app/api/contact/route.ts`. |
| `/leadership` and `/leadership/[slug]` | Leadership profiles | Public trust surface. |
| `/accessibility`, `/privacy`, `/terms` | Compliance/trust pages | Public trust and legal pages. |
| `/donate` | Donation CTA | Fundraising surface. |
| `/impact`, `/outcomes` | Public impact/outcomes pages | Public-facing proof surfaces, distinct from admin outcomes dashboard. |
| `/api-docs` | API docs page | Public/internal doc surface for API reference. |

### Programs and decision journey

| Route | Purpose | Notes |
|---|---|---|
| `/programs` | Program catalog / decision page | Quick-start cards, subgroup browsing, localized program copy. Card 3 now points to Project Management as the business-friendly starter pick. |
| `/programs/[slug]` | Program detail | Program detail pages include EducationalOccupationalProgram JSON-LD via `components/JsonLdEducationalOccupationalProgram.tsx`. |
| `/programs/google-it-support` | Focused Google IT Support landing page | Single-program landing page with live metric cards when sample thresholds are met. Uses `lib/marketing/googleItSupportLanding.ts`. |
| `/find-your-path` | Guided path finder | Decision-journey quiz/selector for prospects. |
| `/career-quiz` | Public career quiz | Scores through `app/api/public/career-quiz/score/route.ts`. |
| `/interest-profiler` | Public interest profiler | Public RIASEC-style interest profiling flow. |
| `/salary-guide` | Salary and role expectations | SEO and decision support surface. |
| `/program-comparison` | Compare pathways | Helps users choose between pathways. |

### Application funnel

| Route | Purpose | Notes |
|---|---|---|
| `/apply` | Main application form | Public intake path. |
| `/apply/results` | Application result/feedback | Post-submit or eligibility-related result view. |
| `/apply/confirmation` | Confirmation | Confirmation after application action. |
| `/apply/create-account` | Account creation | Bridges applicant to member account. |
| `/apply/status` | Application status lookup | Uses status lookup API. |
| `/apply/thank-you` | Thank-you page | Conversion endpoint. |
| `/wioa-qualification` | Public WIOA qualification flow | Public screening and voice session APIs exist under `/api/public/wioa-qualification`. |
| `/q/[token]` | Tokenized questionnaire | Submits through `/api/q/[token]/submit`. |

### Employer, partner, mentor, and content acquisition

| Route | Purpose | Notes |
|---|---|---|
| `/employers` | Employer landing | Pipeline subscription and employer value proposition. |
| `/employers/signup` | Employer signup | Public employer signup path. |
| `/employer/loi` | Employer LOI | LOI motion tied to pipeline subscription. |
| `/employer/thank-you` | Employer conversion endpoint | Post-form thank-you. |
| `/partners` | Partner landing | Referral and community partner pitch. |
| `/partner-signup` | Partner signup | Intake for partner orgs. |
| `/partners/thank-you` | Partner conversion endpoint | Post-signup thank-you. |
| `/mentor` and `/mentor/apply` | Mentor recruitment | Mentor landing and application. |
| `/careers` and `/careers/thank-you` | WorkforceAP careers | Careers lead flow. |
| `/blog` and `/blog/[slug]` | Content marketing | Blog listing/detail, with admin blog management. |
| `/share/achievement` | Public share card | Achievement sharing surface with no member PII. |

---

## 5. Member portal features

The member portal is centered under `/dashboard` and backed mostly by `app/api/member/**`, `app/api/ai/**`, and `components/portal/**`.

### Member dashboard and account

| Route | Feature |
|---|---|
| `/dashboard` | Member home, next actions, progress, voice/promos, status widgets. |
| `/dashboard/account`, `/account`, `/profile`, `/dashboard/profile`, `/dashboard/settings` | Account/profile/settings surfaces. |
| `/account/privacy` | Privacy/account controls. |
| `/dashboard/help`, `/help` | Help/support. |
| `/dashboard/messages` | Member messaging. |
| `/dashboard/resources`, `/resources`, `/resources/[id]` | Resource library and resource detail/progress. |
| `/dashboard/weekly-recap` | Weekly member recap. |
| `/dashboard/points`, `/dashboard/missions` | Engagement, points, missions, sharing, milestone mechanics. |

### Training and program progress

| Route | Feature |
|---|---|
| `/dashboard/program` | Current program overview. |
| `/dashboard/program/start` | Program start/handoff flow. |
| `/dashboard/program/change` | Program change request. |
| `/dashboard/program/employer-screening` | Employer screening tied to program flow. |
| `/dashboard/training` | Training home. |
| `/dashboard/learning` | Learning hub. |
| `/dashboard/learning/find-your-career` | Career exploration inside learning flow. |
| `/dashboard/learning/interest-profiler` | Interest profiler inside member portal. |
| `/dashboard/learning/wioa-qualification` | Member-side WIOA qualification. |
| `/dashboard/coursera` | Coursera identity/progress/launch surface. |
| `/dashboard/certifications`, `/certifications` | Certification vault, upload/export. |

### Job readiness and job search

| Route | Feature |
|---|---|
| `/dashboard/readiness` | Readiness score and checklist. |
| `/dashboard/assessment`, `/dashboard/assessments`, `/dashboard/skills-assessment` | Assessments and skill/profile collection. |
| `/dashboard/resume` | Resume workspace. |
| `/dashboard/jobs`, `/dashboard/jobs/[id]` | Job listings and job detail. |
| `/dashboard/job-applications` | Application tracker. |
| `/applications` | Portal applications index. |
| `/dashboard/career-library`, `/dashboard/career-library/[id]` | Career library and occupation detail. |
| `/dashboard/career-brief`, `/dashboard/career-brief/[slug]` | Career briefs. |
| `/dashboard/mentor`, `/dashboard/mentors`, `/dashboard/mentors/[mentorId]` | Mentor discovery/session flows. |
| `/coach` | Coaching surface. |

### AI tools

The portal exposes 20+ AI-adjacent tools. UI lives under `/dashboard/ai-tools/**`; APIs live under `/api/ai/**` and some member-specific APIs.

| Route | Tool |
|---|---|
| `/dashboard/ai-tools` | AI tools hub. |
| `/dashboard/ai-tools/resume-analysis` | Resume strength/analysis. |
| `/dashboard/ai-tools/resume-coach` | Resume coach workspace. |
| `/dashboard/ai-tools/resume-rewriter` | Resume rewriting. |
| `/dashboard/ai-tools/resume-studio` | Resume studio. |
| `/dashboard/ai-tools/interview-prep` | Interview prep. |
| `/dashboard/ai-tools/interview-practice` | Practice flow. |
| `/dashboard/ai-tools/interview-coach` | Interview coach. |
| `/dashboard/ai-tools/voice-interview` | Voice interview workflow. |
| `/dashboard/ai-tools/job-match-scorer` | Job match scoring. |
| `/dashboard/ai-tools/application-tracker` | AI-supported application tracker. |
| `/dashboard/ai-tools/cover-letter` | Cover letter generation. |
| `/dashboard/ai-tools/linkedin-headline` | LinkedIn headline. |
| `/dashboard/ai-tools/linkedin-about` | LinkedIn about section. |
| `/dashboard/ai-tools/elevator-pitch` | Elevator pitch. |
| `/dashboard/ai-tools/salary-negotiation` | Salary negotiation. |
| `/dashboard/ai-tools/gap-analyzer` | Skill/job gap analysis. |
| `/dashboard/ai-tools/skill-mapper` | Skill mapper. |
| `/dashboard/ai-tools/skill-checkpoints` | Skill checkpoint proof. |
| `/dashboard/ai-tools/training-bridge` | Training-to-career bridge. |
| `/dashboard/ai-tools/benefits-cliff` | Benefits cliff support/request flow. |
| `/dashboard/ai-tools/career-business-coach` | Career/business coaching. |
| `/dashboard/ai-tools/history` | AI tool history. |

---

## 6. Counselor portal features

Counselor routes live under `/counselor` after route groups are removed from the filesystem path.

| Route | Feature |
|---|---|
| `/counselor` | Counselor dashboard. |
| `/counselor/students`, `/counselor/students/[memberId]` | Caseload roster and member detail. |
| `/counselor/queue` | Priority queue. |
| `/counselor/triage` | Triage workflow. |
| `/counselor/at-risk` | At-risk member dashboard. |
| `/counselor/inactive-members` | Inactive member queue. |
| `/counselor/inbox` | Inbox-zero style work queue. |
| `/counselor/messages` | Counselor messaging. |
| `/counselor/notifications` | Notification center. |
| `/counselor/sessions`, `/counselor/sessions/[memberId]/run`, `/counselor/sessions/walk-in` | Session workflows, walk-in sessions, member session runbooks. |
| `/counselor/placements` | Placement logging/review. |
| `/counselor/resources`, `/counselor/guide` | Counselor resources and guide. |

Key API groups: `/api/counselor/dashboard`, `/api/counselor/members/**`, `/api/counselor/sessions/**`, `/api/counselor/inbox-zero/**`, `/api/counselor/notifications`, `/api/counselor/placements`, `/api/counselor/nudge`, `/api/counselor/remind-member`.

---

## 7. Employer portal and employer revenue features

Employer work is split between public acquisition pages and authenticated employer portal pages.

### Public employer acquisition

| Route/API | Feature |
|---|---|
| `/employers` | Employer landing page. |
| `/employers/signup` | Employer signup page. |
| `/employer/loi` | LOI form and pipeline subscription motion. |
| `/api/employer/loi` | LOI submission API. |
| `/api/employer/signup` | Employer signup API. |
| `/api/employer/subscribe` | Subscription creation API backed by `EmployerSubscription`. |
| `/api/employer/checkout` | Stripe checkout flow. |
| `/api/stripe/webhook` | Stripe webhook receiver. |

### Employer portal

| Route | Feature |
|---|---|
| `/employer` | Employer home. |
| `/employer/work-queue` | Employer work queue. |
| `/employer/pipeline` | Candidate pipeline. |
| `/employer/jobs`, `/employer/jobs/new`, `/employer/jobs/post`, `/employer/jobs/import` | Job management and import/post flows. |
| `/employer/jobs/[id]`, `/employer/jobs/[id]/edit`, `/employer/jobs/[id]/applicants` | Job detail, edit, applicants. |
| `/employer/matches` | Candidate matches. |
| `/employer/candidates/[studentId]` | Candidate detail. |
| `/employer/applications`, `/employer/applications/[id]` | Employer application review. |
| `/employer/messages` | Employer messaging. |
| `/employer/billing` | Billing/subscription. |
| `/employer/settings` | Employer settings. |
| `/employer/outcomes` | Employer outcomes dashboard. |
| `/employer/guide` | Employer guide. |

Important models: `Employer`, `EmployerHiringIntent`, `EmployerScreeningPack`, `EmployerSubscription`, `Job`, `JobPostingApplication`, `AIJobMatch`, `ApplicationMessage`.

---

## 8. Partner portal features

| Route | Feature |
|---|---|
| `/partners` | Public partner landing. |
| `/partner-signup` | Public partner signup. |
| `/partner` | Partner home. |
| `/partner/attention` | Members needing attention. |
| `/partner/referred-members`, `/partner/referred-members/[memberId]` | Referral roster and detail. |
| `/partner/members`, `/partner/members/[id]` | Partner member views. |
| `/partner/messages` | Partner messaging. |
| `/partner/outcomes` | Partner outcomes/impact. |
| `/partner/exports` | Exports. |
| `/partner/milestones` | Milestones. |
| `/partner/resources`, `/partner/guide` | Partner resources/guide. |
| `/partner/settings` | Partner settings. |

Key APIs: `/api/partner/signup`, `/api/partner/dashboard`, `/api/partner/referrals/**`, `/api/partner/members/**`, `/api/partner/messages`, `/api/partner/export/referrals`, `/api/partner/payout`, `/api/partner/milestones`, `/api/partner/settings/**`.

Important models: `Partner`, `PartnerUser`, `PartnerReferral`, `PartnerSignupRequest`, `PartnerOutreachLog`, `ReferralCode`, `ReferralConversion`.

---

## 9. Admin operating system

Admin is the largest page group: 84 pages and 172 API routes.

### High-level admin areas

| Area | Routes | What it does |
|---|---|---|
| Admin home | `/admin`, `/admin/dashboard`, `/admin/overview` | Staff landing surfaces and overview. |
| Command center | `/admin/command-center` | Dad Command Center, plain-English operational packet builder and action buckets. |
| Members | `/admin/members/**` | Member list, detail, new member, merge, duplicates, lifecycle, readiness, stakeholder, training, job-ready/interview-ready views. |
| Programs | `/admin/programs`, `/admin/subgroups/**`, `/admin/program-change-requests`, `/admin/career-mappings` | Program catalog/admin, subgroups, program changes, career mapping. |
| Outcomes and reports | `/admin/outcomes`, `/admin/outcomes/methodology`, `/admin/reports/quarterly-outcomes`, `/admin/wioa-screening` | WIOA outcomes dashboard, methodology, quarterly reporting, qualification screens. |
| Coursera | `/admin/coursera/**` | Coursera learners, CSV import, health, unmatched learners, events. |
| Employers | `/admin/employers`, `/admin/employers/[id]`, `/admin/employer-screening-packs` | Employer admin, approvals, screening packs. |
| Partners | `/admin/partners`, `/admin/partners/[id]`, `/admin/partners/new` | Partner management. |
| Jobs and placements | `/admin/jobs/**`, `/admin/placements/**`, `/admin/placement-surveys` | Job approvals, placement records, placement survey ops. |
| Communications | `/admin/messages`, `/admin/email-templates`, `/admin/email-crons`, `/admin/weekly-recap`, `/admin/agent-inbox` | Messages, templates, email cron/admin inbox. |
| Operations | `/admin/crons`, `/admin/health`, `/admin/diagnostics`, `/admin/audit-logs`, `/admin/webhook-events`, `/admin/data-retention`, `/admin/exports`, `/admin/feature-flags` | System health, audit, webhook retries, retention, exports, flags. |
| Content/trust | `/admin/blog/**`, `/admin/testimonials`, `/admin/board`, `/admin/board/print`, `/admin/growth`, `/admin/analytics/**`, `/admin/ai-tools` | Blog, testimonial, board, growth analytics, AI efficacy. |
| People/admin setup | `/admin/users/**`, `/admin/counselors`, `/admin/mentors`, `/admin/invites/**`, `/admin/settings` | Staff/user/counselor/mentor/invite/org settings. |

### Outcomes dashboard

`/admin/outcomes` is the authoritative operational outcomes surface. It is backed by `/api/admin/outcomes/snapshot` and documented in `docs/OUTCOMES-METHODOLOGY.md`.

It tracks:

- members served/enrolled/in training/certified/placed
- placement rate with sample-size suppression
- median salary and total annual salary value
- average weeks to placement
- outcomes funnel
- program-level enrollment/certification/placement
- demographics
- member activity
- certifications
- application funnel
- PII-stripped placement detail
- data quality flags such as missing program, funding, retention, salary, and missing `enrolled_at`

### Dad Command Center

`/admin/command-center` was added as a plain-English admin surface for fast operating decisions. Source files:

- `app/admin/command-center/page.tsx`
- `components/admin/AdminCommandCenterClient.tsx`
- `lib/admin/commandCenter.ts`
- `lib/admin/commandCenterHelpers.ts`
- `lib/admin/commandCenter.test.ts`

It turns applicant/member/admin data into action buckets and readable packets instead of forcing non-technical operators through raw tables.

---

## 10. Learning, Coursera, and xAPI

WorkforceAP has a real learning integration layer rather than static program pages.

| Capability | Files / APIs |
|---|---|
| Coursera identity and launch | `/api/member/coursera/identity`, `/api/member/coursera/launch`, `/api/member/coursera/enroll-in-course` |
| Member progress | `/api/member/coursera`, `/api/member/coursera/refresh-progress`, `/api/member/learning-progress`, `/api/member/courses/complete` |
| Admin Coursera ops | `/admin/coursera/**`, `/api/admin/coursera/**` |
| Cron sync and repair | `/api/cron/coursera-sync`, `/api/cron/coursera-training-sync`, `/api/cron/coursera-b4b-sync`, `/api/cron/coursera-auto-heal` |
| Webhook ingestion | `/api/webhooks/coursera` |
| xAPI | `/api/xapi/about`, `/api/xapi/config`, `/api/xapi/oauth/token`, `/api/xapi/statements` |
| Catalog backfill | `npm run coursera:backfill-catalog` |
| Integration test | `npm run coursera:test` |

Important models include `Course`, `CourseEnrollment`, `CourseProgress`, `MemberProgramProgress`, `XapiStatement`, `CourseraCourseProgress`, `CourseraCanonicalCourseMapping`, `CourseraIdentityMapping`, `CourseraBadgeProgress`, `CourseraSkillsetProgress`.

---

## 11. AI and voice systems

The AI layer is broad and split by use case.

| Area | APIs / files |
|---|---|
| Resume tooling | `/api/ai/resume-strength`, `/api/ai/resume-rewriter`, `/api/ai/extract-resume-text`, `/api/ai/export-pdf`, `/api/member/resume/**`, `/api/member/resume-coach/**` |
| Interview tooling | `/api/ai/interview/start`, `/api/ai/interview/response`, `/api/ai/interview/results`, `/api/ai/interview-practice`, `/api/interview/session`, `/api/interview/history` |
| Job matching | `/api/ai/job-match-scorer`, `/api/ai/job-tailor/[jobId]`, `/api/member/matched-jobs`, `/api/employer/jobs/[id]/matches/**` |
| Career content | `/api/ai/cover-letter`, `/api/ai/elevator-pitch`, `/api/ai/linkedin-headline`, `/api/ai/linkedin-about`, `/api/ai/gap-analyzer`, `/api/ai/salary-negotiation` |
| Skill profile | `/api/ai/skill-mapper`, `/api/ai/extract-resume-skills`, `/api/member/skill-profile`, `/api/member/skill-assessment`, `/api/member/skill-checkpoints` |
| Voice sessions | `/api/member/voice-interview/session`, `/api/member/voice-interview/transcript`, `/api/member/voice-interview/recording`, `/api/member/readiness/voice-session`, `/api/member/wioa-qualification/voice-session`, `/api/partner/voice-session`, `/api/employer/voice-session`, `/api/counselor/sessions/voice-walkthrough` |
| AI audit/history | `/api/member/ai-history`, `/admin/analytics/ai-efficacy`, `/admin/ai-tools` |

Important models: `AIToolResult`, `CoachMemory`, `ApplicationAiFeedback`, `AIJobMatch`, `MemberNextBestAction`, `MemberFeedback`.

---

## 12. Data model map

The schema currently has 95 Prisma models. The practical grouping:

| Group | Models |
|---|---|
| Tenant and identity | `Organization`, `User`, `Profile`, `Role`, `UserRole`, `Invitation`, `TokenizedLink` |
| Member lifecycle | `Application`, `ReadinessChecklist`, `ApplyEligibilityScreening`, `PublicWioaScreening`, `TrainingAccessRequest`, `MemberEvent`, `PortalWorkflowEvent`, `WorkflowDiagnostic` |
| Learning | `Course`, `CourseEnrollment`, `LearningProgress`, `CourseProgress`, `MemberProgramProgress`, `PathwayStepProgress`, `CourseraCourseProgress`, `CourseraCanonicalCourseMapping`, `CourseraIdentityMapping`, `CourseraBadgeProgress`, `CourseraSkillsetProgress`, `XapiStatement` |
| Programs and careers | `OrganizationProgramCatalog`, `Subgroup`, `MemberSubgroup`, `SubgroupLeader`, `OnetOccupation`, `OnetOccupationSkill`, `OnetOccupationTask`, `OnetOccupationTech`, `OnetRelatedOccupation`, `CareerProgramMapping`, `CareerQuizRule` |
| Jobs and employers | `Employer`, `EmployerHiringIntent`, `EmployerScreeningPack`, `EmployerSubscription`, `Job`, `WapJob`, `JobApplication`, `JobPostingApplication`, `AIJobMatch`, `ApplicationMessage` |
| Counselors and support | `Counselor`, `CounselorAssignment`, `CounselorNote`, `MessageThread`, `Message`, `AtRiskAlert`, `MemberNudgeLog`, `Notification` |
| Outcomes | `PlacementRecord`, `PlacedOutcome`, `PlacementSurvey`, `UserCertification`, `Testimonial` |
| Partners and referrals | `Partner`, `PartnerUser`, `PartnerReferral`, `PartnerSignupRequest`, `PartnerOutreachLog`, `ReferralCode`, `ReferralConversion` |
| AI and coaching | `AIToolResult`, `CoachMemory`, `ApplicationAiFeedback`, `MemberNextBestAction` |
| Ops/compliance | `AuditLog`, `AuditEvent`, `CronExecution`, `WebhookEvent`, `FeatureFlag`, `EmailTemplate`, `AutomationRule`, `WeeklyRecap`, `Resource`, `ResourceProgress`, `Goal`, `BenefitRequest`, `Mentor`, `MentorSpecialty`, `MentorSession`, `MemberPoints`, `PointsTransaction`, `MilestoneCascade` |

When adding a feature, check this table before creating a new model. Many concepts already exist.

---

## 13. API route map by domain

There are 436 API routes. Use these groups to find the right surface.

| Group | Count | Purpose |
|---|---:|---|
| `/api/admin/**` | 172 | Admin operations, exports, reports, member/employer/partner management, Coursera ops, settings, audit, webhook retries. |
| `/api/member/**` | 88 | Member portal data, profile, learning, resumes, AI history, applications, notifications, certifications, Coursera, WIOA, voice sessions. |
| `/api/counselor/**` | 26 | Counselor dashboard, sessions, members, notes, nudges, inbox, placements, analytics. |
| `/api/cron/**` | 24 | Scheduled jobs for Coursera, WIOA, nudges, placement survey, weekly recap, deploy health, data cleanup. |
| `/api/employer/**` | 23 | Employer jobs, applications, messages, checkout, LOI, signup, outcomes, subscription, settings. |
| `/api/partner/**` | 20 | Partner dashboard, referrals, members, payouts, exports, milestones, settings. |
| `/api/ai/**` | 19 | AI tools for resume, interview, job matching, LinkedIn, cover letters, salary, gaps. |
| `/api/auth/**` | 7 | Login/logout/me, MFA setup/verify/check, forgot password. |
| `/api/xapi/**` | 5 | xAPI about/config/oauth/statements. |
| `/api/public/**` | 5 | Public career quiz, interest profiler, WIOA qualification. |
| other | 47 | Contact, health, invite, leads, mentor(s), onboarding, org settings, placement survey, webhooks, stripe, subgroup, waitlist, recommendations. |

---

## 14. Operational commands

Use pnpm 10 via Corepack. CI uses the pnpm lockfile.

| Command | Use |
|---|---|
| `corepack pnpm@10 install --frozen-lockfile` | Install dependencies exactly from lockfile. |
| `corepack pnpm@10 run dev` | Start local Next dev server. |
| `corepack pnpm@10 run typecheck` | TypeScript gate. |
| `corepack pnpm@10 run lint` | ESLint gate. Current repo has known warnings but should have 0 errors. |
| `corepack pnpm@10 run test:unit` | Node test runner wrapper. Some Vitest specs are intentionally skipped by this runner. |
| `corepack pnpm@10 run test:vitest` | Vitest runner. |
| `corepack pnpm@10 run test:e2e` | Playwright E2E. |
| `corepack pnpm@10 run build` | Production build, includes Material Symbols size check and Prisma generate. |
| `corepack pnpm@10 exec prisma generate` | Regenerate Prisma client after schema/model changes. Required when TypeScript cannot see a new delegate like `employerSubscription`. |
| `corepack pnpm@10 run db:migrate` | Local Prisma migration. |
| `corepack pnpm@10 run db:migrate:deploy` | Deploy migrations. |
| `corepack pnpm@10 run check:tenant-routes` | Tenant-route hardening check. |
| `corepack pnpm@10 run smoke:prod` | Production paid funnel smoke. |

---

## 15. Recently shipped surfaces captured by this doc

| PR | Surface | What changed |
|---|---|---|
| #1723 | `/programs` | Quick-start card 3 now points at Project Management instead of the software-development subgroup. |
| #1728 | Program detail / employer subscription | Adds EducationalOccupationalProgram JSON-LD, Stripe subscription API, and `EmployerSubscription`. |
| #1730 | `/programs/google-it-support` | Adds focused Google IT Support landing page and live metric support. |
| #1731 | `/admin/command-center` | Adds Dad Command Center and helper tests. |
| #1734 | Member-facing copy | Standardizes independent WorkforceAP staff language to “advisor” while leaving technical/admin/counselor role names intact. |

---

## 16. Change rules and traps

1. **Do not treat “counselor” as globally wrong.**  
   Member-facing WorkforceAP staff copy should use “advisor” where the independent staff label is meant. Technical schema, auth roles, counselor portal labels, and partner-org counselor concepts still use “counselor”.

2. **Do not bypass locked product-stake files casually.**  
   The locked-stakes workflow protects files such as `app/(decision-journey)/programs/page.tsx`. Add `stake-approved` only after Mike approves the product/content change.

3. **After Prisma model changes, regenerate client.**  
   If TypeScript says `Property 'employerSubscription' does not exist on type PrismaClient`, run `corepack pnpm@10 exec prisma generate` before changing code.

4. **Keep outcomes claims tied to methodology.**  
   Public or board-facing outcome claims should trace back to `docs/OUTCOMES-METHODOLOGY.md` and/or `/admin/outcomes` data. Respect sample-size suppression.

5. **The app has route groups.**  
   Files under `app/(portal)/dashboard/**` render as `/dashboard/**`; route groups do not appear in URLs.

6. **Dashboard components are high-churn.**  
   If a PR conflicts in `components/admin/OutcomesDashboard.tsx` or `components/employer/EmployerOutcomesDashboard.tsx` but the PR is not about outcomes dashboards, inspect carefully. Recent stale branches had unrelated dashboard changes that should be dropped in favor of fresh `master`.

---

## 17. Where to go next

| Need | Start here |
|---|---|
| New developer setup | `README.md`, `docs/DEVELOPER-ONBOARDING.md`, `AGENTS.md` |
| Env/config | `docs/ENVIRONMENT-VARIABLES.md` |
| API details | `docs/API-REFERENCE.md`, `app/api/**` |
| Outcomes methodology | `docs/OUTCOMES-METHODOLOGY.md` |
| Coursera launch | `docs/coursera-go-live-runbook.md`, `docs/coursera-xapi-setup.md`, `lib/coursera/**` |
| Security/tenant isolation | `docs/TENANT-ISOLATION.md`, `docs/SECURITY-HARDENING.md`, `docs/API-ROUTE-ACCESS-INTENTIONS.md` |
| Design/UI | `components/marketing/**`, `components/portal/**`, `css/main.css`, `.stitch/**` |
| Product decisions | `docs/decisions/**`, `docs/reviews/**`, `docs/PRODUCT_STAKES.md` if present |
| Current repo route inventory | Run the inventory script pattern used for this doc: scan `app/**/page.tsx`, `app/api/**/route.ts`, and `prisma/schema.prisma`. |
