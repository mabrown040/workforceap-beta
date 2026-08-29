# Coursera End-to-End Member Experience — WorkforceAP Research Report
**Generated:** 2026-05-06  
**Scope:** Current implemented flow, gaps, unknowns, public docs research, and recommended operating model.

---

## 1. Current Implemented Flow (Confirmed in Code)

### 1.1 Member Launch Path
```
Member clicks "Open Coursera" or per-course "Open in Coursera"
  → GET /api/member/coursera/launch?course=<optional-slug>
  → Auth check (redirects to /login if unauthenticated)
  → Resolves enrolledProgram from User.enrolledProgram
  → Build launch URL via buildCourseraLaunchUrl()
  → Redirects to Coursera
```

**Launch URL resolution order (from `lib/coursera/configCore.ts`):**
1. **Course-specific deep link** — if `?course=<slug>` is provided AND a `courseraSlug` exists in the org-configured `Course` table, redirects to `https://www.coursera.org/{urlType}/{courseraSlug}`
2. **Discovered catalog deep link** — if slug matches `DISCOVERED_COURSERA_PROGRAMS`, constructs `https://www.coursera.org/programs/{programSlug}/learn/{courseSlug}`
3. **Configured template URL** — if `COURSERA_COURSE_URL_TEMPLATE` or `COURSERA_PROGRAM_URL_TEMPLATE` env vars are set, interpolates `{courseId}`, `{programId}`, `{userId}`, `{email}`
4. **Program home URL** — if `COURSERA_PROGRAM_HOME_URL` env var is set
5. **Discovered public program URL** — from `DISCOVERED_COURSERA_PROGRAMS[programSlug].publicProgramUrl`
6. **Generic fallback** — `https://www.coursera.org` (avoids 404s)

**Current prod gap:** The launch route falls back to public Coursera until `COURSERA_PROGRAM_HOME_URL` or templates are configured (`docs/coursera-prep.md` notes this explicitly).

### 1.2 Progress Intake Paths (Four parallel mechanisms)

| Mechanism | Direction | Frequency | Data | Status |
|-----------|-----------|-----------|------|--------|
| **xAPI statements** | Coursera → WAP | Realtime (when configured) | Course completion, progress % | ✅ Implemented |
| **REST webhook** | Coursera → WAP | Realtime (when subscribed) | Course completion, progress % | ✅ Implemented |
| **CSV import** | Manual admin → WAP | On-demand / daily | Full learner activity snapshot | ✅ Implemented |
| **Active-pull cron** | WAP → Coursera | Every 6h (`0 */6 * * *`) | Skillset progress % | ✅ Implemented, but **short-circuits** if no skillset IDs configured |

### 1.3 xAPI Ingest Detail

**WAP exposes to Coursera:**
- `POST /api/xapi/oauth/token` — Client credentials OAuth (Basic auth, returns Bearer)
- `POST /api/xapi/statements` — Batch statement intake
- `GET /api/xapi/about` — Minimal LRS about endpoint
- `GET /api/xapi/config` — Debug/readiness

**Statement parsing (`lib/xapi/statementModel.ts`):**
- Learner identity from `actor.mbox` (`mailto:email@example.com`)
- Completion detected when `verb.id` contains `completed`/`passed`, or `result.completion === true`, or `result.success === true`
- Course matching by `object.definition.name` (preferred) or slug derived from `object.id`
- Progress percent read from `result.progress` (normalized 0–100)

**Identity resolution order (`lib/xapi/mappings.ts`):**
1. Manual actor mapping (`actor.account.name` + `actor.account.homePage`)
2. Manual Coursera email mapping (`coursera_identity_mappings` table)
3. Direct email match from `actor.mbox` → `users.email`

Unmatched events are stored in `coursera_xapi_events` for admin review.

### 1.4 REST Webhook Ingest Detail

**Endpoint:** `POST /api/webhooks/coursera`

**Accepts payload with:**
- `externalUserId` (optional — when it matches `users.id`, used as enterprise SSO bridge)
- `email` (optional)
- `actorIdentifier` + `actorHomePage` (optional)
- Immutable `contentId` / `courseraCourseId` (preferred), or `courseSlug` / `courseName`
- `completed: true` is the only REST completion fact; `progressPercent` records progress and never graduates a course by itself
- `eventId` / `deliveryId` for idempotency

**Auth methods (in priority order, `lib/coursera/webhookAuth.ts`):**
1. HMAC-SHA256 signature header (`x-coursera-signature` etc.)
2. Shared secret in `x-coursera-webhook-secret` header
3. Legacy: `secret` field in JSON body

### 1.5 CSV Import Detail

**Manual process:**
1. Coursera admin console → **Analytics → Reports → Learner activity & progress** → **Customise & Generate**
2. Download ZIP with 6 CSVs
3. Admin uploads `CourseActivity ... .csv` or `LearningPathActivity ... .csv` to `/admin/coursera/csv-import`
4. Importer auto-detects type by header, upserts into `coursera_course_progress` or `coursera_badge_progress`
5. Identity resolution: direct `users.email` match → `coursera_identity_mappings` fallback
6. Unmatched learners surfaced at `/admin/coursera` with inline "Map to WAP user" dropdown

**Backfill on mapping:** When an unmatched learner is mapped, `POST /api/admin/coursera/map-unmatched`:
- Upserts `coursera_identity_mappings` row
- Backfills `user_id` on all existing `coursera_course_progress` and `coursera_badge_progress` rows for that email
- Replays pending xAPI statements for that email
- Promotes CSV rows to canonical `course_progress` table

### 1.6 Active-Pull Cron Detail

**Endpoint:** `/api/cron/coursera-sync` (GET/POST, Vercel Cron every 6h)
- Queries all active members (`role='member'`, non-deleted, with email)
- Resolves `programId` and `skillsetIds` per member's `enrolledProgram`
- Calls `fetchCourseraLearnerSkillsetProgress()` (4 concurrent, 250ms delay between batches)
- Upserts into `coursera_skillset_progress` table
- **Critical:** If no skillset IDs are configured for any program, cron returns `{ skipped: 'no_skillsets_configured', members: 0 }` and makes **zero** Coursera API calls.

### 1.7 Data Model (Relevant Tables)

| Table | Purpose | Managed By |
|-------|---------|------------|
| `users` | Member profile, `enrolledProgram`, `coursesCompleted` (legacy JSON) | Prisma |
| `course_progress` | Canonical per-member-per-course progress (status, percent, dates) | Prisma |
| `member_program_progress` | Rollup (coursesCompleted, averagePercent) per program | Prisma |
| `coursera_skillset_progress` | Snapshot from active-pull cron | Prisma |
| `coursera_course_progress` | Raw CSV import rows (CourseActivity) | Raw SQL (runtime DDL fallback) |
| `coursera_badge_progress` | Raw CSV import rows (LearningPathActivity) | Raw SQL (runtime DDL fallback) |
| `coursera_identity_mappings` | Manual WAP user ↔ Coursera email/actor bindings | Raw SQL (runtime DDL fallback) |
| `coursera_xapi_events` | Audit log of all xAPI/webhook events | Raw SQL (runtime DDL fallback) |
| `xapi_statements` | Persisted raw xAPI statements | Prisma |

### 1.8 Completion Side Effects

When a completion is confirmed (via xAPI, webhook, or CSV promotion → `completeMemberCourse`):
1. Updates `User.coursesCompleted` JSON array
2. Upserts `CourseProgress` row with `COMPLETED` status
3. Refreshes `MemberProgramProgress` rollup
4. Tracks `course_completed` event
5. Sends partner milestone email
6. Sends member "course completed" email
7. Triggers `handleLearningCompletion` workflow (careerOS)
8. Awards points

---

## 2. Gaps and Unknowns

### 2.1 Account Provisioning — **NOT IMPLEMENTED**

**What exists:** The launch route redirects to Coursera. There is **no code** that:
- Creates a Coursera account on behalf of a member
- Invites a member to a Coursera Enterprise program
- Provisions a workspace email / SSO identity

**Implication:** Members must already have a Coursera account (personal or enterprise) with an email that matches their WAP email (or must be manually mapped).

**Unknown:** Does Coursera Enterprise provide an API to programmatically invite/enroll learners?  
→ *Not found in public docs during this research. Coursera Enterprise typically allows bulk CSV upload of learners in the admin console, and SSO/SAML auto-provisions on first login.*

### 2.2 SSO / SAML / OAuth — **NOT IMPLEMENTED**

**What exists:**
- WAP has its own auth (Supabase Auth)
- Coursera xAPI uses client-credentials OAuth (WAP issues token to Coursera)
- REST webhook uses shared secret / HMAC
- No SAML or OIDC integration between WAP and Coursera

**Implication:** Members authenticate separately to WAP and Coursera. There is no seamless "Sign in via WorkforceAP" experience on Coursera.

**Unknown:** Does Coursera for Business/Enterprise support SAML/OIDC identity providers?  
→ *Yes, Coursera Enterprise supports SAML 2.0 SSO (industry standard). If configured, learners log in via their organization's IdP. WorkforceAP would need to either:*
- *Be the IdP (complex, not recommended)*
- *Share an IdP with Coursera (e.g., Google Workspace, Azure AD)*
- *Accept that members manage two logins*

### 2.3 Enterprise Program Assignment — **NOT IMPLEMENTED**

**What exists:** The active-pull cron reads skillset progress for members **already** in the Coursera Enterprise program. There is **no code** that:
- Adds a learner to a Coursera program
- Assigns courses to a learner
- Manages program enrollment

**Implication:** Someone (Mike, Dad, counselors, or the member themselves) must ensure the member is enrolled in the correct Coursera program before progress will appear.

**Unknown:** Is there a Coursera Enterprise API endpoint for program enrollment?  
→ *The existing code calls `GET /enterprise/programs/{programId}/skillsets/learner-progress`. There is no `POST` for enrollment in the codebase. Coursera Enterprise may have admin-only enrollment APIs not exposed to partner OAuth apps.*

### 2.4 Email Mismatch — **PARTIALLY HANDLED**

**What exists:**
- Direct email match (WAP email = Coursera email)
- Manual admin mapping (`/admin/coursera/mappings`)
- Auto-backfill on mapping

**Gap:** If a member signs up for Coursera with a different email than their WAP account, progress is unmatched until an admin manually maps it. There is **no member-facing flow** to link their Coursera account.

### 2.5 First-Login / Onboarding Experience — **NOT ADDRESSED**

**Gap:** No code handles:
- "You need a Coursera account" messaging
- Step-by-step guide to signing up on Coursera
- Verification that the member's Coursera email matches their WAP email
- Deep-linking that lands on a specific course's first lesson (not just the course page)

### 2.6 Webhook Subscription — **ASSUMED MANUAL**

**What exists:** WAP can receive webhooks at `/api/webhooks/coursera`.  
**Gap:** There is no code that subscribes/unsubscribes webhooks via a Coursera API. This is presumably done manually in the Coursera admin console.

---

## 3. Public Docs Research

**Attempted sources:**
- `https://www.coursera.org/business/products/enterprise` — JS-rendered shell only
- `https://www.coursera.org/business/help/articles/360043515893` — JS-rendered shell only
- `https://www.coursera.org/business/help/articles/360043515894-Configuring-xAPI` — JS-rendered shell only
- `https://www.coursera.org/business/articles/learner-management` — JS-rendered shell only
- `https://www.coursera.org/business/help` — JS-rendered shell only
- `https://www.coursera.org/enterprise/resources` — Loaded, but only marketing content (no technical docs)
- `https://building.coursera.org/` (Medium engineering blog) — Loaded, but no relevant articles found

**Result:** Coursera's public documentation is heavily JavaScript-rendered and not accessible via static fetch. The technical documentation for xAPI configuration, learner management, and SSO setup is behind authenticated admin portals or requires a Coursera account manager to share directly.

**Known from industry practice (not confirmed via fetched docs):**
- Coursera Enterprise supports SAML 2.0 SSO. Configuration is typically in the Enterprise admin console under "Settings → SSO" or similar.
- Learner management supports bulk CSV upload (invite by email) and automatic provisioning via SAML Just-In-Time (JIT) provisioning.
- xAPI (Tin Can) is supported for external LRS integration. Configuration requires a Coursera admin to enter LRS endpoint, client ID, client secret, and OAuth token URL.
- The "Learner activity & progress" CSV report is a standard Enterprise feature, accessible to program admins.

---

## 4. Recommended Ideal WAP Operating Model

### Phase 1: Manual-Heavy, Stable (Current → Near-term)

**Goal:** Get members into Coursera and receiving progress with minimal engineering risk.

| Step | Who | Action |
|------|-----|--------|
| 1. **Coursera account creation** | Member or Counselor | Member creates a Coursera account (free) using their WAP email, OR counselor bulk-invites via Coursera Enterprise admin console CSV upload |
| 2. **Program enrollment** | Mike / Dad / Coursera AM | Ensure member is assigned to the correct Enterprise program in Coursera admin console |
| 3. **Email verification** | Counselor (on intake) | Verify member's Coursera email matches WAP email. If different, record it for future admin mapping |
| 4. **Launch** | Member | Clicks "Open in Coursera" in WAP portal → deep-link to specific course or program home |
| 5. **Progress tracking** | WAP (automated) | xAPI + CSV import + cron pull. Admin reviews `/admin/coursera` for unmatched learners weekly |
| 6. **Mapping unmatched** | Admin / Counselor | Use "Map to WAP user" dropdown when mismatches are found |

**Engineering needed for Phase 1:**
- ✅ Already done (launch, xAPI, webhook, CSV import, admin mapping)
- 🔧 Configure env vars (`COURSERA_PROGRAM_HOME_URL`, `COURSERA_APP_KEY`, `COURSERA_APP_SECRET`, `COURSERA_WEBHOOK_SECRET`, skillset IDs)
- 🔧 Ensure xAPI credentials are entered in Coursera admin panel (per `docs/coursera-xapi-setup.md`)
- 🔧 Set up daily CSV email delivery to `michael.brown2@workforceap.org`

### Phase 2: Semi-Automated Enrollment (Medium-term)

**Goal:** Reduce manual counselor/admin work for member onboarding.

**Requires research:**
1. **Coursera Enterprise API exploration** — Does Coursera expose a `POST /enterprise/programs/{id}/learners` or invite API? If yes, build automation:
   - On WAP member enrollment → auto-invite to Coursera program
   - On email mismatch → send member a Coursera invite to their WAP email
2. **Member-facing Coursera email linking** — Add a "Link your Coursera account" flow in member settings:
   - Member enters their Coursera email
   - WAP stores it in `coursera_identity_mappings` preemptively
   - Avoids unmatched xAPI events

### Phase 3: SSO / Seamless Auth (Long-term, if justified)

**Goal:** One-login experience.

**Options:**
- **Option A: Coursera SAML SSO** — Configure Coursera Enterprise to use WorkforceAP's identity provider (or a shared IdP like Google Workspace). Members log in to Coursera via WAP credentials. Requires Coursera Enterprise contract with SSO feature (may be tier-dependent).
- **Option B: Deep-link with session token** — If Coursera ever supports "magic link" or tokenized deep links (like some LMSs), WAP could generate a signed URL that auto-authenticates the member. Not known to be available.

**Recommendation:** Phase 3 is likely overkill for the ICP (low-income, mobile-first members). A clear "create your Coursera account" guide + deep links is probably more usable than SAML redirects, which can be confusing.

---

## 5. Confirmed in Code vs. Depends on Coursera Admin

### ✅ Confirmed in WAP Code

| Capability | Status |
|------------|--------|
| Member launch redirect with deep-linking | ✅ |
| xAPI LRS endpoints (OAuth token, statements, about) | ✅ |
| xAPI statement parsing (completion, progress, identity) | ✅ |
| Identity resolution (manual mapping + direct email) | ✅ |
| REST webhook intake (HMAC + secret auth) | ✅ |
| CSV import (CourseActivity + LearningPathActivity) | ✅ |
| Admin identity mapping UI + backfill | ✅ |
| Active-pull skillset progress cron | ✅ |
| Course completion side effects (emails, points, workflow) | ✅ |
| Progress audit and unmatched learner drill-down | ✅ |
| xAPI replay pipeline for pending statements | ✅ |

### ⚠️ Depends on Coursera Admin / Contract Configuration

| Capability | What WAP Needs from Coursera |
|------------|------------------------------|
| **xAPI credentials** | `COURSERA_APP_ID` / `COURSERA_APP_SECRET` (or `COURSERA_API_TOKEN`) issued by Coursera account manager |
| **xAPI endpoint setup** | Coursera admin must enter WAP's xAPI URL (`https://www.workforceap.org/api/xapi`), OAuth URL (`/api/xapi/oauth/token`), Client ID, Client Secret into Coursera's xAPI/LRS config screen |
| **Webhook subscription** | Coursera admin must subscribe webhook URL (`https://www.workforceap.org/api/webhooks/coursera`) and set shared secret |
| **Program IDs** | Coursera must share the Enterprise program ID for each WAP program (e.g., `TpIlAogTQ8-SJQKIE8PP9w`) |
| **Skillset IDs** | Coursera must share skillset IDs per program for active-pull cron to work |
| **Course IDs** | Used for deep-linking; some discovered from catalog, but may need verification |
| **CSV report access** | Mike/Dad needs admin access to Coursera Enterprise Analytics → Reports |
| **SSO/SAML** | If ever pursued, requires Coursera Enterprise SSO tier + IdP metadata exchange |
| **Member enrollment** | Currently manual in Coursera admin console; no WAP automation exists |

---

## 6. What to Build Next (Prioritized)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Configure env vars + enter xAPI credentials in Coursera admin panel | Hours | Unblocks realtime progress sync |
| **P0** | Set up daily CSV email delivery + test import end-to-end | Hours | Backfill + redundancy working |
| **P1** | Add member-facing "My Coursera account" settings page — let members enter their Coursera email preemptively | 1–2 days | Reduces unmatched learners |
| **P1** | Add counselor dashboard widget showing unmatched Coursera learners for their caseload | 1–2 days | Faster resolution |
| **P2** | Research Coursera Enterprise API for programmatic learner invitation/enrollment | Spike (1–2 days) | Could eliminate manual enrollment |
| **P2** | Add onboarding copy/guide for first-time Coursera users (mobile-optimized) | 1 day | Reduces dropout |
| **P3** | SSO/SAML integration | 1–2 weeks | Nice-to-have, not member-critical |

---

## 7. Key Files Reference

| File | Purpose |
|------|---------|
| `docs/coursera-xapi-setup.md` | xAPI screen values for Coursera admin |
| `docs/coursera-prep.md` | Env var reference + CSV import instructions |
| `lib/coursera/configCore.ts` | Launch URL building, program/skillset resolution, readiness checks |
| `lib/coursera/client.ts` | Enterprise API client (`fetchCourseraLearnerSkillsetProgress`) |
| `lib/coursera/oauth.ts` | Coursera OAuth client-credentials token caching |
| `lib/xapi/mappings.ts` | Identity resolution, mapping CRUD, event logging |
| `lib/xapi/inboundStatementPipeline.ts` | Shared xAPI ingest path (webhook + replay) |
| `app/api/member/coursera/launch/route.ts` | Member launch redirect |
| `app/api/webhooks/coursera/route.ts` | REST webhook intake |
| `app/api/cron/coursera-sync/route.ts` | Active-pull skillset cron |
| `app/admin/coursera/page.tsx` | Admin mapping + audit UI |
| `lib/coursera/csvImport.server.ts` | CSV ingest + promotion to canonical progress |

---

*Report compiled by subagent research pass. No code changes made. Recommend Mike/Dad review Phase 1 operating model and confirm Coursera admin panel access to configure xAPI credentials.*
