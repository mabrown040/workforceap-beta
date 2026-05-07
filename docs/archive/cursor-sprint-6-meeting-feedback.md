# WorkforceAP Sprint 6 — Meeting feedback (implementation notes)

**Repo:** mabrown040/workforceap-beta  
**Branch:** `sprint-6-meeting-feedback`  
**Date:** 2026-03-24  

The original spec file was not present on `master` when this sprint started; implementation below reflects common stakeholder asks plus deferred Sprint 4 P0 items.

## Shipped in this branch

1. **Auto AI matching when a job goes live** — On admin job approval (`POST /api/admin/jobs/[id]/approve`), `scheduleAiMatchForLiveJob` runs asynchronously and logs `[employer_match_auto] jobId=…`.

2. **WorkforceAP placement reporting (`PlacedOutcome`)** — Admin member detail: “WorkforceAP placement (grants)” form; `POST /api/admin/members/[id]/placed-outcome`. Admin overview: **WorkforceAP placements (reported)** count.

3. **Counselor assignment** — Admin member detail: assign active counselor, sync `message_threads.counselor_user_id`, email member with link to **Messages** (`sendCounselorAssignedEmail` + `emails/counselor-assigned.ts`).

## Definition of done

- `npm run build` passes  
- Migrations: no new tables (uses existing `placed_outcomes`, `counselor_assignments`, `message_threads`)
