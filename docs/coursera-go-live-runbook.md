# Coursera Go-Live Runbook — WorkforceAP

**Purpose:** Make WAP and Coursera feel like one coherent product for members, counselors, and admins.  
**Audience:** Mike, Dad, counselors, future ops staff.  
**Scope:** Member signup → admin provisioning → env setup → xAPI/webhook/CSV → unmatched mapping → failure modes.

---

## 1. Pre-flight Checklist

Before any member sees Coursera links in the portal:

| # | Item | Owner | How to verify |
|---|------|-------|---------------|
| 1 | Coursera Enterprise contract active with program(s) purchased | Mike / Dad | Can log into `https://www.coursera.org/business` and see the program |
| 2 | WAP member email domain ready (members will use WAP portal email or a mapped alternative) | Mike | Test member account exists with email |
| 3 | Vercel env vars set (see §3) | Dench / Mike | `/api/xapi/config` returns `ready: true` |
| 4 | xAPI credentials entered in Coursera admin panel (see §4) | Mike / Dad | Coursera xAPI status shows "Connected" or green check |
| 5 | Webhook subscribed in Coursera (optional but recommended) (see §5) | Mike / Dad | POST to `/api/webhooks/coursera` returns 200 in logs |
| 6 | CSV report access confirmed (Analytics → Reports) | Mike / Dad | Can download "Learner activity & progress" ZIP |
| 7 | Admin page loads without mapping-table errors (`/admin/coursera`) | Dench / Mike | Page shows 0 unmatched learners, no red error box |
| 8 | At least one test member enrolled in a program with Coursera courses | Counselor | Member sees Training page with course list |
| 9 | Launch deep-link test passes (see §7) | Dench / Mike | Click "Open Coursera" lands on program/course page, not generic coursera.org |

---

## 2. Member Signup Flow

### 2.1 New member creates WAP account
- Member signs up at `https://www.workforceap.org/apply` or is invited by counselor.
- Member gets a WAP portal email address (usually their personal email).

### 2.2 Counselor enrolls member in a program
- Counselor uses `/admin/members` or `/counselor/students`.
- Selects program (e.g., *IT Support Professional Certificate*).
- Member now sees `/dashboard/training` after completing assessment.

### 2.3 Member creates Coursera account
**Recommended path:** Member uses the **same email** as their WAP portal account when signing up at Coursera. This makes identity matching automatic.

**Alternative path:** If the member already has a Coursera account with a different email, they must save that email in WAP:
1. Go to `/dashboard/training`.
2. In the **"Connect your Coursera email"** card, enter the Coursera account email.
3. Click **Save Coursera email**.
4. WAP stores the mapping in `coursera_identity_mappings`.

> **Counselor tip:** During intake, ask: *"Do you already have a Coursera account? What email did you use?"* If different, help them save it in the portal right then.

### 2.4 Member launches Coursera from WAP
- Member clicks **Open Coursera** or **Start Course 1** (zero-state banner).
- WAP redirects to the program home URL or a course-specific deep link.
- Member studies on Coursera. Progress flows back to WAP automatically.

---

## 3. Environment Variables

Set these in Vercel (Production) **before** going live:

| Variable | Example | Why it matters |
|----------|---------|--------------|
| `COURSERA_PROGRAM_HOME_URL` | `https://www.coursera.org/programs/your-program-slug` | Where "Open Coursera" sends members |
| `COURSERA_PROGRAM_URL_TEMPLATE` | `https://www.coursera.org/programs/{programId}` | Alternative to fixed URL; interpolates `{programId}`, `{programSlug}`, `{userId}`, `{email}` |
| `COURSERA_COURSE_URL_TEMPLATE` | `https://www.coursera.org/learn/{courseId}` | Deep-link to individual courses |
| `COURSERA_PROGRAM_ID` | `TpIlAogTQ8-SJQKIE8PP9w` | Coursera Enterprise program ID |
| `COURSERA_PROGRAM_ID_MAP` | `{"it-support-ibm":"TpIlAogTQ8..."}` | Per-program overrides |
| `COURSERA_APP_ID` | `abc123` | OAuth client ID for Coursera Enterprise API |
| `COURSERA_APP_KEY` | `xyz789` | OAuth app key (same namespace as `APP_ID`) |
| `COURSERA_APP_SECRET` | `secret` | OAuth app secret |
| `COURSERA_API_TOKEN` | `bearer...` | Optional: pre-minted bearer token instead of OAuth |
| `COURSERA_WEBHOOK_SECRET` | `whsec_...` | Shared secret for inbound webhook validation |
| `COURSERA_DEFAULT_SKILLSET_IDS` | `skillset1,skillset2` | Comma-separated skillset IDs for active-pull cron |
| `COURSERA_SKILLSET_ID_MAP` | `{"it-support-ibm":["sk1","sk2"]}` | Per-program skillset overrides |
| `XAPI_CLIENT_ID` | (optional) | Dedicated xAPI OAuth client ID; falls back to `COURSERA_APP_ID` |
| `XAPI_CLIENT_SECRET` | (optional) | Dedicated xAPI OAuth secret; falls back to `COURSERA_APP_SECRET` |

**Verify readiness:**
```bash
curl https://www.workforceap.org/api/xapi/config
```
Should return JSON with `ready: true` and no `missing` array.

---

## 4. xAPI Setup (Real-time Progress)

xAPI lets Coursera push course completions and progress % to WAP as members finish lessons.

### 4.1 WAP exposes these endpoints to Coursera
- `POST /api/xapi/oauth/token` — OAuth client-credentials token exchange
- `POST /api/xapi/statements` — Batch xAPI statement intake
- `GET /api/xapi/about` — LRS about endpoint

### 4.2 Enter these values in the Coursera admin console
Go to **Coursera Admin → Integrations → xAPI** (or similar path):

| Field | Value |
|-------|-------|
| xAPI Provider format | `EXTERNAL_LEARNING_PLATFORM_STANDARD` |
| xAPI Actor configuration | `Mbox` |
| Client ID | `XAPI_CLIENT_ID` (or `COURSERA_APP_ID`) |
| Client Secret | `XAPI_CLIENT_SECRET` (or `COURSERA_APP_SECRET`) |
| OAuth Server URL | `https://www.workforceap.org/api/xapi/oauth/token` |
| Tenant Server URL | `https://www.workforceap.org/api/xapi` |

### 4.3 Test the pipe
1. Finish a lesson on Coursera with a test account.
2. Within minutes, check `/admin/coursera` → **xAPI statements needing attention**.
3. If the statement appears with status `completed`, the pipe is live.
4. The member's Training page should show the course as **In progress** or **Complete**.

---

## 5. Webhook Setup (Alternative / Redundant)

If Coursera supports REST webhooks for your contract tier:

1. In Coursera admin console, subscribe webhook URL:
   ```
   https://www.workforceap.org/api/webhooks/coursera
   ```
2. Set shared secret = `COURSERA_WEBHOOK_SECRET`.
3. WAP validates via HMAC-SHA256 header or `x-coursera-webhook-secret`.
4. Send Coursera's immutable `contentId` (or `courseraCourseId`). Webhooks handle
   explicit `completed: true` events the same way as course-level xAPI. A
   `progressPercent` value, including 100, remains progress until Coursera sends
   an explicit completion fact.

> **Note:** xAPI and webhook can run side-by-side. WAP deduplicates by event ID so duplicates are harmless.

---

## 6. CSV Import Routine (Backfill + Redundancy)

xAPI cannot backfill events that fired before it was connected. CSV import fills the gap.

### 6.1 Download the CSV
**Who:** Mike or Dad (must have Coursera Enterprise admin access)
**Where:** Coursera Admin Console → **Analytics → Reports → Learner activity & progress** → **Customise & Generate**
**What:** A ZIP with 6 CSVs. WAP uses two of them:
- `CourseActivity ... .csv` — per-learner-per-course progress
- `LearningPathActivity ... .csv` — per-learner-per-badge (specialization) progress

**Tip:** Schedule daily email delivery to `michael.brown2@workforceap.org` so the latest export is always one inbox-search away.

### 6.2 Import into WAP
1. Sign in as admin at `https://www.workforceap.org/admin/coursera/csv-import`.
2. Upload either `CourseActivity ... .csv` or `LearningPathActivity ... .csv` (5 MB cap).
3. The importer auto-detects type by header row.
4. Results show: parsed, inserted, updated, resolved, unresolved counts.
5. Download unresolved rows as CSV for follow-up.

### 6.3 Frequency
- **At go-live:** Import the latest CSV immediately to backfill all existing learners.
- **Ongoing:** Weekly or after any bulk enrollment wave.
- **Emergency:** If xAPI ever drops events, import the CSV to fill gaps.

---

## 7. Unmatched Learner Mapping Routine

### 7.1 How unmatched learners happen
- Member used a different email on Coursera than in WAP.
- Member was added to Coursera before WAP enrollment completed.
- CSV import or xAPI event arrives with an email not found in `users` table.

### 7.2 Find unmatched learners
Go to `/admin/coursera` → **Coursera-only learners (unmatched)**.

Each row shows:
- Coursera email / name
- Courses and badges found for that learner
- Last activity date
- **Map to WAP user…** action

### 7.3 Map a learner
1. Click **Map to WAP user…** next to the unmatched row.
2. Select the correct WAP member from the dropdown.
3. Click **Save mapping**.
4. WAP automatically:
   - Creates a `coursera_identity_mappings` row
   - Backfills `user_id` on all existing CSV rows for that email
   - Replays pending xAPI statements for that email

### 7.4 Counselor-level view (future)
Currently only admins see unmatched learners. A future improvement is to show counselors only the unmatched learners in their caseload.

---

## 8. Failure Modes & What To Do

### 8.1 Member clicks "Open Coursera" and sees "Your Coursera training access is being prepared"
**What it means:** The launch URL is not configured (missing `COURSERA_PROGRAM_HOME_URL` or template).  
**Fix:** Set the env var in Vercel and redeploy. Test with `curl https://www.workforceap.org/api/xapi/config`.

### 8.2 Member completes a course on Coursera but WAP still shows "Not started"
**Likely causes:**
1. **Email mismatch** — Member used a different Coursera email. Check `/admin/coursera` for unmatched xAPI events.
2. **xAPI not connected** — Coursera admin panel has wrong endpoint or credentials. Re-check §4.
3. **Webhook not subscribed** — If relying on webhooks, verify subscription in Coursera console.
4. **Course slug mismatch** — The course name/slug in the xAPI statement doesn't match WAP's catalog. Check `docs/coursera-end-to-end-research-2026-05-06.md` §1.3 for matching logic.

**Fix:**
- If unmatched: map the learner (§7).
- If xAPI down: import CSV (§6) as temporary backfill.
- If slug mismatch: update the program catalog or add a manual mapping.

### 8.3 `/admin/coursera` shows a red error box about mapping tables
**What it means:** The runtime DDL for `coursera_identity_mappings` or `coursera_xapi_events` failed to create.  
**Fix:** Run `prisma migrate deploy` to ensure all tables exist. The runtime DDL is a fallback; a proper migration is preferred.

### 8.4 Active-pull cron returns `skipped: 'no_skillsets_configured'`
**What it means:** `COURSERA_DEFAULT_SKILLSET_IDS` and `COURSERA_SKILLSET_ID_MAP` are both empty.  
**Impact:** The cron makes zero API calls. No skillset progress snapshots.  
**Fix:** Ask your Coursera account manager for the skillset IDs per program, then add them to env vars.

### 8.5 Coursera API returns 401 / "Invalid token"
**What it means:** OAuth token expired or `COURSERA_APP_KEY` / `COURSERA_APP_SECRET` are wrong.  
**Fix:**
1. Verify credentials in Vercel.
2. Check `lib/coursera/oauth.ts` token cache — it auto-refreshes, but if the app was revoked, re-issue credentials in Coursera admin.
3. Test manually: `curl -u "APP_KEY:APP_SECRET" https://api.coursera.com/oauth2/client_credentials/token`

### 8.6 Member says "I don't know what Coursera is"
**What it means:** The member-facing copy assumes familiarity.  
**Fix:** Counselor explains: *"Coursera is the online school where you watch videos and take quizzes. WorkforceAP pays for it. You sign in with the same email you used here, and your progress shows up automatically on your Training page."*

---

## 9. What Is Seamless vs. Still Manual

### ✅ Seamless (works without admin action after initial setup)
- Member clicks "Open Coursera" → deep-linked to program/course.
- Member saves a different Coursera email → future progress matches automatically.
- xAPI statements arrive → matched by email or mapping → course progress updated.
- Webhook events arrive → same pipeline as xAPI.
- CSV import → identity resolution → backfill on mapping.
- Training page shows live progress from xAPI/CSV/webhook in the course list.
- `CourseraProgressCard` now falls back to canonical `course_progress` if CSV data is missing.

### ⚠️ Still Requires Coursera Contract, Credentials, or Approval
- **Program/course enrollment:** WAP has member and admin enrollment routes backed by the Coursera B4B API. A paid enrollment still requires valid B4B credentials, a verified catalog binding, explicit WAP approval, and an available license; see [`COURSERA-ENROLLMENT-FLOW.md`](./COURSERA-ENROLLMENT-FLOW.md). Do not use a manual Coursera console enrollment as an untracked bypass.
- **xAPI credential setup:** Coursera admin must enter WAP's xAPI endpoint and OAuth details.
- **Webhook subscription:** Coursera admin must subscribe the webhook URL.
- **Skillset ID discovery:** Must be provided by Coursera account manager; no public API docs.
- **CSV download:** Requires Coursera Enterprise admin access.
- **Unmatched mapping:** Requires admin intervention when emails differ.

---

## 10. Exact Next Sprint Items

| # | Item | Priority | Effort | Owner |
|---|------|----------|--------|-------|
| 1 | **Configure prod env vars** (`COURSERA_PROGRAM_HOME_URL`, `COURSERA_APP_KEY`, `COURSERA_APP_SECRET`, `COURSERA_WEBHOOK_SECRET`, skillset IDs) | P0 | 1 hour | Mike / Dad |
| 2 | **Enter xAPI credentials in Coursera admin panel** per §4 | P0 | 30 min | Mike / Dad |
| 3 | **Set up daily CSV email delivery** to `michael.brown2@workforceap.org` | P0 | 15 min | Mike / Dad |
| 4 | **Test end-to-end:** create test member → enroll → click Open Coursera → complete a lesson → verify progress appears in WAP | P0 | 1 hour | Dench / Mike |
| 5 | **Import latest CSV** to backfill all current learners | P0 | 30 min | Mike / Dad |
| 6 | **Review `/admin/coursera`** for unmatched learners and map any known mismatches | P1 | 30 min | Counselor / Mike |
| 7 | **Add counselor dashboard widget** showing unmatched Coursera learners for their caseload | P1 | 1–2 days | Dench |
| 8 | **Add member-facing onboarding guide** for first-time Coursera users (mobile-optimized) | P2 | 1 day | Dench |
| 9 | **Research Coursera Enterprise API** for programmatic learner invitation/enrollment | P2 | Spike (1–2 days) | Mike + Dench |
| 10 | **SSO/SAML evaluation** — is it worth it for the ICP? | P3 | 1–2 weeks | Future |

---

## 11. Key Links

| Resource | URL |
|----------|-----|
| Member Training page | `/dashboard/training` |
| Member Coursera launch | `/api/member/coursera/launch` |
| Admin Coursera dashboard | `/admin/coursera` |
| Admin CSV import | `/admin/coursera/csv-import` |
| xAPI debug endpoint | `/api/xapi/config` |
| WAP xAPI setup doc | `docs/coursera-xapi-setup.md` |
| WAP prep doc (env vars) | `docs/coursera-prep.md` |
| Research report (gaps) | `docs/coursera-end-to-end-research-2026-05-06.md` |

---

*Last updated: 2026-05-06 by DenchClaw*  
*Branch: `dench/coursera-go-live-runbook`*
