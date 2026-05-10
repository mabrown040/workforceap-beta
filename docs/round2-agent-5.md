You are a strategic engineer for WorkforceAP. The CEO review scored the product 6.4/10 with biggest risks around training truth under load, calendar diligence, and employer job API verification.

Your task: Implement the highest-leverage operational containment fixes. Create a single PR.

## Issues to fix (from CEO review)

1. **Coursera/xAPI stale data honesty** — When xAPI sync fails or data is >24h old, the UI should tell the truth instead of showing stale progress as current:
   - `app/(portal)/dashboard/training/page.tsx`: If `lastSyncAt` is >24h old, show banner: "Training progress may be out of date. Last sync: {date}."
   - `app/(portal)/employer/candidates/[studentId]/page.tsx`: Same stale-data banner if candidate progress is old.
   - Add `lastSyncAt` to relevant data fetches if not already present.

2. **Add monitoring/alerting hooks** — In `lib/coursera/learnerProgress.ts` and `lib/xapi/inboundStatementPipeline.ts`:
   - Log structured warnings when sync fails: `console.warn('[SYNC] Coursera sync failed for userId={id}', error)`
   - Add a `SYNC_STALE_THRESHOLD_HOURS = 24` constant
   - Export a `isSyncStale(lastSyncAt)` helper for UI use

3. **Employer job pipeline verification** — In `lib/employer/jobPipeline.ts` (or create if missing):
   - Add a `verifyPipelineIntegrity()` function that checks: all active jobs have valid employer, all applications have valid student + job, no orphaned match records
   - Call this in a new API route `GET /api/admin/integrity/employer-pipeline` that returns `{ ok: boolean, issues: Array<{ type, id, message }> }`
   - This gives ops a way to verify pipeline health without manual SQL

4. **WIOA reporting alignment** — In `lib/partner/wioaReporting.ts` (or create):
   - Add a `generateWioaMetrics(partnerId, dateRange)` function that returns:
     - `enrolledCount` (distinct members with `courseEnrollments`)
     - `completedCount` (members with `memberProgramCompleted`)
     - `placedCount` (members with `placementRecord` in date range)
     - `avgDaysToPlacement` (average days from enrollment to placement)
   - This centralizes WIOA metrics so guide, dashboard, and exports use the SAME numbers

5. **Operational SLO documentation** — Create `docs/OPERATIONAL-SLOS.md` with:
   - Coursera sync: must complete within 5 minutes, data <1h old during business hours
   - xAPI ingestion: must persist within 30 seconds of receipt
   - Employer pipeline integrity check: run daily, alert on >0 issues
   - WIOA metrics: must be computable from canonical tables only (no denormalized counters)

## Rules
- One PR, one concern: operational containment and monitoring
- Don't change core auth or business logic
- Add new files where needed (docs, lib helpers)
- Build must pass
- PR title: "feat(ops): add stale-data honesty, pipeline integrity checks, and WIOA metrics"
