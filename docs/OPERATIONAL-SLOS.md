# Operational SLOs

> Target audience: Operations, Engineering, Compliance  
> Last updated: 2026-05-09

---

## 1. Coursera Sync

| SLO | Threshold | Measurement |
|-----|-----------|-------------|
| Freshness | ≤ 24 hours | `isSyncStale(lastSyncAt)` |
| Error rate | < 1 % | Failed sync runs / total sync runs |
| Recovery | Alert + auto-retry within 1 hour | On-call rotation |

**Owner:** Data Engineering  
**Escalation:** #ops-alerts

---

## 2. xAPI Ingestion

| SLO | Threshold | Measurement |
|-----|-----------|-------------|
| Latency | < 5 minutes from statement → queryable | xAPI pipeline lag |
| Completeness | 100 % (no dropped statements) | Reconciliation count vs source |
| Error rate | < 0.5 % | Failed ingestion / total statements |

**Owner:** Data Engineering  
**Escalation:** #ops-alerts

---

## 3. Employer Pipeline Integrity

| SLO | Threshold | Measurement |
|-----|-----------|-------------|
| Orphan records | 0 | `verifyPipelineIntegrity()` |
| Check frequency | Every 4 hours | Cron + API endpoint |
| Alert latency | < 15 minutes from detection | PagerDuty or Slack |

**Owner:** Engineering  
**API endpoint:** `GET /api/admin/integrity/employer-pipeline`

---

## 4. WIOA Metrics

| SLO | Threshold | Measurement |
|-----|-----------|-------------|
| Report accuracy | 100 % | Reconcile against partner LMS / state system |
| Generation time | < 30 seconds | `generateWioaMetrics()` execution |
| Delivery | Monthly, by the 5th business day | Automated export + review |

**Owner:** Compliance / Programs  
**API:** `generateWioaMetrics(partnerId, dateRange)`

---

## Runbooks

1. **Sync stale?** Check `SYNC_STALE_THRESHOLD_HOURS`. Inspect cron / worker logs. Retry manually if needed.
2. **Pipeline integrity alert?** Hit `GET /api/admin/integrity/employer-pipeline`, inspect `issues[]`, clean up orphan rows.
3. **WIOA report discrepancy?** Reconcile `enrolledCount` against partner roster, `placedCount` against employer confirmations.

---

*All thresholds are targets, not guarantees. Breaches trigger incident review.*
