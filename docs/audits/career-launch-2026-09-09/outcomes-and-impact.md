# Career outcomes and credible impact

September 9, 2026. Repository audit based on `b381df7a` plus the focused reporting correction below. Scope: source code, schema, tests, and official nonprofit benchmark sources. No production records were queried; this establishes implemented behavior and failure modes, not their incidence or WorkforceAP's measured results. The father's homepage is unchanged by this work.

**The next major improvement is a dependable path from employer interest to a verified job start, then documented earnings and continued employment.** Much of the infrastructure exists. The remaining work is agreeing on evidence, closing staff handoffs, and making every report use the same population and outcome definitions.

## What is already built

| Capability | Evidence and practical limit |
| --- | --- |
| Version-aware training | Course enrollment selects the assigned curriculum; reporting validates course counts against that version. This proves recorded training completion, not a separately verified industry credential. See [programCompletion.ts](../../../lib/reporting/programCompletion.ts), [courseCompletion.ts](../../../lib/member/courseCompletion.ts). |
| Certificate review | Members can attach private files; uploads enter a pending review queue with reviewer metadata. Self-attested additions currently follow a different, automatically approved path. See [certification upload](../../../app/api/member/certifications/upload/route.ts), [schema](../../../prisma/schema.prisma). |
| Employer-to-counselor handoff | Employer `hired` status can create an unverified placement and notify the assigned counselor to confirm details. This is an actual implementation, not proof every notification or follow-up happens. See [applicationStatusEffects.ts](../../../lib/employer/applicationStatusEffects.ts). |
| Follow-up and support | 30/60/90/180-day surveys, signed survey tokens, nonresponse escalation, and a job-loss counselor alert exist. See [placement-surveys.ts](../../../lib/cron/placement-surveys.ts), [survey submission](../../../app/api/placement-survey/route.ts). |
| Reporting and public honesty | Board and quarterly exports, some data-quality counts, salary medians, and pending retention counts exist. The current public [impact page](../../../marketing/src/pages/impact.astro) explicitly says no cohort outcome report is published. It does not invent zero participation or verified impact. |
| Story consent | Surveys collect opt-in testimonial permission; testimonial records support review and publication states. The existence of those fields does not substantiate every older marketing story. See `PlacementSurvey` and `Testimonial` in [schema.prisma](../../../prisma/schema.prisma). |

## Prioritized gaps

### 1. High: retention needs evidence for each milestone

**Confirmed defect, partly corrected here.** Previously, the shared classifier accepted any `retained*` status in both quarterly windows. A placement old enough for the 180-day denominator could therefore count as retained with only `retained_90d` evidence. The same code allowed an older retained status to outweigh a counselor's explicit `not_retained` decision.

The correction makes the org and partner 180-day summaries require `retained_180d`; a 90-day status or generic undated `retained` decision stays pending in that window. Explicit counselor `not_retained` takes precedence over stale retained status. Pending rows remain in the reported total. See [retentionOutcome.ts](../../../lib/analytics/retentionOutcome.ts), [quarterlyOutcomes.ts](../../../lib/analytics/quarterlyOutcomes.ts), [partnerQuarterlyOutcomes.ts](../../../lib/analytics/partnerQuarterlyOutcomes.ts).

**Still needed:** the canonical placement stores one status and one follow-up wage. A later survey can record job loss while leaving a previous non-null retained status unchanged; the loss is nevertheless escalated and visible in the staff queue. Both staff and surveys can write identical status strings, with no per-status provenance or observation date. Automatically overwriting one would risk reversing a staff decision. Add milestone observations keyed by placement, window, observed date, source, and reviewer; retain the raw survey and a correction history. Use actual verified start dates for job-tenure windows and freeze report observation cutoffs. Current queries use `placedAt`, and current statuses cannot reconstruct historical quarter-end truth.

**User consequence:** the organization may overstate sustained employment while a member needs renewed job-search support. Completion criterion: a 90-day success followed by 180-day loss produces separate, correctly dated outcomes and an owned support task.

### 2. High: separate completion, self-attestation, and verified credentials

`UserCertification.status` defaults to `approved` explicitly to preserve self-attested rows. The [manual certification endpoint](../../../app/api/member/certifications/route.ts) creates rows without review, then emits `certification_earned`, points, an earned-credential notification, and a partner milestone. Attaching proof subsequently changes the row to pending. The [staff review endpoint](../../../app/api/admin/certifications/review/route.ts) records approval/rejection and reviewer metadata; it currently does not emit the earned lifecycle event.

**Board wording corrected here.** [boardOutcomes.ts](../../../lib/admin/boardOutcomes.ts) previously labeled completed-course rollups `Certified`. Board views, cohort/program labels, CSV funnel rows, Markdown, generated PDF, and printable HTML now say **Training completed**. The legacy JSON keys `membersCertified` and `certified` remain unchanged. The separate credential aggregates are now labeled **Credential records**, with their all-status/member-reported scope visible; neither counts nor stored records changed. The reporting-context banner also no longer predicts unsubstantiated placement or onboarding timelines. See [OUTCOMES-METHODOLOGY.md](../../OUTCOMES-METHODOLOGY.md).

**Proposed next migration, not implemented:** add evidence state/source separately from the existing review status. Distinguish member reported, provider confirmed, staff reviewed, and rejected; leave historical records explicitly legacy/unknown unless evidence supports classification. New self-attested additions should create a reported event and a request to add proof, without an earned/verified milestone. Proof submission should enter review without erasing its member-reported origin. A successful, authorized review or provider confirmation should issue the earned/verified milestone exactly once. Preserve existing approval values and historical events; do not automatically treat legacy `approved` as issuer verification. Surface source, issuer reference, and reviewer/date to staff and learners.

Acceptance cases for that migration: a new self-attestation adds no verified count or earned notification; attaching proof preserves origin and training progress; approval emits one milestone even on retries; rejection emits none; another tenant cannot review; re-adding or date-editing an existing record does not reset evidence or duplicate milestones; old approved records and historical exports remain interpretable. Award-point and partner-notification consumers need review together with the endpoint change. This pass intentionally does not change that lifecycle.

Reconcile the approved external curriculum manifests with real provider collections: [programCurriculumManifest.ts](../../../lib/content/programCurriculumManifest.ts) still marks its approved external tracks pending/assignment disabled.

**User consequence:** an employer or funder can interpret a checked box as issuer verification; a learner submitting stronger proof can appear less complete. Completion criterion: adding a self-attestation never creates a verified-credential count, and reviewing a file never changes recorded training progress.

### 3. High: reconcile employer, board, partner, and cohort metrics

The [employer outcomes endpoint](../../../app/api/employer/outcomes/route.ts) counts member-tracker `JobApplication.ACCEPTED`, while the employer's [status writer](../../../app/api/employer/applications/[id]/route.ts) updates `JobPostingApplication.hired`. The [tracker bridge](../../../lib/jobs/syncCuratedJobToTracker.ts) is called for applying/tracking curated jobs; the inspected employer status effects do not synchronize accepted/hired status back to it. The employer can record a hire and still see a different result in their outcome dashboard.

The org [quarterly exporter](../../../lib/analytics/quarterlyOutcomes.ts) requires `startDateVerified`; the [partner exporter](../../../lib/analytics/partnerQuarterlyOutcomes.ts) counts any associated placement. [Board outcomes](../../../lib/admin/boardOutcomes.ts) divides placements dated in a period by members enrolled in that period, which are different populations. Example: ten earlier enrollees placed this quarter divided by five new enrollees gives 200%, not a cohort placement probability.

Create one report contract distinguishing activity counts, cohort rates, employer-confirmed hires, and staff-verified starts. Freeze the cohort IDs, follow-up horizon, exclusions, numerator, denominator, verification tier, and generated-at cutoff. Preserve pending starts and unknown outcomes. Test one synthetic employer hire through all three views and one earlier-cohort placement across a quarter boundary.

### 4. High: measure career trajectories beyond one job

[PlacementRecord](../../../prisma/schema.prisma) is unique per user; surveys are unique per user and wave. The employer handoff returns early when any placement already exists. This protects an existing record but cannot represent a second job, promotion, or a fresh retention cycle. It is a one-placement operational model, not yet a career history.

Add job episodes with source and dates, preserving a current-placement pointer for existing workflows. Capture pre-training individual earnings, hourly/annual units, hours worked, observation dates, and follow-up earnings. The inspected schema has household-income bands and placement/follow-up salaries, not a structured individual pre-training wage baseline. The retained [public metric helper](../../../lib/marketing/publicImpactStats.ts) calculates follow-up minus placement offer; that is post-placement movement, not pre/post-training gain. The current public impact page does not publish that helper's figures.

**User consequence:** the platform can lose the story after the first job and cannot credibly attribute an income transformation to training. Completion criterion: a second job preserves first-job history and gets its own follow-ups; wage-change reporting uses paired observations and publishes coverage and medians.

### 5. Medium: make follow-up recoverable and staff-owned

The [survey scheduler](../../../lib/cron/placement-surveys.ts) selects a 24-hour eligibility window and at most 200 rows. Failed email rolls back its survey row, but a later run outside that window cannot select the missed placement. An outage or volume spike can leave people unsurveyed, outside the nonresponse queue because no survey was created. Employer placement side effects are also called without awaiting completion from request handlers.

Use a durable due queue with an overdue catch-up policy, delivery attempts, pagination, and replayable idempotency keys. Add counselor owner, next action, due date, and resolved outcome to verification/support work. Test a 48-hour outage, 201 eligible placements, missing counselor assignment, and an employer-status success followed by notification failure. These are proposed verification cases, not failures observed in production.

### 6. Medium: measure useful behavior without claiming causation

[aiToolEfficacy.ts](../../../lib/analytics/aiToolEfficacy.ts) compares tool users with nonusers and ranks placement-rate differences. Tool use is selected within the report range, without requiring it to precede the placement. Current placement state can also be newer than the report's end date. Some learning instrumentation in [track.ts](../../../lib/analytics/track.ts) only logs when an environment flag is enabled.

Record the sequence from assigned learning to attempted practice, feedback, employer interview, offer, confirmed start, and follow-up. Show missing-event coverage. Label AI comparisons observational; enforce pre-outcome exposure and comparable follow-up before drawing conclusions. Independent evaluation is later work, not something a dashboard proves.

## Useful nonprofit benchmarks

These are practices to learn from, not a ranking or evidence of WorkforceAP's results. Sources checked September 9, 2026:

- **Merit America:** its current site qualifies wage and positive-outcome figures by alumni with outcome data and a follow-up period of at least three months; it links a dated 2025 impact report. Borrow the visible population, observation window, and report link. [Official about page](https://meritamerica.org/about/), [2025 impact report](https://meritamerica.org/2025-impact-report/).
- **Year Up United:** its research page identifies the evaluator, randomized comparison, and multi-year follow-up rather than presenting an operational placement dashboard as causal evidence. Borrow the separation between recorded outcomes and independent impact evaluation. [Official PACE research page](https://www.yearup.org/research/pace).
- **Per Scholas:** its published 2024 report distinguishes graduation, exam-based certification, initial employment, and alumni upskilling; its CDW example describes actual hiring and volunteer activity. Borrow distinct milestones and concrete employer participation. This is the dated 2024 report, not a claim to have verified its newer PDF. [Official annual report](https://perscholas.org/2024-annual-report/).

## Suggested next delivery

Build an employer-hire verification work queue and a shared outcome definition layer before adding more headline metrics. Alongside it, establish a named staff owner for evidence review and follow-up, verify provider/issuer records, and prepare the first dated cohort report with unknown outcomes and small-group privacy protections. Then publish consented learner stories linked to the same evidence standards. Software, staff follow-through, and actual member data are all required; none can stand in for the others.

## Validation of the correction

For the retention correction, six targeted Vitest suites passed, **65 tests**: window classification, org quarterly reports, partner quarterly reports, board snapshots, survey submission, and quarterly API authorization. Regression cases include 90-day evidence in a 180-day report, generic undated decisions, explicit 180-day evidence, a counselor loss decision over stale retained status, and unchanged denominators. Full TypeScript validation, focused ESLint, and `git diff --check` passed for that correction.

For the board wording correction, three focused suites passed, **8 tests**, including server-rendered labels, separate synthetic training/credential totals, CSV funnel wording, real generated-PDF text extraction, and preservation of legacy JSON fields. The PDF extraction emits a nonfatal optional standard-font warning; its text assertions passed. No migrations, stored-record edits, provider actions, production actions, or external messages were performed.
