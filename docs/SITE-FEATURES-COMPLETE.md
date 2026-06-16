# WorkforceAP — Complete Site & Feature Documentation
**Version:** 2026-06-16  
**Branch:** master  
**Status:** Production-ready  

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Public Marketing Site](#2-public-marketing-site)
3. [Member Portal](#3-member-portal)
4. [Counselor Portal](#4-counselor-portal)
5. [Partner Portal](#5-partner-portal)
6. [Employer Portal](#6-employer-portal)
7. [Admin Portal](#7-admin-portal)
8. [AI Tools Suite](#8-ai-tools-suite)
9. [Career Quiz & Lead Magnets](#9-career-quiz--lead-magnets)
10. [API Reference](#10-api-reference)
11. [Database Schema](#11-database-schema)
12. [External Integrations](#12-external-integrations)
13. [Security & Compliance](#13-security--compliance)
14. [Deployment & Operations](#14-deployment--operations)

---

## 1. Architecture Overview

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.5.18 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password + MFA) |
| Hosting | Vercel |
| Styling | Tailwind CSS with `wa-` prefix custom design system |
| AI | Anthropic Claude + ElevenLabs voice |
| Email | Resend |
| CRM | HubSpot |

### Route Groups
```
app/
├── (auth)/          # Login, signup, MFA, password reset
├── (decision-journey)/  # Public program discovery, career quiz, salary guide
├── (portal)/        # All authenticated portals (member, counselor, partner, employer, admin)
├── api/             # 440+ API endpoints
├── programs/        # Legacy program pages (redirected to decision-journey)
└── blog/            # Content marketing
```

### Portal Shell Architecture
- `PortalLayoutClient.tsx` — Responsive layout with mobile bottom nav, desktop sidebar
- `MainNav.tsx` — Top navigation with role-aware links
- `MobileBottomNav.tsx` — Fixed bottom bar on mobile (6 icons: home, learning, AI tools, messages, jobs, profile)
- Role-based route guards via middleware + Supabase session

---

## 2. Public Marketing Site

### Pages (12 core routes)
| Route | Purpose | Key Features |
|-------|---------|-------------|
| `/` | Homepage | Hero with "Empowering People. Advancing Futures.", 3 trust cards, program quick-start, social proof |
| `/programs` | Program catalog | Visually open layout (locked stake — no dropdowns), 19 programs grouped by career area |
| `/programs/[slug]` | Single program | Course list, certifications, outcomes, testimonials, "Apply" CTA |
| `/find-your-path` | Career discovery | Guided quiz → program recommendations |
| `/program-comparison` | Side-by-side | Compare up to 3 programs on salary, duration, certs |
| `/salary-guide` | Market data | Role-based salary ranges with source attribution |
| `/how-it-works` | Process explainer | 11-step journey visualization |
| `/about` | Organization | Mission, team, funders, partners |
| `/employers` | Employer pitch | Pipeline access, co-funding, job posting |
| `/partners` | Partner pitch | Referral tracking, free portal, revenue share |
| `/impact` | Outcomes proof | Placement stats, testimonials, methodology |
| `/career-quiz` | Lead magnet | RIASEC assessment → shareable results → application funnel |
| `/apply` | Application | Multi-step intake, grant eligibility screening, referral source |
| `/contact` | General inquiry | Form + direct contact info |
| `/blog` | Content | Posts with hero images, SEO-structured |

### Design System (Locked Stakes)
- **Programs page stays visually open** — no accordions/dropdowns hiding the catalog
- **Public copy stays member-safe** — "no cost to members" / "funded by grants and partnerships"
- **Homepage hero stays grounded** — specific operational copy below the headline

---

## 3. Member Portal

### Dashboard (`/dashboard`)
- **Progress ring** — Visual completion % for current program
- **Next steps strip** — Recommended actions (truthful status: "recommended", "unlocked", "in progress")
- **Career plan card** — Activated plan with milestones
- **Quick actions** — Resume, applications, messages, certifications

### Learning (`/dashboard/learning`)
- **Course list** — Coursera-integrated with progress tracking
- **Certification tracker** — Earned + in-progress certs
- **Skill missions** — Interactive proof-of-skill exercises
- **Weekly recap** — Summary of activity + nudges

### AI Tools Hub (`/dashboard/ai-tools`)
8 live tools + 1 in development:

| Tool | Route | Description |
|------|-------|-------------|
| Resume Rewriter | `/resume-rewriter` | AI-optimized resume based on job description |
| Cover Letter | `/cover-letter` | Role-specific cover letter generation |
| Interview Practice | `/interview-practice` | STAR framework worksheets, transcript export |
| Voice Interview | `/voice-interview` | ElevenLabs voice mock interview with live transcript + AI feedback |
| Job Match | `/job-match` | Match % between profile and job posting |
| Gap Analyzer | `/gap-analyzer` | Skills gap vs target role |
| Elevator Pitch | `/elevator-pitch` | 60-second pitch generator |
| Career Business Coach | `/career-business-coach` | Negotiation + career guidance |
| Application Tracker | `/application-tracker` | Centralized job application management |
| Benefits Cliff | `/benefits-cliff` | Income impact calculator for benefit recipients |
| Skill Mapper | `/skill-mapper` | O*NET search + radar chart + gap analysis |

### Skill Mapper Detail
- **O*NET search** — 800+ occupations with skill profiles
- **Radar chart** — 6-axis comparison (Research, Engineering, Design, Strategy, Service, Analytics)
- **Gap analysis** — "Your skills vs. [Occupation]" with % needed to close
- **Certification recommendations** — Suggested certs to close gaps
- **Export PDF** — Downloadable comparison report
- **Demo fallback** — Works without O*NET API key using seeded data

### Profile (`/dashboard/profile`)
- **Resume upload** — PDF/DOCX/TXT extraction with plain-text fallback
- **Contact info** — Phone, address, zip, referral source (must review starter data before progression)
- **Certifications** — Verification vault for earned certs
- **Career plan** — Activated plan with milestone tracking
- **Program** — Current assignment (admin/counselor controlled — no self-serve switching)

### Jobs (`/dashboard/jobs`)
- **Job board** — Employer-posted positions with match scores
- **Apply flow** — In-portal application tracking
- **Saved jobs** — Bookmark positions

### Messages (`/dashboard/messages`)
- **Counselor chat** — Async messaging with assigned counselor
- **System notifications** — Enrollment, placement, milestone alerts

---

## 4. Counselor Portal

### Dashboard (`/counselor`)
- **Triage queue** — 6 flag types: no activity 10d, SLA breach 48h, SLA warning 24h, stale training, computer support followup, milestone reached
- **One-click nudge** — Pre-written outreach templates (Dad-voiced tone)
- **Member roster** — Assigned members with status indicators
- **Quick stats** — Active members, pending applications, placements this month

### Member Management
- **Student detail** (`/counselor/students/[id]`) — Full profile, progress, messages, notes
- **Walk-in sessions** (`/counselor/sessions/walk-in`) — On-the-spot intake recording
- **Run sessions** (`/counselor/sessions/[id]/run`) — Structured counseling session with notes
- **At-risk** (`/counselor/at-risk`) — Members flagged for intervention
- **Inactive** (`/counselor/inactive-members`) — 7+ days no activity

### Tools
- **Inbox** — All member messages threaded
- **Placements** — Record and verify job placements
- **Resources** — Shareable materials for members
- **Queue** — Structured intake queue for new applicants
- **Guide** — Internal process documentation

---

## 5. Partner Portal

### Dashboard (`/partner`)
- **Referral tracking** — Members referred by this partner with progress
- **Outcome data** — Placement stats for funder reporting
- **Subgroup management** — Cohort organization (churches, programs, etc.)

### Features
- **Member add wizard** — Intake + partner assignment in one flow
- **Milestone notifications** — Auto-email on enrollment, completion, certification, placement
- **Progress export** — CSV/PDF for partner's own funders
- **Referral link** — Shareable URL with tracking

### Onboarding
- **Auto-advance tour** — 4 slides, 7500ms duration
- **Self-registration** — `/partner-signup` (public page)

---

## 6. Employer Portal

### Dashboard (`/employer`)
- **Job management** — Post, edit, close listings
- **Candidate search** — Filter by certification, skill, match score
- **Pipeline stats** — Views, applications, hires from WorkforceAP

### Job Approval Workflow
```
Draft (employer editing)
  ↓ Submit
Pending (admin review)
  ↓ Admin approves
Live (visible on /jobs)
  ↓ Employer closes / Admin removes
Closed
```
- Employer submits → Admin reviews → Approve/Reject with reason → Goes live
- Email notifications at each state change

### Settings
- Company profile (name, description, website, size, industry)
- Contact info
- Hiring partner tier badge (basic / partner)

---

## 7. Admin Portal

### Overview (`/admin`)
- **Real-time dashboard** — Members, applications, enrollments, placements
- **Recent signups** — PII masked (emails truncated)
- **Quick actions** — Approve applications, assign counselors, export data

### Members (`/admin/members`)
- **Full lifecycle** — Application → Enrolled → Active → Placed → Alumni
- **Bulk actions** — Export, assign counselor, change program, delete (with audit log)
- **xAPI audit** — Every bulk action logged for compliance
- **Member merge** — Deduplicate duplicate records (e.g., multiple "Michael Brown" entries)

### Programs (`/admin/programs`)
- **Program stats** — Enrollment, completion, placement rates per program
- **Cohort management** — Batch enrollment, progress tracking
- **Course mapping** — Coursera catalog integration, canonical course mappings

### Analytics (`/admin/analytics`)
- **AI efficacy** — Tool usage, member outcomes
- **Placement dashboard** — Verified placements with employer attribution
- **Funder metrics** — Program-specific outcome data for grant reporting
- **Outcomes methodology** — `getBoardSnapshot()` for defensible pitches

### Coursera Integration (`/admin/coursera`)
- **CSV import** — Bulk course enrollment
- **xAPI reconciliation** — Match unmatched learners to WAP members
- **Auto-heal cron** — Hourly reconciliation of unmatched events
- **B4B bindings** — Business-for-Business program mappings
- **Canonical mappings** — Course slug → WAP program alignment

### Blog (`/admin/blog`)
- **AI-assisted drafting** — Generate from ideas, auto-review
- **SEO optimization** — Structured data, meta tags
- **Publishing workflow** — Draft → Review → Live

### Cron Management (`/admin/crons`)
- **7 cron jobs** — Weekly recap, inactive nudge, Coursera auto-heal, etc.
- **Template preview** — See email templates before they send
- **Run history** — Last execution status

### Exports (`/admin/exports`)
- **WIOA-compliant reporting** — Standardized export formats
- **Custom cohort exports** — Filtered by program, date, status
- **xAPI audit trail** — Compliance documentation

---

## 8. AI Tools Suite

### Architecture
- **Shared AI client** — `lib/ai/` with provider abstraction (Anthropic primary, ElevenLabs voice)
- **Post-processing** — `lib/ai/postProcess.ts` strips smart quotes, fixes typos, removes markdown
- **Output sanitization** — Shared helper across all AI endpoints
- **Rate limiting** — Per-member, per-tool quotas

### Voice Interview (ElevenLabs)
- **Browser STT fallback** — Web Speech API when ElevenLabs unavailable
- **Video recording** — Optional WebRTC camera + mic, upload to private storage
- **Session history** — Transcript + AI feedback stored per member
- **Checkpoint persistence** — Auto-save during long sessions

### Support Bot (Planned)
- Replace Grok widget with ElevenLabs-powered agent
- Trained on WorkforceAP docs, programs, policies
- Escalates to human counselor when needed

---

## 9. Career Quiz & Lead Magnets

### Career Quiz (`/career-quiz`)
- **RIASEC assessment** — 60 questions, 6 personality areas
- **Shareable results** — OG image cards for social sharing
- **Wrapped-style story** — Spotify-Wrapped swipeable results
- **Lead magnet loop** — Quiz → results → "Apply to WorkforceAP" CTA
- **Dynamic OG cards** — Per-result personality type images

### Integration Points
- Homepage CTA
- Footer link
- Mobile nav tab
- Nav dropdown
- Social share cards

---

## 10. API Reference

### 440+ endpoints across 12 namespaces:

| Namespace | Count | Purpose |
|-----------|-------|---------|
| `/api/admin/*` | ~80 | Full admin CRUD, analytics, exports |
| `/api/member/*` | ~40 | Member profile, progress, applications |
| `/api/counselor/*` | ~25 | Triage, nudge, sessions, placements |
| `/api/partner/*` | ~15 | Referrals, progress tracking, exports |
| `/api/employer/*` | ~20 | Job posting, candidate search, settings |
| `/api/ai/*` | ~15 | All AI tool endpoints |
| `/api/auth/*` | ~10 | Session, MFA, password reset |
| `/api/contact` | 1 | Public inquiry form |
| `/api/apply/*` | ~10 | Application intake, status check |
| `/api/coursera/*` | ~15 | Course launch, progress, xAPI |
| `/api/health` | 1 | Dependency-aware health check |
| `/api/og/*` | ~5 | Dynamic Open Graph image generation |

### Key Endpoints
- `POST /api/apply` — Submit application
- `GET /api/member/resume?includePlainText=1` — Get resume with extracted text
- `POST /api/ai/resume-rewriter` — AI resume optimization
- `POST /api/counselor/nudge` — Send templated outreach
- `GET /api/admin/outcomes/snapshot` — Defensible metrics for pitches
- `POST /api/admin/coursera/reconcile` — Match unmatched xAPI learners
- `GET /api/health` — DB, Supabase, Resend, Coursera, Turnstile, Sentry status

---

## 11. Database Schema

### Core Models (Prisma)
| Model | Purpose |
|-------|---------|
| `Member` | Job-seeker profile, status, program assignment |
| `Application` | Intake data, eligibility, referral source |
| `Program` | Training program definition, courses, outcomes |
| `Course` | Individual course within program |
| `Certification` | Earned credentials |
| `Employer` | Hiring company profile, tier, jobs |
| `Job` | Posted position, status, matches |
| `Partner` | Referral organization |
| `PartnerUser` | Individual login for partner org |
| `Counselor` | Case manager profile, assignments |
| `Mentor` | Volunteer mentor (planned) |
| `Placement` | Verified job placement record |
| `xapiStatement` | Learning record store (LRS) |
| `CourseraMapping` | Course slug ↔ WAP program alignment |
| `BlogPost` | Content with heroImage, SEO metadata |
| `CronJob` | Scheduled task registry |
| `EmailTemplate` | Transactional email templates |
| `Notification` | In-app + email notification queue |
| `Achievement` | Gamification badges |
| `CareerPlan` | Activated plan with milestones |
| `SkillMission` | Interactive proof-of-skill exercises |
| `FundingSource` | Grant/funder tracking |

### Key Fields
- `organization_id` on all tenant-scoped tables (RLS-enforced)
- `deletedAt` soft delete pattern
- `createdAt`/`updatedAt` on all models
- JSONB for flexible metadata (progress, preferences, etc.)

---

## 12. External Integrations

| Service | Status | Purpose |
|---------|--------|---------|
| **Supabase** | Live | Auth, DB, storage |
| **Vercel** | Live | Hosting, edge functions |
| **Resend** | Live | Transactional email |
| **Anthropic** | Live | AI text generation |
| **ElevenLabs** | Live | Voice AI (interview coach, planned support bot) |
| **Coursera** | Live | Course catalog, xAPI progress tracking |
| **HubSpot** | Live | CRM, contact sync |
| **Cloudflare Turnstile** | Live | CAPTCHA on public forms |
| **Sentry** | Live | Error tracking |
| **Google Analytics** | Live | Web analytics |
| **LinkedIn** | Live | Profile enrichment (rate-limited) |
| **O*NET** | Live | Occupation data for Skill Mapper |
| **Squarespace** | Legacy | Public marketing site (being migrated) |

---

## 13. Security & Compliance

### Authentication
- Supabase Auth with email/password
- MFA (TOTP) optional
- Session management with refresh tokens
- Role-based access control (RBAC) — member, counselor, partner, employer, admin, super-admin

### Authorization
- **RLS (Row Level Security)** — `organization_id` scoped queries
- **GUC bootstrap** — Org context set per request
- **Middleware guards** — Route-level role checks
- **API validation** — Zod schemas on all inputs

### Compliance
- **WIOA-compliant** — Reporting exports meet federal standards
- **FERPA-ready** — Education record protections
- **CSP hardened** — Content Security Policy with `object-src 'none'`, `frame-ancestors 'none'`
- **Privacy policy** — Live on `/account/privacy`
- **Terms of service** — Live
- **GDPR considerations** — Data export, deletion requests

### Audit
- **xAPI event logging** — Every learning interaction recorded
- **Admin action audit** — Bulk member actions logged with actor + timestamp
- **Cron run history** — Execution status + error tracking

---

## 14. Deployment & Operations

### Environments
| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | workforceap.org | Live public + portal |
| Staging | Preview deploys | Pre-prod verification |
| Local | localhost:3000 | Development |

### Build Process
```bash
npm run build
# 1. Verify Material Symbols font subset
# 2. Prisma generate
# 3. Next.js build with optimizeCss experiment
```

### Verification Loop
```bash
scripts/engineer-loop.sh verify
# 1. Portal auth/bootstrap repair
# 2. Unit tests (686 tests, 20 suites)
# 3. Route audit sweep
# 4. Production build path
```

### Cron Jobs (7 active)
| Job | Schedule | Purpose |
|-----|----------|---------|
| Weekly Recap | Sundays 6 PM | Member activity summary |
| Inactive Nudge | Daily | 7+ day inactive members |
| Coursera Auto-Heal | Hourly | Reconcile unmatched xAPI |
| Morning Heartbeat | 9 AM | System health check |
| Midday Heartbeat | 1 PM | System health check |
| Evening Heartbeat | 6 PM | System health check |
| Overnight Batch | 2 AM | Background processing |

### Backup & Recovery
- Supabase automated backups
- Vercel deployment rollback
- Git history for code recovery

---

## Document History

| Date | Change |
|------|--------|
| 2026-06-16 | Initial comprehensive documentation — 262 page routes, 440 API routes, 461 components, 474 lib modules inventoried |

---

*Document owner: Aura | Source: workforceap-beta repo master branch | Build verified: ✅*