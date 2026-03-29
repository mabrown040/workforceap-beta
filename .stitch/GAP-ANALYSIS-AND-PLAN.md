# WorkforceAP - Stitch Gap Analysis & Next Steps

Based on the `.stitch/golden-screens-index.json`, the current coverage of the WorkforceAP Stitch designs is at **44%** (28 covered, 36 missing across 64 core routes).

## 1. Member Portal Gap (Largest Gap)
The Member Dashboard itself is covered, but almost all secondary dashboard views and specialized AI tools are missing.
**Missing Screens to Generate:**
* **AI Tools Subpages:** `interview-practice`, `cover-letter`, `gap-analyzer`, `linkedin-about`, `linkedin-headline`, `salary-negotiation`, `application-tracker`
* **Core Profile/Docs:** `dashboard/certifications`, `dashboard/resume`, `dashboard/settings`, `dashboard/profile`
* **Engagement/Learning:** `dashboard/career-brief`, `dashboard/program`, `dashboard/resources`, `dashboard/weekly-recap`, `dashboard/readiness`

**Priority Action:** Generate the `portal-member-resume.html` and `portal-member-settings.html` first, as these are critical for the user journey. The AI tools can follow the pattern established by `portal-ai-tool-resume-rewriter.html`.

## 2. Employer Portal Gap
The main Employer Dashboard, Job Listings, and Applications views exist.
**Missing Screens to Generate:**
* **Job Creation:** `employer/jobs/new` (Critical for the Employer sprint)
* **Bulk Import:** `employer/jobs/import`
* **Pipeline/Matching:** `employer/matches`, `employer/pipeline`, `employer/messages`

**Priority Action:** `employer/jobs/new` is the highest priority here to complete the employer lifecycle.

## 3. Counselor Portal Gap
The Counselor dashboard (student list) and student detail view exist.
**Missing Screens to Generate:**
* **Communication:** `counselor/messages`
* **Resources:** `counselor/resources`

## 4. Partner Portal Gap
Only the Partner Dashboard is covered.
**Missing Screens to Generate:**
* **Management:** `partner/members`, `partner/settings`, `partner/attention` (Needs Attention queue)
* **Reporting:** `partner/milestones`, `partner/outcomes`, `partner/exports`
* **Communication:** `partner/messages`, `partner/guide`

**Priority Action:** The `partner/members` and `partner/attention` views are crucial for partner engagement.

---

## Technical Blocker: Stitch API Authentication
Currently, the system is unable to generate these missing screens automatically because the Stitch API token (`AQ...`) is returning `invalid authentication credentials`.
* **Diagnosis:** Direct API calls return `405 Bad Request`, indicating Google may have changed the BardChatUi internal endpoint or the expected payload/headers. The tokens extracted from the browser no longer seem sufficient for pure API access without proper cookies/origin headers.
* **Workaround:** Until the Stitch MCP integration is updated to handle the new Google Auth flow (or an official API is released), we must rely on manual generation via the Stitch UI using pre-written prompts.

I have created/appended the necessary prompts to `.stitch/PENDING-SCREEN-PROMPTS.md` so that a user can simply copy-paste them into the Stitch web UI when ready.
