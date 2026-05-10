# Operational SLOs

> Single source of truth for WorkforceAP operational guarantees.
> These are targets, not contracts — they guide alerting thresholds
> and incident response priority.

---

## Coursera Sync

| Metric | Target | Rationale |
|--------|--------|-----------|
| Sync latency | ≤ 5 minutes | B4B enrollmentReports call + cache write should complete quickly enough that a member refreshing the dashboard sees their latest progress |
| Data freshness (business hours) | < 1 hour old | During 08:00–18:00 CT, `lastSyncAt` (max `CourseProgress.lastUpdatedAt`) must be within 1h so counselors trust the numbers |
| Data freshness (overnight) | < 24 hours old | Background cron covers the gap; 24h is the `SYNC_STALE_THRESHOLD_HOURS` constant used by UI banners |

### Alerting

- `isSyncStale(lastSyncAt)` returns `true` on the member dashboard → banner renders (user-facing)
- Ops check: query `xapi_statements` for `processedAt` older than 24h and rising

---

## xAPI Ingestion

| Metric | Target | Rationale |
|--------|--------|-----------|
| Persist latency | ≤ 30 seconds from receipt | Coursera webhook → `handleInboundParsedStatement` → `CourseProgress` upsert should not queue longer than a single page load |
| Error rate | < 1% | `unmatched` + `error` statuses in `coursera_xapi_events` should stay below 1% of total volume |

### Alerting

- Structured warning emitted: `[SYNC] xAPI ingestion failed for userId=... statement=...`
- Error spike → check `coursera_xapi_events` `completionStatus = 'error'` last hour

---

## Employer Pipeline Integrity

| Metric | Target | Rationale |
|--------|--------|-----------|
| Integrity check frequency | Daily | `verifyPipelineIntegrity()` runs once per day |
| Issue count | 0 | Any `issues.length > 0` triggers an ops alert |

### Alerting

- Call `GET /api/admin/integrity/employer-pipeline`
- Response: `{ ok: false, issues: [...] }` → immediate review
- Common causes: manual employer deletion leaving orphaned `Job` rows, user deletion leaving orphaned `JobPostingApplication` rows

---

## WIOA Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Computability | 100% canonical tables | `generateWioaMetrics` must read ONLY from `CourseEnrollment`, `MemberProgramProgress`, `PlacementRecord`, `PartnerReferral` |
| Consistency | Zero variance | Dashboard, partner portal, and CSV export must all call the same function |

### Enforcement

- No denormalized counters (e.g., `Employer.applicationsCount`) used for WIOA reporting
- Any new report UI must import `generateWioaMetrics` from `@/lib/partner/wioaReporting`

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-05-09 | Initial SLOs + thresholds | ops agent |
