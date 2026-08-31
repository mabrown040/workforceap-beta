# WAP API Reference

> Generated from `app/api/**/*.route.ts` on 2026-05-13. Critical route
> contracts are maintained inline between full inventory regenerations.
> **Contract corrections last reviewed:** 2026-08-31

**Snapshot total routes:** 365

## Auth (7)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/auth/check-mfa-required` | GET | member | GET /api/auth/check-mfa-required Returns whether the current session needs MFA verification. Used by the verify-mfa page to guard access. |
| `/api/auth/forgot-password` | POST | public | Return the same uniform message — don't confirm the email exists |
| `/api/auth/login` | POST | public | Rate limit by email to prevent brute-force |
| `/api/auth/logout` | POST | public | Clear the session-only preference flag on logout |
| `/api/auth/me` | GET | super_admin |  |
| `/api/auth/setup-mfa` | POST, PATCH | public | POST /api/auth/setup-mfa Enrolls a new TOTP factor for the current user. Returns: { qr, secret, factorId } — client shows QR, user confirms  |
| `/api/auth/verify-mfa` | POST | public | POST /api/auth/verify-mfa Verifies TOTP code after initial password login. Expects: { code: string } in body. Requires active session with a |

## Public (6)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/dashboard/jobs/[id]/apply` | POST | member | Award points (idempotent on application id) |
| `/api/dashboard/jobs/[id]` | GET | public | Public job detail - only live jobs */ |
| `/api/dashboard/jobs` | GET | public | Public jobs listing - only live jobs for students */ |
| `/api/public/wioa-qualification` | POST | public |  |
| `/api/public/wioa-qualification/voice-session` | POST | public |  |
| `/api/xapi` | — | public | xAPI tenant server endpoint. Coursera's "Standard xAPI format" client posts |

## Health (3)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/health` | GET, OPTIONS | public | Liveness only (no Prisma). `probe: live`. See `docs/HEALTH-PROBES.md`. |
| `/api/health/ready` | GET, OPTIONS | public | Readiness: Prisma + default org. 503 if unreachable. Use for 504-adjacent dependency alerts. |
| `/api/health/slo` | GET | admin | GET /api/health/slo Internal SLO snapshot endpoint. Returns the current value, target, and within/breaching status for each committed SLO ov |

## Contact (1)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/contact` | POST | public |  |

## Events (1)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/events` | POST | member |  |

## Careers (3)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/careers/occupation/[onetCode]` | GET | public | If the DB title is missing or just the raw SOC code, fall back to the |
| `/api/careers/program-matches/[programSlug]` | GET | public |  |
| `/api/careers/recommend` | POST | public |  |

## Referral Sources (1)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/referral-sources` | GET | public | Partners first, then static sources |

## Onboarding (3)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/onboarding/complete` | POST | employer |  |
| `/api/onboarding/reset` | POST | super_admin |  |
| `/api/onboarding/tour-complete` | POST | employer |  |

## Organization (2)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/org/[slug]/settings` | GET, PUT | public |  |
| `/api/org/onboard` | POST | public | Validate domain is not already claimed |

## GDPR (3)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/gdpr/consent` | GET, PATCH | member | GET /api/gdpr/consent Returns the user's current consent preferences. PATCH /api/gdpr/consent Updates consent preferences. Body: { consentCo |
| `/api/gdpr/delete` | POST | member | POST /api/gdpr/delete Initiates account deletion for the authenticated user. Implements GDPR Article 17 — Right to erasure (right to be forg |
| `/api/gdpr/export` | GET | member | GET /api/gdpr/export Returns all personal data for the authenticated user. Implements GDPR Article 20 — Right to data portability. |

## Invites (2)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/invite/accept` | POST | public | Debug breadcrumbs for preview/Vercel logs (no PII). */ |
| `/api/invite/validate` | GET | public |  |

## Apply (3)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/apply/confirmation-email` | POST | public |  |
| `/api/apply/signup` | POST | public | Primary = [0]; up to 3 preferences in order */ |
| `/api/apply/status-lookup` | POST | public |  |

## Agent tools (1)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/agent-tools/v1/[tool]` | POST | short-lived provider bearer token | Read-only Lilley gateway. Accepts no tool arguments; identity, organization, role, agent, and allowed-tool scope come from the server-minted Upstash session. Supports only `get_my_next_step`, `get_training_status`, and `get_coursera_progress`; rechecks active tenant membership and fails closed if Redis is unavailable. When governed curriculum evidence is unavailable, member progress can still be returned, but approval and provider-availability claims are explicitly marked unavailable and must not be inferred. |

## Member (80)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/member/ai-history` | GET | member |  |
| `/api/member/application-ai-feedback` | POST | member |  |
| `/api/member/application-onboarding` | PATCH | member | Upserts program interest for onboarding (latest application or new draft row). |
| `/api/member/applications/[id]/messages` | GET, POST | member |  |
| `/api/member/applications/[id]` | PATCH, DELETE | member | Award points on the SAVED → real-application transition. Codex P2 catch |
| `/api/member/applications` | GET, POST | member | Award points only when the row represents a REAL application, not a |
| `/api/member/assessment/reset` | POST | member | POST /api/member/assessment/reset Allows a member to request a re-take of their skills assessment. - Records the reset request in Assessment |
| `/api/member/assessment/submit` | POST | member | Multi-program: counselor-created flag lives on the primary enrollment. |
| `/api/member/benefits/request` | POST | member |  |
| `/api/member/career-business-coach/completion` | POST | member |  |
| `/api/member/career-business-coach/voice-session` | POST | member | Legacy Lilley entry point. Returns a signed URL plus only the scoped secret tool token; no member-authored text enters Lilley's system prompt. |
| `/api/member/certifications/export` | GET | member |  |
| `/api/member/certifications` | GET, POST | member | Use the user-provided date if supplied and valid, otherwise default to now |
| `/api/member/certifications/upload` | POST | member | POST /api/member/certifications/upload Accepts a multipart/form-data upload with: - file: the certificate file (PDF/image) - certName: the c |
| `/api/member/coursera/auto-sync` | POST | member | POST /api/member/coursera/auto-sync Self-sync trigger fired from the `/dashboard` server render so a returning member with a valid Coursera  |
| `/api/member/coursera/enroll-in-course` | POST | member | POST /api/member/coursera/enroll-in-course Body: `{ courseraCourseId: string }` — that's all the client sends. The server resolves the activ |
| `/api/member/coursera/identity` | POST | member |  |
| `/api/member/coursera/launch` | GET | member | Use the same active-program resolution as `/dashboard/training` and |
| `/api/member/coursera/refresh-progress` | POST | member | Manual cache-bust for `/dashboard/training`. The page render path uses a 60s memo on per-learner B4B progress; this endpoint re-pulls with ` |
| `/api/member/coursera` | GET | member |  |
| `/api/member/courses/complete` | POST | member |  |
| `/api/member/dashboard-profile` | PATCH | member |  |
| `/api/member/delete-account` | POST | member | Soft-delete in app DB AND release the email from the unique |
| `/api/member/enroll` | POST | member | Multi-program: read enrolledByAdminId from the primary enrollment row |
| `/api/member/enrollments/[id]` | GET | member |  |
| `/api/member/enrollments/[id]/set-primary` | POST | member | POST /api/member/enrollments/{id}/set-primary Marks the given CourseEnrollment row as `isPrimary = true` for the calling user. The partial u |
| `/api/member/enrollments` | GET | member |  |
| `/api/member/goals/[id]` | PATCH, DELETE | member |  |
| `/api/member/goals` | GET, POST | member |  |
| `/api/member/interest-profiler/questions` | GET | member |  |
| `/api/member/interest-profiler/score` | POST | member | Persist to AIToolResult so /api/member/skill-profile can read it |
| `/api/member/interview-request` | POST | member | Award points (idempotent — fixed entityId means only the first request awards) |
| `/api/member/job-applications/[id]` | PATCH | member |  |
| `/api/member/job-applications/log-external` | POST | member | Log an external job application — Member Apply Loop. Per /plan-ceo-review (2026-04-26): the curated Job Board already has a working apply fl |
| `/api/member/job-applications` | GET, POST | member | GET: List user's job applications |
| `/api/member/job-applications/track-curated` | POST | member | Add a live curated job to the member Application Tracker without submitting an employer application. */ |
| `/api/member/learning-progress` | GET, POST | member |  |
| `/api/member/linkedin-enrich` | POST | member | POST /api/member/linkedin-enrich Body: { linkedinUrl: string } Enriches the member's skill profile from their LinkedIn public URL. IMPLEMENT |
| `/api/member/matched-jobs` | GET | member | GET /api/member/matched-jobs Returns top 5 active jobs matched to the current student's profile. |
| `/api/member/messages` | GET, POST, PATCH | member |  |
| `/api/member/nba/[id]` | PATCH | member | PATCH /api/member/nba/:id — update a DB-sourced next best action */ |
| `/api/member/notifications/[id]/read` | PUT | member |  |
| `/api/member/notifications/dismiss-all` | POST | member |  |
| `/api/member/notifications` | GET | member |  |
| `/api/member/pathway-steps/[pathwayId]/[stepIndex]/complete` | POST | member | Award points (idempotent per (pathway, step)) |
| `/api/member/pathway-steps/progress` | GET | member |  |
| `/api/member/pitch-deployments` | GET, POST | member |  |
| `/api/member/pre-screening/draft` | GET, PUT | member |  |
| `/api/member/pre-screening` | GET, POST | member |  |
| `/api/member/prep-bundle` | GET | member | GET /api/member/prep-bundle Returns the prep bundle data for display (no email sent). |
| `/api/member/prep-bundle/send` | POST | member | POST /api/member/prep-bundle/send Body: { memberEmail?: string, selectedToolTypes?: string[] } Sends selected AI tool results as a pre-inter |
| `/api/member/profile/completeness` | GET | member |  |
| `/api/member/profile` | GET, PATCH | member |  |
| `/api/member/program-change-request` | GET, POST | member |  |
| `/api/member/readiness` | GET | member |  |
| `/api/member/readiness/voice-session` | POST | member | POST — signed URL for career readiness voice coach. */ |
| `/api/member/request-help` | POST | member | Find assigned counselor |
| `/api/member/resources/[id]/download` | GET | member |  |
| `/api/member/resources/[id]/progress` | GET, POST | member | empty body ok |
| `/api/member/resources/progress` | GET | member |  |
| `/api/member/resume-coach/live-suggestions` | POST | member | POST — parse the in-progress voice transcript into live resume suggestions. Input: { transcript: Array<{ speaker: 'agent' \| 'user'; text: st |
| `/api/member/resume-coach/parse-suggestions` | POST | member | POST — parse voice coach transcript into structured resume suggestions. Input: { transcript: Array<{ speaker: 'agent' \| 'user'; text: string |
| `/api/member/resume-coach/session` | POST | member | Align with `getMemberResumePlainText` (substantive extract). Below this, treat as no usable resume text for voice branching. */ |
| `/api/member/resume/docx-html` | POST | member | Converts stored DOC/DOCX to HTML for same-origin inline preview (iframe srcDoc + sandbox). POST /api/member/resume/docx-html?variant=origina |
| `/api/member/resume/generate` | POST | member | optional body |
| `/api/member/resume/plain-text` | POST | member | Persists the member's live resume draft as plain text (coach workspace, tooling). Stored alongside generated resumes as `resume-enhanced.txt |
| `/api/member/resume/preview` | GET | member | Same-origin PDF/DOC binary for inline preview (avoids cross-origin iframe issues with signed Supabase URLs). GET /api/member/resume/preview? |
| `/api/member/resume` | GET | counselor | Plain text extracted from stored resume (PDF/DOCX/TXT). Use for tools; omit unless `includePlainText`. */ |
| `/api/member/resume/upload` | POST | member | Create bucket `member-resumes` in Supabase Dashboard → Storage if it does not exist (private bucket is fine). */ |
| `/api/member/settings` | PATCH | member |  |
| `/api/member/signup` | POST | public | Route handler - cookies set by middleware on redirect |
| `/api/member/skill-assessment` | POST | member |  |
| `/api/member/skill-profile` | GET | member | GET /api/member/skill-profile Returns the member's skill profile as radar axes, sourced from: 1. Certifications → mapped to skill axes via c |
| `/api/member/voice-interview/recording` | GET, POST | member | Same private bucket as resumes; path prefix isolates mock interview videos. */ |
| `/api/member/voice-interview/session` | POST | member | POST — signed URL for voice mock interview with role / style context. */ |
| `/api/member/voice-interview/transcript` | POST | member |  |
| `/api/member/voice-session/checkpoint` | POST | member | Lightweight checkpoint endpoint for voice sessions. Saves transcript without AI processing (no action-plan generation, no emails). Used for  |
| `/api/member/weekly-recap` | GET, POST | member |  |
| `/api/member/wioa-qualification` | GET, POST | member |  |
| `/api/member/wioa-qualification/voice-session` | POST | member | POST — signed URL for WIOA pre-qualification voice guide. */ |

## Counselor (19)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/counselor/dashboard` | GET | counselor | GET /api/counselor/dashboard Returns the counselor's dashboard data in a single batched query. Optimizations vs page-level fetching: - Membe |
| `/api/counselor/feedback` | POST | member | Try Anthropic first |
| `/api/counselor/inactive-members` | GET | admin | GET /api/counselor/inactive-members?days=7\|14\|30 Returns members (role='member') who haven't had a dashboard_viewed event in N days. Counsel |
| `/api/counselor/members/[memberId]/activity-timeline` | GET | counselor | GET /api/counselor/members/:memberId/activity-timeline?limit=20 Returns recent member events for the activity timeline in the at-risk detail |
| `/api/counselor/members/[memberId]/award-points` | POST | counselor |  |
| `/api/counselor/members/[memberId]/messages` | GET, POST, PATCH | counselor | Track A — Tenant Isolation Hardening (Sprint A.2 batch 5). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Every memb |
| `/api/counselor/members/[memberId]/notes` | GET, POST, DELETE | counselor | Track A — Tenant Isolation Hardening (Sprint A.2 batch 3). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The member |
| `/api/counselor/members/[memberId]/resume/docx-html` | POST | member | DOC/DOCX → HTML for same-origin iframe preview. POST /api/counselor/members/:memberId/resume/docx-html?variant=original\|enhanced |
| `/api/counselor/members/[memberId]/resume/preview` | GET | member | Same-origin PDF/DOC binary for inline preview (counselor / admin viewing assigned member). GET /api/counselor/members/:memberId/resume/previ |
| `/api/counselor/members/[memberId]/resume` | GET | member | GET — resume metadata + signed URLs for assigned counselor / admin (same shape as `/api/member/resume`). */ |
| `/api/counselor/members/[memberId]` | GET | counselor | GET /api/counselor/members/[memberId] Returns a single member's full detail view for the counselor portal. Optimization: all related records |
| `/api/counselor/nudge` | POST | member | Track A — Tenant Isolation Hardening (Sprint A.2 batch 5). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The member |
| `/api/counselor/placements` | GET, POST | counselor | GET /api/counselor/placements Returns all placement records. Counselor/admin only. Query params: memberId, employerName, days (recent N days |
| `/api/counselor/remind-member` | POST | member | Track A — Tenant Isolation Hardening (Sprint A.2 batch 5). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The member |
| `/api/counselor/session` | POST | authenticated; staff mode requires counselor/admin | Returns a signed ElevenLabs URL. Member/default mode selects reviewed Lilley and returns only a scoped secret tool token; account/program truth is read through the tenant-scoped gateway, not prompt variables. Explicit `audience: "staff"` is role-gated, requires `ELEVENLABS_COUNSELOR_STAFF_AGENT_ID`, and returns 503 while that dedicated agent is not configured. |
| `/api/counselor/sessions/email-packet` | POST | member | Track A - Tenant Isolation Hardening (Sprint A.2 batch 5). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Member exi |
| `/api/counselor/sessions/upload-resume` | POST | super_admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 5). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The member |
| `/api/counselor/sessions/voice-walkthrough` | POST | member | Track A — Tenant Isolation Hardening (Sprint A.2 batch 5). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The member |
| `/api/counselor/sessions/walk-in` | POST | super_admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 5). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The new wa |

## Employer (20)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/employer/applications/[id]/messages` | GET, POST, PATCH | employer | Mark applicant messages as read for the employer viewer. */ |
| `/api/employer/applications/[id]` | PATCH | super_admin | PATCH /api/employer/applications/[id] Employer updates an applicant's status and notes. |
| `/api/employer/applications` | GET | employer |  |
| `/api/employer/checkout` | POST | employer |  |
| `/api/employer/hiring-intents` | GET, POST | employer |  |
| `/api/employer/jobs/[id]/applicants` | GET, PATCH | employer |  |
| `/api/employer/jobs/[id]/matches/[studentId]` | PATCH | employer |  |
| `/api/employer/jobs/[id]/matches` | GET | employer |  |
| `/api/employer/jobs/[id]` | GET, PATCH, DELETE | employer | Notify admin when job is submitted for review (draft/closed → pending) |
| `/api/employer/jobs/bulk-delete` | POST | employer | Jobs employers may remove in bulk (not visible on the public board). */ |
| `/api/employer/jobs/import-bulk` | POST | employer |  |
| `/api/employer/jobs/import` | POST | employer | Fall through to error |
| `/api/employer/jobs` | GET, POST | employer |  |
| `/api/employer/logo` | POST | employer |  |
| `/api/employer/messages` | GET, POST, PATCH | employer |  |
| `/api/employer/onboarding-profile` | PATCH | employer |  |
| `/api/employer/settings` | PATCH | employer |  |
| `/api/employer/signup` | POST | public | Route handler - cookies set by middleware on redirect |
| `/api/employer/voice-session` | POST | employer | POST — signed URL for employer ElevenLabs agent (hiring / portal help). */ |
| `/api/employer/webhook` | POST | webhook |  |

## Partner (19)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/partner/connect` | POST | partner |  |
| `/api/partner/dashboard` | GET | partner | GET /api/partner/dashboard Returns partner stats, referrals, and earnings summary. |
| `/api/partner/earnings` | GET | partner | GET /api/partner/earnings Returns earnings / payout data for the partner. |
| `/api/partner/export/referrals` | GET | partner |  |
| `/api/partner/invitations` | POST | partner |  |
| `/api/partner/members/needs-attention` | GET | partner |  |
| `/api/partner/members` | GET | partner | GET /api/partner/members Returns members referred by the partner. |
| `/api/partner/messages` | GET, POST, PATCH | partner |  |
| `/api/partner/milestones` | GET | partner |  |
| `/api/partner/onboarding-profile` | PATCH | partner |  |
| `/api/partner/outreach` | GET, POST | partner |  |
| `/api/partner/payout` | POST | admin |  |
| `/api/partner/referral-members` | GET | partner | Lightweight list for outreach logging dropdowns. */ |
| `/api/partner/referrals/[memberId]` | PATCH | partner |  |
| `/api/partner/referrals` | GET, POST | partner | GET /api/partner/referrals Returns referral list with status. |
| `/api/partner/settings/notifications` | PATCH | partner | PATCH /api/partner/settings/notifications Updates partner notification preferences. Only the fields provided in the request body are updated |
| `/api/partner/signup` | POST | public |  |
| `/api/partner/team-assign` | GET | partner | Partner portal users eligible as referral owners (same partner). */ |
| `/api/partner/voice-session` | POST | partner | POST — signed URL for partner-facing voice assistant. Requires `ELEVENLABS_PARTNER_AGENT_ID`. */ |

## Mentor (4)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/mentor/letter` | GET | member | GET /api/mentor/letter?mentorId=xxx Returns a simple HTML volunteer hour letter for the mentor to print/save as PDF. The mentor must be the  |
| `/api/mentors/[id]/sessions` | GET, POST | member |  |
| `/api/mentors/apply` | POST | member | If logged in, create mentor record linked to user; otherwise store anonymous application |
| `/api/mentors` | GET | public |  |

## Admin (136)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/admin/analytics/ai-efficacy` | GET | admin | Only zero-out time for computed defaults; leave parsed dates as-is |
| `/api/admin/analytics/dashboard` | GET | admin |  |
| `/api/admin/analytics/members` | GET | admin |  |
| `/api/admin/analytics/placements` | GET | admin |  |
| `/api/admin/analytics/programs` | GET | admin |  |
| `/api/admin/blog/[id]` | GET, PATCH, DELETE | admin |  |
| `/api/admin/blog/ai/draft` | POST | admin |  |
| `/api/admin/blog/ai/from-ideas` | POST | admin | mode === 'draft' |
| `/api/admin/blog/ai/review` | POST | admin |  |
| `/api/admin/blog/ai/suggest-topics` | POST | admin |  |
| `/api/admin/blog/generate` | POST | admin |  |
| `/api/admin/blog` | POST | admin |  |
| `/api/admin/cohort-export` | GET | admin | GET /api/admin/cohort-export?program=<slug> Cohort CSV for grant reporting (e.g. WIOA). Lists every member in a given program with placement |
| `/api/admin/counselors` | GET, POST | admin |  |
| `/api/admin/coursera/auto-heal` | GET, POST | admin | Surface a flat number the admin UI can show in the success toast. |
| `/api/admin/coursera/b4b-bindings-suggestions` | GET | super_admin | GET /api/admin/coursera/b4b-bindings-suggestions Returns name-match suggestions between the static `PROGRAMS` catalog and the live B4B progr |
| `/api/admin/coursera/b4b-programs` | GET | admin | GET /api/admin/coursera/b4b-programs Returns every Coursera B4B program known to our org via `listPrograms()`. This is what an admin needs t |
| `/api/admin/coursera/backfill-xapi` | GET, POST | admin |  |
| `/api/admin/coursera/canonical-course-mappings` | POST, DELETE | admin | Validate the canonical pair actually exists in the program defs so admins |
| `/api/admin/coursera/csv-import` | POST | admin | Cheap pre-flight on Content-Length when present. |
| `/api/admin/coursera/ignored-xapi-summary` | GET | super_admin | GET /api/admin/coursera/ignored-xapi-summary Diagnostic for the most common cause of a stuck Coursera pipeline: inbound xAPI events whose `c |
| `/api/admin/coursera/inspect-by-email` | GET | admin | GET /api/admin/coursera/inspect-by-email?email=<email> Admin-only "deep inspect" by email. Joins, in one response, every system that knows a |
| `/api/admin/coursera/map-unmatched` | POST | admin | Inline "Map to WAP user" action used from the Coursera-only learners list. Combines two side effects in one round-trip: 1. Upsert a coursera |
| `/api/admin/coursera/mappings` | GET, POST | admin | Re-process unmatched xAPI events that might now match this mapping. |
| `/api/admin/coursera/reconcile/add-to-wap` | POST | super_admin | POST /api/admin/coursera/reconcile/add-to-wap Body: { email: string; fullName?: string; courseraExternalId: string; programId: string; // Co |
| `/api/admin/coursera/reconcile` | GET | admin | GET /api/admin/coursera/reconcile?programId=<courseraProgramId>&limit=<n> Reconciliation report between Coursera For Business roster and the |
| `/api/admin/coursera/seed-canonical-mappings-from-b4b` | POST | super_admin | POST /api/admin/coursera/seed-canonical-mappings-from-b4b Companion to `seed-canonical-mappings-from-catalog` that pulls the live B4B progra |
| `/api/admin/coursera/seed-canonical-mappings-from-catalog` | POST | super_admin | POST /api/admin/coursera/seed-canonical-mappings-from-catalog One-click action that walks the program catalog (`courses` table) and upserts  |
| `/api/admin/coursera/self-test` | GET | admin | A short payload preview if the call succeeded. */ |
| `/api/admin/coursera/sync-b4b` | POST | admin | POST /api/admin/coursera/sync-b4b One-time admin trigger: pulls all enrollment reports from Coursera B4B API and writes/upserts them into Co |
| `/api/admin/coursera/sync-progress` | POST | admin | POST /api/admin/coursera/sync-progress Two-phase admin-triggered training sync: 1. Replay any pending xAPI statements that haven't been proc |
| `/api/admin/coursera/sync-user-from-b4b` | POST | super_admin | POST /api/admin/coursera/sync-user-from-b4b Body: { email: string } Pulls authoritative enrollment data for a single learner from Coursera F |
| `/api/admin/email-crons/[id]/dry-run` | POST | admin | POST /api/admin/email-crons/[id]/dry-run Simulates a cron job execution without sending real emails. Returns: recipient count, sample recipi |
| `/api/admin/email-crons/[id]/preview` | GET | admin | GET /api/admin/email-crons/[id]/preview Returns the would-receive recipient list for a cron job without sending anything. Uses the same DB q |
| `/api/admin/email-crons/[id]/template-preview` | GET | admin |  |
| `/api/admin/email-crons/[id]/toggle` | POST | admin | POST /api/admin/email-crons/[id]/toggle Body: { enabled: boolean } Soft-enables or disables a cron by writing a WorkflowDiagnostic entry wit |
| `/api/admin/email-crons/[id]/trigger` | POST | cron | POST /api/admin/email-crons/[id]/trigger Manually triggers a cron job by forwarding the request to its API path with the CRON_SECRET header. |
| `/api/admin/email-crons/activate-all` | POST | admin | POST /api/admin/email-crons/activate-all Writes an "enabled: true" toggle record for every registered cron so the admin console and cron sof |
| `/api/admin/email-crons` | GET | admin | GET /api/admin/email-crons Returns all cron definitions enriched with: - lastRunAt: timestamp of most recent WorkflowDiagnostic entry - last |
| `/api/admin/employer-context` | GET, POST | super_admin | Super-admin only: choose which employer portal company to view (or clear). */ |
| `/api/admin/employer-screening-packs/[id]` | PATCH, DELETE | admin |  |
| `/api/admin/employer-screening-packs` | GET, POST | admin |  |
| `/api/admin/employers/[id]/deactivate` | POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 2). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Both the l |
| `/api/admin/employers/[id]/reactivate` | POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 2). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Both the l |
| `/api/admin/employers/[id]/tier` | PATCH | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 2). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Both the l |
| `/api/admin/employers` | GET, POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 1). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Migrated t |
| `/api/admin/export/members` | GET | admin | GET /api/admin/export/members State-agnostic member training export for workforce reporting. Supports query-param filters: state, stage, pro |
| `/api/admin/funder-program-summary` | GET | admin | GET /api/admin/funder-program-summary Program-level CSV for grant / funder reporting (enrollment, 30-day activity, training completion, plac |
| `/api/admin/invites/[id]/resend` | POST | admin | Persist new token before emailing so the message never contains a token that is not in the DB. |
| `/api/admin/invites/[id]/revoke` | PATCH | admin |  |
| `/api/admin/invites` | GET, POST | admin | Invitation row already exists — return 200 so admins can copy/share the link |
| `/api/admin/jobs/[id]/approve` | POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 3). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The `job.f |
| `/api/admin/jobs/[id]/matches` | GET | admin |  |
| `/api/admin/jobs/[id]/reject` | POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 3). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The `job.f |
| `/api/admin/jobs/[id]` | GET | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 2). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The `job.f |
| `/api/admin/jobs/[id]/suggest-matches` | POST | admin |  |
| `/api/admin/jobs` | GET | admin | Reference migration for Track A — Tenant Isolation Hardening (Sprint A.1). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION |
| `/api/admin/lifecycle/drift` | GET | admin | Admin drift detection endpoint. Returns members where User.enrolledProgram and CourseEnrollment.programSlug are out of sync. Two categories: |
| `/api/admin/lifecycle/member/[id]` | GET | admin | Admin lifecycle timeline for a single member. Returns: - User enrollment state (enrolledProgram, enrolledAt) and canonical training progress |
| `/api/admin/members/[id]/award-points` | POST | counselor |  |
| `/api/admin/members/[id]/counselor` | POST | admin |  |
| `/api/admin/members/[id]/coursera-enrollment-approval` | PATCH | admin | PATCH /api/admin/members/[id]/coursera-enrollment-approval Body: `{ approved: boolean }` Admin-only toggle for the Coursera enrollment eligi |
| `/api/admin/members/[id]/delete` | POST | admin | Soft-delete the Prisma row AND release the email from the unique |
| `/api/admin/members/[id]/edit-profile` | PATCH | admin | PATCH /api/admin/members/[id]/edit-profile Admin can update basic member profile fields. |
| `/api/admin/members/[id]/enrollment-funding` | POST | admin | Multi-program: funding/workspace metadata lives on the primary |
| `/api/admin/members/[id]/interview` | PATCH | admin |  |
| `/api/admin/members/[id]/messages` | GET, POST, PATCH | admin |  |
| `/api/admin/members/[id]/notes` | GET, POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 3). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The pre-wr |
| `/api/admin/members/[id]/partner` | PATCH | admin | Clear with null; empty string from forms coerces to null */ |
| `/api/admin/members/[id]/pipeline-stage` | PATCH | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 3). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. The findFi |
| `/api/admin/members/[id]/placed-outcome` | POST | admin | POST /api/admin/members/[id]/placed-outcome Unified placement write — updates PlacementRecord (canonical) AND PlacedOutcome (legacy, kept in |
| `/api/admin/members/[id]/program` | PATCH | admin | Multi-program: admin "set program" picks the user's primary |
| `/api/admin/members/[id]/readiness` | GET, PATCH | admin |  |
| `/api/admin/members/[id]/reset-assessment` | POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 3). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Switched t |
| `/api/admin/members/[id]/reset-password` | POST | super_admin | POST /api/admin/members/[id]/reset-password Sends a password-reset email to the member via Supabase Auth. Super-admin only. Track A — Tenant |
| `/api/admin/members/[id]/resume-urls` | GET | admin |  |
| `/api/admin/members/[id]/status` | PATCH | admin | Best-effort: send enrollment confirmation / rejection emails to member |
| `/api/admin/members/[id]/subgroup` | POST, DELETE | admin |  |
| `/api/admin/members/[id]/upload-resume` | POST | admin | Create bucket "member-resumes" in Supabase Dashboard → Storage if it does not exist |
| `/api/admin/members/[id]/wioa-review` | PATCH | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 3). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Both the l |
| `/api/admin/members/[id]/workspace-email` | POST, DELETE | admin | tolerate empty/invalid body — requestedLocalPart is optional |
| `/api/admin/members/at-risk` | GET, PATCH | admin | GET /api/admin/members/at-risk?threshold=50&limit=20 Returns at-risk members sorted by score descending. Requires admin or counselor role. |
| `/api/admin/members/create` | POST | admin | Try invite first (sends set-password email). Fall back to createUser if invite not supported. |
| `/api/admin/members/duplicates` | GET | admin | GET /api/admin/members/duplicates Returns groups of active (non-deleted) members who share the same lower-case email. Each group sorted by c |
| `/api/admin/members/enhance-resume` | POST | admin |  |
| `/api/admin/members/merge` | POST | admin | POST /api/admin/members/merge Body: { primaryId: string, secondaryId: string } Merges secondary member into primary: 1. Repoints foreign-key |
| `/api/admin/members/parse-resume` | POST | admin |  |
| `/api/admin/members` | GET | admin | List members for admin (e.g. subgroup add-member search). Supports ?q= for search, ?limit= for max results. */ |
| `/api/admin/mentors/[id]` | PATCH | admin |  |
| `/api/admin/messages/stats` | GET | super_admin |  |
| `/api/admin/messages/thread/[threadId]` | GET | super_admin |  |
| `/api/admin/messages/thread/[threadId]/staff` | POST, PATCH | super_admin |  |
| `/api/admin/messages/threads` | GET, POST | super_admin | POST /api/admin/messages/threads Body: { memberId: string } Creates or retrieves the member's counselor thread so admin can message them. |
| `/api/admin/metrics` | GET | admin |  |
| `/api/admin/onet/auto-match` | GET | admin | GET /api/admin/onet/auto-match?onetCode=xx-xxxx.xx Returns a scored list of WorkforceAP program matches for the given O*NET occupation code, |
| `/api/admin/onet/mappings` | GET, POST, DELETE | admin | Subset of CareerProgramMapping serialized into AuditLog metadata for compliance / before-after comparisons. Stays small and stable on purpos |
| `/api/admin/onet/search` | GET | admin |  |
| `/api/admin/onet/sync` | POST | admin |  |
| `/api/admin/organization/logo` | POST | admin |  |
| `/api/admin/outcomes` | GET | admin |  |
| `/api/admin/outcomes/snapshot` | GET | super_admin | GET /api/admin/outcomes/snapshot?period=all-time\|ytd\|q-current\|q-prev Single-page Markdown summary of every external-facing outcome metric.  |
| `/api/admin/partner-context` | GET, POST | super_admin | Super-admin only: choose which partner portal to view (or clear). */ |
| `/api/admin/partner-payouts` | GET | admin |  |
| `/api/admin/partners/[id]/deactivate` | POST | admin |  |
| `/api/admin/partners/[id]/invite` | POST | admin |  |
| `/api/admin/partners/[id]/reactivate` | POST | admin |  |
| `/api/admin/partners/[id]` | PATCH | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 2). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Reads/writ |
| `/api/admin/partners/invite` | POST | admin |  |
| `/api/admin/partners` | GET, POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 1). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Reads agai |
| `/api/admin/pipeline/at-risk-stats` | GET | counselor | GET /api/admin/pipeline/at-risk-stats Returns at-risk alert stats for the admin pipeline dashboard: - criticalCount: number of CRITICAL at-r |
| `/api/admin/pipeline` | GET | counselor | Stage 7: Placed |
| `/api/admin/pipeline/surveys` | GET | counselor | GET /api/admin/pipeline/surveys Returns placement survey response stats and at-risk placements (no response after 7 days past survey send). |
| `/api/admin/placement-surveys/resend` | POST | counselor | POST /api/admin/placement-surveys/resend Manually re-send a placement survey for a given placementId. Finds the most recent pending survey f |
| `/api/admin/placement-surveys` | GET | admin | GET /api/admin/placement-surveys Admin API: view all placement survey results. Query params: ?status=completed\|pending&limit=50&offset=0 |
| `/api/admin/placements` | GET, POST, PATCH | counselor |  |
| `/api/admin/program-change-requests/[id]` | PATCH | admin | Approving a counselor-initiated program-change request is a strong |
| `/api/admin/program-change-requests` | GET | admin |  |
| `/api/admin/programs/catalog` | GET, POST, PATCH | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 2). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. All Prisma |
| `/api/admin/programs/export-twc` | GET | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 4). The TWC catalog export goes through `withTenantScope` so an admin from Org A only |
| `/api/admin/reports/quarterly-outcomes` | GET | admin |  |
| `/api/admin/reports/wioa/generate` | GET, POST | admin | In-memory store for the last generated WIOA report. MVP — no DB table needed. Survives as long as the lambda is warm. |
| `/api/admin/reports/wioa` | GET | admin |  |
| `/api/admin/search` | GET | admin | GET /api/admin/search?q=keyword&limit=8 Fast cross-entity search for admin global search (Cmd+K). Searches members (name/email), employers ( |
| `/api/admin/settings/organization` | GET, PATCH | admin |  |
| `/api/admin/subgroups/[id]/members` | GET | admin |  |
| `/api/admin/subgroups/[id]` | PATCH, DELETE | admin |  |
| `/api/admin/subgroups` | GET, POST | admin |  |
| `/api/admin/testimonials/[id]` | PATCH, DELETE | admin | PATCH /api/admin/testimonials/[id] Admin API: update testimonial status (approve/reject/publish), content, rating, etc. Body: { status?, con |
| `/api/admin/testimonials` | GET | counselor | GET /api/admin/testimonials Admin/counselor API: list testimonials with filtering by status. Query params: ?status=pending\|approved\|rejected |
| `/api/admin/training-progress/items` | GET | admin | Per-item Coursera progress drill-down for /admin/training-progress. Returns one row per `(course_item_id)` for a given (learner, course) pai |
| `/api/admin/users/[id]/free-email` | POST | admin | Rewrite a soft-deleted user's email to the sentinel form so the original address is freed for re-signup. Idempotent — does nothing if the em |
| `/api/admin/users/[id]/reset-password` | POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 3). The `user.findUnique` goes through `withTenantScope` so an admin from Org A canno |
| `/api/admin/users/[id]/restore` | POST | admin | Restore a soft-deleted user. Clears `deletedAt` and, if the email was rewritten to the sentinel form by the delete route or the "free email" |
| `/api/admin/users/[id]` | PATCH, DELETE | super_admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 4). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. Both DELET |
| `/api/admin/users/free-deleted-emails` | POST | admin | Batch-rewrite every soft-deleted user's email to the sentinel form if it isn't already. Backfills the deletes that happened before #757 adde |
| `/api/admin/users` | GET, POST | admin | Track A — Tenant Isolation Hardening (Sprint A.2 batch 4). See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`. GET/POST m |

## AI Tools (18)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/ai/cover-letter` | POST | member | Resolve subject (counselor/admin In-Office Session — see actAsSubject). |
| `/api/ai/elevator-pitch` | POST | member | POST /api/ai/elevator-pitch Body: { name, targetRole, strengths, certifications, industry, language } Returns: { pitch: string, emailSent?:  |
| `/api/ai/export-pdf` | POST | member | POST /api/ai/export-pdf Body: { text: string, title?: string, toolName?: string, chartImage?: string, chartData?: RadarChartData } Returns:  |
| `/api/ai/extract-resume-skills` | POST | member | POST /api/ai/extract-resume-skills Uses AI to extract skills from the member's resume and score them across the 6 radar axes: Analytics, Eng |
| `/api/ai/extract-resume-text` | POST | member |  |
| `/api/ai/gap-analyzer` | POST | member |  |
| `/api/ai/interview-practice` | POST | member | Resolve subject FIRST so we know who to prefill for |
| `/api/ai/interview-voice` | POST | member | POST /api/ai/interview-voice Generate AI interviewer voice audio using ElevenLabs. Used by the Interview Simulator for text-to-speech. Body: |
| `/api/ai/interview/response` | POST | member |  |
| `/api/ai/interview/results` | GET | member | Fallback when AI is unavailable |
| `/api/ai/interview/start` | POST | member | In-memory session store (replace with Redis/DB for production) |
| `/api/ai/job-match-scorer` | POST | member | Extract job description from URL using provider-aware logic. Tier 1: Use ATS provider APIs (Greenhouse, Lever, Ashby) for known job URLs Tie |
| `/api/ai/linkedin-about` | POST | member |  |
| `/api/ai/linkedin-headline` | POST | member |  |
| `/api/ai/resume-rewriter` | POST | member | Resolve subject FIRST so we know who to prefill for |
| `/api/ai/resume-strength` | POST | member |  |
| `/api/ai/salary-negotiation` | POST | member |  |
| `/api/ai/skill-mapper` | GET | member | GET /api/ai/skill-mapper?occupation=software+developer Search O*NET occupations and return skill data for the Skill Mapper radar chart. GET  |

## Interview (2)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/interview/history` | GET, POST | member | Try Anthropic first |
| `/api/interview/session` | POST | member | POST /api/interview/session Two modes: 1. ElevenLabs voice: returns a signed conversation URL when ELEVENLABS_API_KEY is set 2. Groq text fa |

## Subgroup (3)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/subgroup/dashboard` | GET | member |  |
| `/api/subgroup/members/[id]` | GET | member |  |
| `/api/subgroup/members` | GET | member |  |

## Portal (1)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/portal/nav-badges` | GET | member | Private per-user counts; short TTL reduces duplicate work when tab refetches. |

## Placement Survey (1)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/placement-survey` | GET, POST | public | POST /api/placement-survey Member submits their post-placement survey. Auth is by signed token delivered in the email link (NOT body userId  |

## Cron Jobs (20)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/cron/applicant-followup` | GET, POST | cron | Cron endpoint to send Day 3 follow-up emails to applicants. Finds applications submitted 3+ days ago with status still PENDING. Also pings a |
| `/api/cron/at-risk-alerts` | GET, POST | cron | POST /api/cron/at-risk-alerts Daily counselor alert batcher. Runs after the main at-risk-check cron (which scores members and persists alert |
| `/api/cron/at-risk-check` | GET, POST | cron | Nightly at-risk check — run via cron at 6 AM UTC. Scores active members, persists alerts, sends counselor/admin digest email. Vercel Cron us |
| `/api/cron/coursera-auto-heal` | GET, POST | cron | GET / POST /api/cron/coursera-auto-heal Hourly maintenance pass that does two things: 1. Heal unmatched `coursera_xapi_events` rows: looks u |
| `/api/cron/coursera-b4b-sync` | GET, POST | cron | GET /api/cron/coursera-b4b-sync Recurring cron that: 1. Pulls Coursera B4B enrollment reports → CourseProgress 2. Refreshes canonical course |
| `/api/cron/coursera-sync` | GET, POST | cron | GET/POST /api/cron/coursera-sync Active-pull cron that polls Coursera Enterprise for each WAP member's skillset progress and persists a snap |
| `/api/cron/coursera-training-sync` | GET | cron | GET /api/cron/coursera-training-sync Hourly: replay pending xAPI rows into `CourseProgress`. Skillset progress is pulled by `/api/cron/cours |
| `/api/cron/deploy-health` | GET, POST | cron | Hourly Vercel deploy health check. Queries the Vercel API to verify the latest production deployment is in READY state. If the Vercel API to |
| `/api/cron/inactive-nudge` | GET, POST | cron | Cron endpoint to send inactive member nudge emails. Run daily (e.g. via Vercel Cron: "0 10 * * *" for 10 AM). Sends to members inactive for  |
| `/api/cron/inactivity-nudge` | GET, POST | cron | POST /api/cron/inactivity-nudge Sends a re-engagement nudge to members who have been inactive for 14+ days. Capped at 100/run to avoid spam. |
| `/api/cron/interview-reminders` | GET | cron | Daily: (1) ~24h before nextInterviewDate — prep reminder; (2) ~24h after — debrief prompt. Uses JobApplication.nextInterviewDate. Protected  |
| `/api/cron/milestone-celebration` | GET, POST | cron | GET /api/cron/milestone-celebration Sends a celebration email when a member completes all courses in their program. Runs daily to catch comp |
| `/api/cron/partner-outcome-digest` | GET, POST | cron | Weekly digest for referral partners: referral counts by stage + weekly wins. Protected with CRON_SECRET. Vercel schedule: Monday 8am CT (see |
| `/api/cron/placement-survey` | GET, POST | cron | POST /api/cron/placement-survey Daily cron: sends 30/60/90-day placement surveys and escalates non-responders to counselors. Idempotent per  |
| `/api/cron/smoke-test` | GET, POST | cron | Seven-probe hourly journey smoke: validates liveness/readiness JSON, login/program markers, and final same-origin login redirects for dashboard/admin/counselor. Returns 503 when a probe fails or exceeds 8 seconds. |
| `/api/cron/stale-training-check` | GET | cron | GET /api/cron/stale-training-check Daily: members with `CourseEnrollment` but no fresh `CourseProgress` (7d) get `User.staleTrainingDetected |
| `/api/cron/verification` | GET, POST | cron | Daily verification that member-facing cron jobs actually executed. Checks cron run logs against schedule-aware freshness windows. Daily cron |
| `/api/cron/weekly-recap-email` | GET, POST | cron | Cron endpoint to send weekly admin recap email. Runs Friday 4 PM CT (10 PM UTC: "0 22 * * 5"). Gathers: new applicants, placements, at-risk  |
| `/api/cron/weekly-recap` | GET, POST | cron | GET /api/cron/weekly-recap Sends weekly recap emails to all active members who have not received one this week. Secured by CRON_SECRET heade |
| `/api/cron/wioa-report` | GET, POST | cron | GET /api/cron/wioa-report Monthly WIOA grant reporting cron. Runs 1st of every month at 9:00 AM CT (14:00 UTC). Generates the previous month |

## Webhooks (2)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/webhooks/coursera` | POST | webhook | Coursera REST completion / progress webhook. **Retry semantics:** Coursera may retry on non-2xx responses. Return 2xx only after durable wor |
| `/api/webhooks/learning-completion` | POST | public |  |

## xAPI (4)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/xapi/about` | GET | public |  |
| `/api/xapi/config` | GET, POST | public |  |
| `/api/xapi/oauth/token` | GET, POST | public |  |
| `/api/xapi/statements` | GET, POST | public | xAPI ingest (Coursera → WorkforceAP) Ops quick ref (set `ENABLE_ANALYTICS_LOGS=true` for batch console lines from `trackXapiBatchProcessed`) |

## Stripe (1)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/stripe/webhook` | POST | webhook |  |

## Test (1)

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/test/xapi-access-token` | GET | public | Issues a short-lived HS256 xAPI access token using the same secret as `/api/xapi/oauth/token`. **Never enable in production.** Enabled when  |

## Coverage Gaps

- **142 routes** lack a JSDoc or inline description comment.
- **1 routes** have no detectable exported HTTP method (may re-export from a handler utility).
- Auth classification is heuristic based on import/function name detection. Verify critical routes manually, especially those using custom middleware patterns.
