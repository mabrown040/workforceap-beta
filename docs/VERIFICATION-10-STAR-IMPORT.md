# 10-Star Employer Import — Verification

## Summary
Employer import should feel like a hiring-ops assistant: paste one careers URL, get clean, trustworthy, editable, approval-ready drafts in minutes.

## Architecture (Implemented)

### Firecrawl Usage
- **Top-level careers page:** Firecrawl used only when needed (Rippling, Workday, iCIMS) for discovery — one token for the index page
- **Sub-job pages:** `fetchSubJobPageText` — direct fetch first, Firecrawl only when blocked/insufficient
- **Backend:** `lib/ai/atsProviders.ts` — `fetchSubJobPageText`, `importJobsFromUrl` for careers page; sub-URL following in `import-bulk/route.ts`

### Sub-URL Parsing
- Extract sub-job URLs from careers page text (markdown `[Title](url)`, plain ATS URLs)
- Follow each URL, parse with `parseJobFromText` for structured title, location, description
- `stripUrlsFromDescription` removes raw URLs from fallback AI output
- Draft cards show clean content, no raw URL text or page junk

### Portal UX
- **One-shell/one-nav:** `ConditionalMarketingNav` hidden on all portal routes (`/employer`, `/partner`, `/my-group`, etc.)
- **PortalShell:** No member `PortalNav` when route has dedicated shell (employer, partner, my-group)
- **EmployerPortalShell:** Compact white header (brand, nav, actions), lighter super-admin banner
- **Super-admin:** Short labels (Admin, Partner, etc.), smaller trigger

### Import UI — Hiring-Ops Assistant
- **Primary:** Careers page URL input — "Paste your company careers page URL. We discover listings, parse each job, and create editable drafts — approval-ready in minutes."
- **Trust cues:** Success card with checkmark, "X drafts ready for review", CTA to My Jobs
- **Secondary:** "Other import options" (details) — single job, multiple URLs, paste text
- **Hint:** "Firecrawl only for discovery; per-job pages use direct fetch when possible"

### Draft Flow
- **DraftJobCards:** "Edit draft" primary, "Submit for review" secondary
- **Job edit page:** Clean header, back link, title + meta
- **My Jobs:** Import/Post Job buttons, task-first layout

## Verification Evidence

### Build
```bash
npm run build
```
- ✅ Exit code 0
- ✅ No TypeScript errors
- ✅ All routes compile

### Routes Verified
- `/employer` — Dashboard
- `/employer/jobs` — My Jobs (drafts + table)
- `/employer/jobs/import` — Import page (careers URL primary)
- `/employer/jobs/[id]` — Edit draft
- `/employer/jobs/new` — Post new job

### API Flow (import-bulk)
1. `careersPageUrl` → `smartImportJobs` (Firecrawl for JS ATS if needed)
2. `rawText` → `extractSubJobUrlsFromPageText`
3. For each sub-URL → `fetchSubJobPageText` (direct fetch first)
4. `parseJobFromText` → `buildEmployerJobCreateData` → `prisma.job.create`
5. Fallback: `parseJobListingsFromPageText` + `stripUrlsFromDescription`

### Preserved Behavior
- Draft creation works (existing backend from PR #113)
- Job edit preserves all fields
- Submit for review flow unchanged
