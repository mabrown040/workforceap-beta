# Prisma Performance Audit — 2026-05-21

**Repo:** `wap-repo`  
**Scope:** `app/api/**`, `app/(portal)/**/page.tsx`, server actions (`'use server'` in `app/**`)  
**Schema:** `prisma/schema.prisma` (formatted via `npx prisma format`; no schema diff)  
**Method:** Static review of all `prisma.*` call sites against N+1 patterns, `select`/`include` usage, and `@@index` coverage.

---

## Executive summary

| Severity | Count | Themes |
|----------|-------|--------|
| **Critical** | 5 | Per-member loops in bulk admin/counselor routes; cron `notIn` anti-pattern; counselor dashboard query explosion at `take: 5000` |
| **High** | 8 | Missing composite indexes on notifications, job applications, course enrollments; admin export unscoped aggregates; employer dashboard over-fetch |
| **Medium** | 7 | Large `take` caps (500–5000), join-filter queries without employer-path indexes, keyword search on job descriptions |
| **Low** | 6 | Single-row lookups with PK/unique indexes; well-batched counselor member API |

**No `Promise.all(array.map(async => prisma.*))` N+1 anti-pattern was found** in scope. The dominant risk is **`for (...) { await prisma.* }`** in bulk/cron routes and **unbounded or high-cap scans** on hot portal pages.

Under paid-traffic load, the highest-impact fixes are: (1) notification and job-board indexes, (2) cap/paginate counselor and employer roster queries, (3) refactor bulk admin loops to batched writes, (4) rewrite inactive-nudge eligibility as anti-joins.

---

## Methodology

For each `prisma.*` call we checked:

1. **N+1** — Inside `for`/`for...of` with `await prisma`, or `Promise.all` over per-item queries (none of the latter found).
2. **Over-fetch** — Full model rows (`findMany`/`findUnique` without `select`) when response uses ≤3 scalar fields or list cards.
3. **Index coverage** — Every column in `where`, `orderBy`, and join filters cross-referenced against `@@index` / `@@unique` / `@id` in `schema.prisma`.

Models with strong existing index coverage: `MemberEvent` (`userId`, `eventName`, `createdAt` composites), `JobApplication` (`userId`, `status`, `createdAt`), `CounselorAssignment` (`counselorId`, `active`, `memberId`), `AIToolResult` (`userId`, `createdAt`).

Models with notable gaps: `Notification`, `JobPostingApplication` (status + date sorts), `CourseEnrollment` (`createdAt`), `Application` (`status` + `submittedAt`), `CourseProgress` (`status`), `User` (`notificationsReminders`, `assessmentCompletedAt`).

---

## Top 10 slowest queries under load (predicted)

Ranked by **expected QPS × row/IO cost** once paid traffic hits member signup → dashboard → jobs/notifications, plus counselor/employer portal usage.

| Rank | Query / route | Why it will hurt | Prediction |
|------|---------------|------------------|------------|
| **1** | `GET /api/member/notifications` — `notification.findMany` + 2× `count` | Polled on every portal nav refresh; no `(userId, createdAt)` index; full rows including JSON `data` | **50–200 ms** p95 at 10k+ notifications/user; sort becomes external merge |
| **2** | `GET /api/(portal)/dashboard/jobs` — `job.findMany` WHERE `status='live'` + keyword `contains` on `description` | Paid landing → job board; fetches full `description` TEXT for 100 rows; no partial index on live jobs | **100–500 ms** p95 with keyword filter (seq scan + ILIKE) |
| **3** | `app/(portal)/dashboard/page.tsx` — `Promise.allSettled` of 9 queries | Every authenticated member home load; connection pool pressure | **80–150 ms** p95 aggregate; tail latency from slowest sibling |
| **4** | `app/(portal)/counselor/page.tsx` — assignments `take:5000` + threads + `message.groupBy` + `message.findMany` OR pairs | Counselors with large caseloads; OR-of-pairs on latest messages is O(threads) | **200 ms–2 s** p95 for 500+ active threads |
| **5** | `app/(portal)/employer/page.tsx` — `job.findMany take:5000` + 7 parallel counts on `jobPostingApplication` via join | Employer dashboard on every visit; no index path for employer → applications | **150–800 ms** p95 for employers with 100+ jobs |
| **6** | `cron/inactive-nudge` — 2× `memberEvent.groupBy` + `user.findMany id NOT IN (...)` + loop `create` | Weekly but scans entire `member_events`; `notIn` array can be 50k+ UUIDs | **5–30 s** cron runtime; blocks connection pool if concurrent |
| **7** | `GET /api/admin/members/export` — `user.findMany take:2000` + unscoped `memberEvent.groupBy` / `courseProgress.groupBy` | Admin export during ops spikes; aggregates not limited to exported IDs | **2–10 s** per export |
| **8** | `lib/portal/navBadges.ts` — role-specific counts | Called from `/api/portal/nav-badges` every ~15s per tab | **30–100 ms** × concurrent sessions |
| **9** | `app/(portal)/counselor/students/[memberId]/page.tsx` — unbounded `memberEvent.findMany` + `take:5000` history | Deep-link from roster; event table grows unbounded per member | **100 ms–1 s** p95 for long-tenure members |
| **10** | `POST /api/admin/members/bulk-update` — up to 100× multi-query loop | Admin bulk actions; 600–800 round-trips per 100-member batch | **10–60 s** request time under load |

---

## Critical findings

### C1 — Admin bulk update: per-member Prisma loop

**File:** `app/api/admin/members/bulk-update/route.ts` (L91–187)

| Check | Result |
|-------|--------|
| N+1 | **Yes** — `for (const member of members)` with 4–8 `await prisma.*` per iteration (max 100 members) |
| Over-fetch | Initial `findMany` uses `select` ✓ |
| Index | `counselorAssignment` `(memberId, active)`, unique `(counselorId, memberId)` ✓ |

**Recommendation:** Batch `user.updateMany` with `id IN (...)`, bulk deactivate assignments, `createMany` for new assignments, single prefetch of all counselor threads.

---

### C2 — Counselor bulk follow-up: per-member thread + transaction

**File:** `app/api/counselor/bulk-followup/route.ts` (L87–171)

| Check | Result |
|-------|--------|
| N+1 | **Yes** — `for (const memberId of uniqueIds)` → `getOrCreateMemberCounselorThread` + `$transaction` per member (max 50) |
| Over-fetch | Member prefetch uses `select` ✓ |
| Index | `Message.(threadId, createdAt)`, `MemberEvent.(userId, eventName, createdAt)` ✓ |

**Recommendation:** Preload all member threads in one query; batch `message.createMany` + `memberEvent.createMany`.

---

### C3 — Admin bulk email: same N+1 pattern

**File:** `app/api/admin/members/bulk-email/route.ts` (L99–160)

Same structure as C2 — up to **100** sequential thread lookups + transactions.

---

### C4 — Cron inactive-nudge: mega `notIn` + sequential writes

**File:** `app/api/cron/inactive-nudge/route.ts` (L22–68)

```typescript
const members = await prisma.user.findMany({
  where: {
    deletedAt: null,
    notificationsReminders: true,
    id: { notIn: [...activeUserIds, ...nudgedUserIds] },
  },
  take: 1000,
});
```

| WHERE column | Index? |
|--------------|--------|
| `deletedAt` | ✓ `(deletedAt)` |
| `notificationsReminders` | **✗ none** |
| `memberEvent.createdAt >= 7d` (groupBy) | Partial `(createdAt)` only |

**Recommendation:** Replace `notIn` with `NOT EXISTS` subqueries; batch `memberEvent.createMany`; add partial index on eligible users.

---

### C5 — Counselor dashboard: unbounded roster + expensive latest-message fetch

**File:** `app/(portal)/counselor/page.tsx` (L40–106)

| Call | Issue |
|------|-------|
| `counselorAssignment.findMany take:5000` | Full caseload in one request |
| `messageThread.findMany take:5000` | Scales with roster |
| `message.findMany WHERE OR: [{threadId, createdAt}, ...]` | Up to 5000 OR pairs — planner-unfriendly |

**Recommendation:** Paginate roster; use `DISTINCT ON (thread_id) ORDER BY created_at DESC` or a materialized last-message column.

---

## High findings

### H1 — Admin members export: unscoped aggregates

**File:** `app/api/admin/members/export/route.ts` (L28–103)

- `memberEvent.groupBy` ×2 WHERE `createdAt >= 30d` — **no `userId` filter** (full-table scan)
- `courseProgress.groupBy` WHERE `status = COMPLETED` — **no index on `status`**
- `memberProgramProgress.findMany take:500` — **no WHERE** (wrong subset for 2000 exported members)

---

### H2 — Employer dashboard: multiple large reads

**File:** `app/(portal)/employer/page.tsx` (L72–144)

- `job.findMany take:5000` — over-fetches full `description` for KPI math
- `jobPostingApplication` counts via `job.employerId` join — **no employer-path index**

---

### H3 — Notifications API: full rows, weak sort index

**File:** `app/api/member/notifications/route.ts` (L17–29)

Missing `(userId, createdAt DESC)` and partial unread index; no `select` clause.

---

### H4 — Counselor student detail: unbounded history

**File:** `app/(portal)/counselor/students/[memberId]/page.tsx`

`memberEvent.findMany` with **no `take`**; applications/matches/messages at `take: 5000`.

---

### H5 — Cron course-accountability

**File:** `app/api/cron/course-accountability/route.ts`

`courseEnrollment.findMany` on `createdAt` window — **no `createdAt` index**; `memberEvent.create` in loop.

---

### H6 — Cron applicant-followup

**File:** `app/api/cron/applicant-followup/route.ts`

`application.findMany` on `status` + `submittedAt` — **no `(status, submitted_at)` composite**.

---

### H7 — Cron milestone-celebration

**File:** `app/api/cron/milestone-celebration/route.ts`

`user.findMany` on `assessmentCompletedAt` — **no index**.

---

### H8 — Member dashboard: parallel query fan-out

**File:** `app/(portal)/dashboard/page.tsx` (L233–297)

Nine parallel queries — well-indexed individually, but **9 connections per page view**.

---

## Medium findings

| ID | Location | Issue |
|----|----------|-------|
| M1 | `employer/applications/page.tsx` | `jobPostingApplication` filtered by `job.employerId` — join path |
| M2 | `employer/jobs/page.tsx` | Four `take: 5000` queries for bulk-action ID lists |
| M3 | `counselor/students/page.tsx` L99 | Hot queue filter on `icon` + `createdAt` not covered by index |
| M4 | `api/counselor/analytics/route.ts` | `atRiskAlert` missing `(userId, status)` |
| M5 | `api/admin/members/bulk-export/route.ts` | Generally good — batched `select` ✓ |
| M6 | Message pages | Full `message.body` — acceptable for chat |
| M7 | `api/(portal)/dashboard/jobs/route.ts` | List includes full job `description`; keyword ILIKE on cold cache |

---

## Recommended index additions

Paste-ready SQL for a migration. Use `CONCURRENTLY` in production.

```sql
-- H3: Notifications (highest paid-traffic ROI)
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_user_created_at_idx
  ON notifications (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id)
  WHERE read_at IS NULL;

-- H2 / M1: Employer portal application filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS job_posting_applications_status_applied_idx
  ON job_posting_applications (status, applied_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_employer_status_idx
  ON jobs (employer_id, status);

-- M7: Public job board (live listings)
CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_live_updated_at_idx
  ON jobs (status, updated_at DESC)
  WHERE status = 'live';

-- H6: Applicant follow-up cron
CREATE INDEX CONCURRENTLY IF NOT EXISTS applications_status_submitted_at_idx
  ON applications (status, submitted_at);

-- H5: Course accountability cron
CREATE INDEX CONCURRENTLY IF NOT EXISTS course_enrollments_created_at_idx
  ON course_enrollments (created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS member_events_entity_event_idx
  ON member_events (entity_type, entity_id, event_name);

-- C4: Inactive nudge cron
CREATE INDEX CONCURRENTLY IF NOT EXISTS member_events_event_created_user_idx
  ON member_events (event_name, created_at DESC, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS users_inactive_nudge_eligible_idx
  ON users (deleted_at, notifications_reminders)
  WHERE deleted_at IS NULL AND notifications_reminders = true;

-- H7: Milestone celebration cron
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_assessment_completed_at_idx
  ON users (assessment_completed_at)
  WHERE assessment_completed = true AND deleted_at IS NULL;

-- H1: Admin export aggregates
CREATE INDEX CONCURRENTLY IF NOT EXISTS course_progress_status_user_idx
  ON course_progress (status, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS member_events_created_user_idx
  ON member_events (created_at DESC, user_id);

-- M3 / M4: Counselor hot queue + at-risk
CREATE INDEX CONCURRENTLY IF NOT EXISTS member_nba_hot_queue_idx
  ON member_next_best_actions (member_id, status, icon, created_at DESC, priority DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS at_risk_alerts_user_status_idx
  ON at_risk_alerts (user_id, status);
```

---

## Prioritized remediation (no code in this review)

1. **Apply index migration above** — low risk, immediate wins on notifications + job board + crons.
2. **Refactor bulk admin/counselor routes** — eliminate per-member loops (C1–C3).
3. **Rewrite inactive-nudge eligibility** — anti-join instead of `notIn` (C4).
4. **Paginate counselor/employer rosters** — replace `take: 5000` defaults (C5, H2, M2).
5. **Fix admin export scoping** — limit groupBys to exported `userId IN (...)` (H1).
6. **Add `select` to notifications list** — drop unused columns (H3).
7. **Cap counselor student event history** — add `take` + `orderBy createdAt desc` (H4).

---

## Audit stats

| Area | Files with `prisma.*` | Approx. call sites |
|------|----------------------|-------------------|
| `app/api/**` | ~180 route files | ~450+ |
| `app/(portal)/**/page.tsx` | 58 pages | ~120 |
| Server actions | 4 with Prisma | ~10 |

**Review type:** Static analysis only. Validate with `EXPLAIN (ANALYZE, BUFFERS)` on staging after index migration.
