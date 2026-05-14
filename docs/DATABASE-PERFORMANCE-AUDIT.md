# Database Performance Audit

> **Date:** 2026-05-13  
> **Scope:** Prisma schema + application query patterns in `app/` and `lib/`  
> **Database:** Supabase PostgreSQL  
> **Focus:** Mobile-first users on slow networks, admin dashboards, high-traffic cron jobs

---

## 1. Executive Summary

| Category | Count | Risk Level |
|----------|-------|------------|
| Unbounded `findMany` (no `take`) | ~45+ | 🔴 High |
| N+1 / include-all-messages risks | 6 | 🔴 High |
| Missing composite indexes for `orderBy` | 12 | 🟡 Medium |
| Missing FK indexes | 3 | 🟡 Medium |
| Missing text-search indexes | 6 | 🟡 Medium |
| Aggregations on large tables without time bounds | 8 | 🟡 Medium |
| `in` clauses with unbounded arrays | 7 | 🟡 Medium |

**Quick wins** (low effort, high impact):
1. Add `@@index([processed, createdAt])` to `XapiStatement` — unblocks xAPI ingestion cron
2. Add `@@index([userId, createdAt])` to `Goal`, `JobApplication`, `AIToolResult` — fixes the 3 most common unbounded dashboard queries
3. Add `@@index([memberId, active, assignedAt(sort: Desc)])` to `CounselorAssignment` — fixes counselor inbox sort
4. Cap `getDailyActivity` in `lib/admin/metrics.ts` to a max reasonable row count
5. Rewrite SLA breach queries in `lib/messages/superAdminMessageQueries.ts` to avoid `include: { messages: { orderBy: ... } }` loading entire thread histories

---

## 2. Slow Query Patterns Found

### 2.1 Unbounded `findMany` without `take` / `limit`

These queries return **all rows** matching a `where` clause. As tables grow, they will OOM the Node process or timeout the request.

| File | Query | Table | Risk |
|------|-------|-------|------|
| `lib/readiness/score.ts:174-180` | `goal.findMany({ where: { userId } })` | `goals` | Per-member dashboard call; unbounded goals |
| `lib/readiness/score.ts:174-180` | `jobApplication.findMany({ where: { userId } })` | `job_applications` | Per-member; unbounded applications |
| `lib/readiness/score.ts:174-180` | `aIToolResult.findMany({ where: { userId } })` | `ai_tool_results` | Per-member; AI usage can be high |
| `lib/readiness/score.ts:174-180` | `resourceProgress.findMany({ where: { userId } })` | `resource_progress` | Per-member |
| `lib/readiness/score.ts:174-180` | `learningProgress.findMany({ where: { userId } })` | `learning_progress` | Per-member |
| `lib/readiness/score.ts:174-180` | `pathwayStepProgress.findMany({ where: { userId } })` | `pathway_step_progress` | Per-member |
| `lib/readiness/score.ts:174-180` | `userCertification.findMany({ where: { userId } })` | `user_certifications` | Per-member |
| `lib/readiness/score.ts:236-242` | Same 7 queries with `userId: { in: userIds }` | — | Batch version; multiplies risk |
| `lib/recap/generate.ts:60-66` | `goal`, `jobApplication`, `aIToolResult`, `resourceProgress`, `pathwayStepProgress`, `userCertification` | — | Weekly recap cron; no limits |
| `lib/recap/generate.ts:266-271` | Same 6 queries batch (`in: memberIds`) | — | Batch weekly recap |
| `lib/member/exportData.ts:65-122` | 30+ unbounded queries | Multiple | GDPR export; could load member's entire history |
| `lib/admin/metrics.ts` (`getDailyActivity`) | `memberEvent.findMany({ createdAt: { gte, lte } })` | `member_events` | Fetches **all** events in 14-day window per org |
| `lib/admin/metrics.ts` (`getAdminMetrics`) | `allUsersResult` = `user.findMany({ select: { id: true } })` | `users` | Loads **every user ID** in org |
| `lib/portal/navBadges.ts:141-210` | `counselorAssignment.findMany`, `messageThread.findMany`, `partnerReferral.findMany`, `partnerUser.findMany` | — | Nav badge counts; no limits |
| `lib/messages/superAdminMessageQueries.ts` | `messageThread.findMany({ include: { messages: { orderBy... } } })` | `messages` | Loads **all messages** for matching threads |
| `app/admin/audit-logs/page.tsx` | `memberEvent.findMany({ where: { createdAt: { gte: thirtyDaysAgo } } })` | `member_events` | 30-day window; millions of rows possible |
| `lib/content/careerBriefPersonalization.ts` | `goal`, `resourceProgress`, `learningProgress`, `pathwayStepProgress`, `userCertification` | — | Unbounded per-member |
| `lib/messages/employerInbox.ts:56` | `jobPostingApplication.findMany({ where: { jobId: { in: jobIds } } })` | `job_posting_applications` | No limit |
| `lib/messages/counselorInbox.ts:43` | `user.findMany({ where: { id: { in: memberIds } } })` | `users` | Inbox builder; array size unbounded |

#### Recommended fixes

1. **Add sensible `take` caps** to every per-member query:
   ```ts
   // lib/readiness/score.ts
   prisma.goal.findMany({ where: { userId }, take: 100 }),
   prisma.jobApplication.findMany({ where: { userId }, take: 200 }),
   prisma.aIToolResult.findMany({ where: { userId }, take: 500 }),
   ```

2. **For batch operations** (`getScoreBreakdowns`, weekly recap), **process in chunks** rather than one giant `in` clause:
   ```ts
   const CHUNK_SIZE = 100;
   for (let i = 0; i < memberIds.length; i += CHUNK_SIZE) {
     const chunk = memberIds.slice(i, i + CHUNK_SIZE);
     // ... run queries with chunk
   }
   ```

3. **For admin metrics**, replace `findMany` + in-memory bucketing with **raw SQL date-bucketing** or use `time_bucket` (if TimescaleDB) or simple `GROUP BY DATE(created_at)` queries.

4. **For GDPR export**, add a `since?: Date` parameter and default to 2 years. Document that full-history export is available on request.

---

### 2.2 `include` causing N+1 / memory bloat

Prisma `include` translates to `LEFT JOIN`. When the included relation has many rows, the result set explodes.

| File | Pattern | Problem |
|------|---------|---------|
| `lib/messages/superAdminMessageQueries.ts:24-28` | `include: { messages: { orderBy: { createdAt: 'desc' } } }` | Loads **entire message history** for every thread matching `threadIds` |
| `lib/messages/superAdminMessageQueries.ts:71-75` | Same pattern | Same issue |
| `lib/messages/superAdminMessageQueries.ts:119-123` | Same pattern | Same issue |
| `lib/member/exportData.ts:83` | `messageThread.findMany({ include: { messages: true } })` | Loads **all messages for all threads** for a member |
| `lib/readiness/score.ts:158-220` | `user.findMany({ include: { profile: { select: ... } } })` | Less severe (1:1), but `include` on `findMany` still a join |
| `lib/partner/referralBundle.ts:114` | `include: { member: { select: { ... } }, partner: { select: { ... } } }` | Moderate (1:1 relations) |
| `lib/portal/workflowEvents.ts:54` | `include: { actor: { select: { fullName, email } } }` | Moderate |

#### Recommended fixes

**For message threads (critical):**

Rewrite SLA queries to use **raw SQL with window functions** instead of loading all messages:

```ts
// Instead of loading all messages for all threads:
const threads = await prisma.messageThread.findMany({
  where: { id: { in: threadIds } },
  include: { messages: { orderBy: { createdAt: 'desc' } } }, // DANGEROUS
});

// Use raw SQL:
const rows = await prisma.$queryRaw<{ threadId: string; latestMemberMsgAt: Date | null; hasStaffAfter: boolean }[]>`
  WITH latest_member_msgs AS (
    SELECT DISTINCT ON (thread_id)
      thread_id, created_at
    FROM messages
    WHERE thread_id IN (${Prisma.join(threadIds)})
      AND author_id = (SELECT member_id FROM message_threads WHERE id = thread_id)
    ORDER BY thread_id, created_at DESC
  ),
  has_staff_after AS (
    SELECT DISTINCT ON (m.thread_id)
      m.thread_id, true AS has_staff_after
    FROM messages m
    JOIN latest_member_msgs lmm ON lmm.thread_id = m.thread_id
    WHERE m.author_id != (SELECT member_id FROM message_threads WHERE id = m.thread_id)
      AND m.created_at > lmm.created_at
  )
  SELECT ...
`;
```

**For export data:**

Replace `include: { messages: true }` with a **separate bounded query**:
```ts
const threads = await prisma.messageThread.findMany({ where: { memberId: userId } });
const threadIds = threads.map(t => t.id);
const messages = await prisma.message.findMany({
  where: { threadId: { in: threadIds } },
  take: 5000, // cap it
  orderBy: { createdAt: 'desc' },
});
// Merge in memory
```

---

### 2.3 `orderBy` without matching composite index

When a query has `WHERE x = ? ORDER BY y DESC`, PostgreSQL needs either:
- An index on `(x, y DESC)`, or
- It sorts in memory (fast for small sets, slow for large)

| File | Query | Missing Index |
|------|-------|---------------|
| `lib/readiness/score.ts` | `goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })` | `@@index([userId, createdAt])` on `Goal` |
| `lib/readiness/score.ts` | `jobApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })` | `@@index([userId, createdAt])` on `JobApplication` |
| `lib/readiness/score.ts` | `aIToolResult.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })` | `@@index([userId, createdAt])` on `AIToolResult` |
| `lib/messages/counselorThread.ts:17` | `counselorAssignment.findFirst({ where: { memberId, active: true }, orderBy: { assignedAt: 'desc' } })` | `@@index([memberId, active, assignedAt(sort: Desc)])` on `CounselorAssignment` |
| `lib/member/getMemberState.ts:365` | `courseEnrollment.findFirst({ where: { userId, isPrimary: true }, orderBy: { enrolledAt: 'desc' } })` | `@@index([userId, isPrimary, enrolledAt(sort: Desc)])` on `CourseEnrollment` |
| `lib/partner/referralBundle.ts:117` | `partnerReferral.findMany({ where: { memberId }, orderBy: { referredAt: 'desc' } })` | `@@index([memberId, referredAt(sort: Desc)])` on `PartnerReferral` |
| `lib/coursera/replayPendingXapi.ts:36` | `xapiStatement.findMany({ where: { processed: false }, orderBy: { createdAt: 'asc' } })` | `@@index([processed, createdAt])` on `XapiStatement` |
| `lib/admin/audit-logs/page.tsx` | `memberEvent.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, orderBy: { createdAt: 'desc' } })` | Existing `[createdAt]` helps; add `@@index([eventName, createdAt])` for filtered views |
| `app/api/admin/testimonials/route.ts` | `testimonial.findMany({ ... orderBy: { createdAt: 'desc' } })` | `@@index([status, createdAt])` or `@@index([createdAt])` exists |
| `lib/messages/counselorInbox.ts:54` | `messageThread.findMany({ where: { memberId: { in: memberIds } } })` sorted later in memory | `@@index([memberId, updatedAt(sort: Desc)])` |
| `lib/portal/workflowEvents.ts:52` | `portalWorkflowEvent.findMany({ where: { employerId }, orderBy: { createdAt: 'desc' } })` | Existing `[employerId, createdAt]` — OK |
| `lib/admin/metrics.ts` | `memberEvent.findMany({ where: { createdAt: { gte... } }, distinct: ['userId'] })` | `[createdAt]` exists but `DISTINCT` still expensive |

#### Recommended Prisma additions

```prisma
model Goal {
  // ... existing fields
  @@index([userId])
  @@index([userId, createdAt])  // <-- ADD
}

model JobApplication {
  // ... existing fields
  @@index([userId])
  @@index([userId, createdAt])  // <-- ADD
}

model AIToolResult {
  // ... existing fields
  @@index([userId])
  @@index([userId, toolType])
  @@index([userId, createdAt])  // <-- ADD
}

model CounselorAssignment {
  // ... existing fields
  @@index([counselorId, memberId])
  @@index([memberId, active])
  @@index([counselorId, active])
  @@index([memberId, active, assignedAt(sort: Desc)])  // <-- ADD
}

model CourseEnrollment {
  // ... existing fields
  @@index([userId, programSlug])
  @@index([organizationId])
  @@index([programSlug])
  @@index([userId, isPrimary])
  @@index([userId, isPrimary, enrolledAt(sort: Desc)])  // <-- ADD
  @@index([enrolledByAdminId])
}

model PartnerReferral {
  // ... existing fields
  @@index([partnerId, memberId])
  @@index([partnerId])
  @@index([memberId])
  @@index([assignedPartnerUserId])
  @@index([memberId, referredAt(sort: Desc)])  // <-- ADD
}

model XapiStatement {
  // ... existing fields
  @@index([actorEmail])
  @@index([actorAccountName, actorHomePage])
  @@index([createdAt])
  @@index([courseId, courseItemId])
  @@index([actorEmail, courseId])
  @@index([processed, createdAt])  // <-- ADD
}

model MessageThread {
  // ... existing fields
  @@index([counselorUserId])
  @@index([kind])
  @@index([staffUserId])
  @@index([kind, createdAt])
  @@index([memberId, updatedAt(sort: Desc)])  // <-- ADD (for inbox sorts)
}

model Testimonial {
  // ... existing fields
  @@index([memberId])
  @@index([status])
  @@index([source])
  @@index([reviewedBy])
  @@index([deletedAt])
  @@index([createdAt])
  @@index([status, createdAt])  // <-- ADD
}
```

---

### 2.4 Aggregations (`count`, `groupBy`) on large tables

| File | Query | Table | Concern |
|------|-------|-------|---------|
| `lib/outcomes/publicPlacementOutcomes.ts:33-40` | `count()`, `groupBy` by `programSlug`, `fundingSource`, `retentionStatus` | `placement_records` | Full table scan if no `where` time bound |
| `lib/outcomes/placementPublicMetrics.ts:27-34` | `count()`, `findFirst({ orderBy: { placedAt: 'desc' } })` | `placement_records` | `findFirst` with `orderBy` needs index |
| `lib/cron/wioa-report.ts:45-88` | `user.count()`, `courseProgress.groupBy`, `courseEnrollment.groupBy`, `placementRecord.groupBy` | Multiple | Cron job; acceptable if off-peak |
| `lib/admin/metrics.ts:83` | `aIToolResult.groupBy({ by: ['toolType'] })` | `ai_tool_results` | No time bound; scans entire table |
| `lib/admin/metrics.ts:229` | `user.groupBy({ by: ['enrolledProgram'] })` | `users` | Scans all users in org |
| `lib/admin/boardOutcomes.ts:525` | `application.groupBy({ by: ['status'] })` | `applications` | Scans all applications |
| `app/admin/audit-logs/page.tsx` | `memberEvent.groupBy({ by: ['userId'], _count: true })` | `member_events` | 30-day window; still heavy |

#### Recommended fixes

1. **Always bound aggregations by time** when possible:
   ```ts
   // Instead of:
   prisma.placementRecord.groupBy({ by: ['programSlug'], _count: true });
   // Use:
   prisma.placementRecord.groupBy({
     by: ['programSlug'],
     where: { placedAt: { gte: startOfYear } },
     _count: true,
   });
   ```

2. **For `groupBy` on `member_events`** (audit logs), consider a **materialized view** or a **daily rollup table**:
   ```sql
   CREATE MATERIALIZED VIEW daily_member_event_counts AS
   SELECT DATE(created_at) AS day, event_name, COUNT(*) AS cnt
   FROM member_events
   GROUP BY DATE(created_at), event_name;
   ```
   Refresh via cron every hour.

3. **For `findFirst({ orderBy: { placedAt: 'desc' } })`**, the existing `@@index([placedAt])` on `PlacementRecord` helps, but a partial index `WHERE placed_at IS NOT NULL` would be even faster.

---

### 2.5 `in` clauses with potentially large arrays

Prisma converts `in: [id1, id2, ...]` to SQL `IN (id1, id2, ...)`. PostgreSQL has a ~32k parameter limit and degrades past a few thousand values.

| File | Pattern | Max array size |
|------|---------|---------------|
| `lib/readiness/score.ts:236` | `userId: { in: userIds }` | Unbounded (all members) |
| `lib/recap/generate.ts:266` | `userId: { in: memberIds }` | Unbounded (all members) |
| `lib/messages/counselorInbox.ts:43` | `id: { in: memberIds }` | Counselor caseload |
| `lib/messages/counselorInbox.ts:54` | `memberId: { in: memberIds }` | Counselor caseload |
| `lib/employer/workQueue.ts` | `jobId: { in: jobIds }` | Employer job count |
| `lib/counselor/triageFlags.ts:250` | `userId: { in: userIds }` | Admin view |

#### Recommended fixes

1. **Chunk arrays** to ≤1,000 IDs per query:
   ```ts
   async function chunkedFindMany<T>(
     ids: string[],
     chunkSize: number,
     queryFn: (chunk: string[]) => Promise<T[]>
   ): Promise<T[]> {
     const results: T[] = [];
     for (let i = 0; i < ids.length; i += chunkSize) {
       results.push(...await queryFn(ids.slice(i, i + chunkSize)));
     }
     return results;
   }
   ```

2. **For very large sets**, use a **temporary table** or `VALUES` clause in raw SQL instead of `IN`.

---

## 3. Missing Indexes in Prisma Schema

### 3.1 Foreign keys without explicit `@index`

| Model | Field | Why it matters |
|-------|-------|----------------|
| `Message` | `authorId` | Frequently filtered in unread counts; nullable FK |
| `User` | `courseraEnrollmentApprovedById` | Admin audit trail lookups |
| `User` | `pipelineBoardStage` | Pipeline board filters by stage |

```prisma
model Message {
  // ...
  @@index([threadId, createdAt])
  @@index([authorId, createdAt])  // <-- ADD (unread counts, SLA queries)
}

model User {
  // ...
  @@index([organizationId])
  @@index([wioaReviewStatus])
  @@index([enrolledProgram])
  @@index([createdAt])
  @@index([deletedAt])
  @@index([email])
  @@index([staleTrainingDetectedAt])
  @@index([lastCourseraAutoSyncAt])
  @@index([courseraEnrollmentApproved])
  @@index([wioaReviewedByUserId])
  @@index([courseraEnrollmentApprovedById])  // <-- ADD
  @@index([pipelineBoardStage])               // <-- ADD
}
```

### 3.2 Text search fields (need GIN or `pg_trgm`)

Current admin search uses `contains` with `mode: 'insensitive'`:

```ts
// app/admin/audit-logs/page.tsx
{ user: { fullName: { contains: q, mode: 'insensitive' } } }
```

B-tree indexes **cannot** efficiently support `ILIKE '%term%'` (leading wildcard). Consider:

1. **Create GIN indexes with `pg_trgm`** (requires `CREATE EXTENSION pg_trgm;`):
   ```sql
   CREATE INDEX idx_users_full_name_trgm ON users USING gin (full_name gin_trgm_ops);
   CREATE INDEX idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
   CREATE INDEX idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);
   ```

2. **Or switch to `tsvector` / full-text search** for larger text fields (`job.description`, `blog_post.content`).

| Field | Search usage | Recommended index |
|-------|-------------|-------------------|
| `users.full_name` | Admin search, counselor search | `gin_trgm_ops` |
| `users.email` | Admin search, login | `gin_trgm_ops` |
| `jobs.title` | Job board search | `gin_trgm_ops` |
| `jobs.description` | Job board search | `tsvector` or `gin_trgm_ops` |
| `messages.body` | Message search (future) | `gin_trgm_ops` |
| `blog_posts.title` | Blog search | `gin_trgm_ops` |
| `blog_posts.content` | Blog search | `tsvector` |

> **Note:** Prisma does not natively support `pg_trgm` or `tsvector` indexes. These must be added via raw SQL migration or `db pull` after manual creation.

### 3.3 Status / enum filters missing indexes

| Model | Field | Query usage |
|-------|-------|-------------|
| `AIJobMatch` | `status` | Job matching pipeline filters by status |
| `PortalWorkflowEvent` | `scope` | Admin workflow filters |
| `PortalWorkflowEvent` | `kind` | Admin workflow filters |
| `MessageThread` | `kind` | Has index `[kind]`, OK |
| `XapiStatement` | `processed` | Replay cron filters by `processed: false` |

```prisma
model AIJobMatch {
  // ...
  @@index([jobId])
  @@index([studentId])
  @@index([status])  // <-- ADD
}

model PortalWorkflowEvent {
  // ...
  @@index([employerId, createdAt])
  @@index([partnerId, createdAt])
  @@index([actorUserId])
  @@index([scope, createdAt])  // <-- ADD
  @@index([kind, createdAt])   // <-- ADD
}
```

---

## 4. Focus Area Deep-Dives

### 4.1 Member Dashboard (`lib/member/getMemberState.ts`)

**Current state:** Reasonably well-optimized. Uses `findUnique` + `take: 1` for applications, `Promise.all` for parallel loads.

**One concern:** `message.count` for unread uses `thread: { memberId: userId }` — this is a nested relation filter that joins `message_threads`. The existing `messages` index is `(thread_id, created_at)`, which can't help with `memberId` lookups.

**Fix:** Rewrite unread count to use `threadId` directly (already fetched in `loadMemberFullContext`):
```ts
const unreadCount = await prisma.message.count({
  where: {
    threadId: recentMessagesRaw?.id, // use the ID directly
    authorId: { not: userId },
    createdAt: { gt: messageThreadLastReadAt ?? new Date(0) },
  },
});
```

### 4.2 Admin Dashboard (`lib/admin/metrics.ts`)

**Critical issue:** `getDailyActivity` fetches **all rows** in a 14-day window for 4 tables simultaneously. With 10k active members, `member_events` could have millions of rows in that window.

**Recommended fix:** Replace with raw SQL that groups server-side:
```ts
const rows = await prisma.$queryRaw<{ day: Date; events: number; aiTools: number; applications: number }[]>`
  SELECT
    DATE(created_at) AS day,
    COUNT(*) FILTER (WHERE event_name = 'ai_tool_run_started' AND entity_type = 'ai_tool') AS aiTools,
    COUNT(*) FILTER (WHERE ...) AS events,
    ...
  FROM member_events
  WHERE created_at >= ${rangeStart} AND created_at <= ${rangeEnd}
    AND user_id IN (SELECT id FROM users WHERE organization_id = ${orgId}::uuid)
  GROUP BY DATE(created_at)
`;
```

Or better: maintain a **daily rollup table** and read from that.

### 4.3 Counselor Inbox (`lib/messages/counselorInbox.ts`)

**Current state:** Uses raw SQL for `latestMsgs`, `unreadRows`, and `lastEventRows` — excellent.

**Minor concern:** `messageThread.findMany({ where: { memberId: { in: idsNeedingThread } } })` — if `idsNeedingThread` is large, this is an unbounded `IN` clause.

### 4.4 xAPI Events (`lib/xapi/replayPendingXapi.ts`)

The xAPI replay cron does:
```ts
prisma.xapiStatement.findMany({
  where: { processed: false },
  orderBy: { createdAt: 'asc' },
  take: limit,
});
```

The `XapiStatement` table can grow very large (every course interaction). Without `@@index([processed, createdAt])`, this query must scan all unprocessed rows (or all rows if `processed` is not selective).

**Fix:** Add `@@index([processed, createdAt])` immediately.

### 4.5 Audit Logs (`app/admin/audit-logs/page.tsx`)

**Issues:**
1. `memberEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } })` — full table scan on 30 days of events
2. `memberEvent.groupBy({ by: ['userId'], where: { createdAt: { gte: thirtyDaysAgo } }, _count: true })` — expensive DISTINCT
3. Search by `user.fullName` uses `ILIKE '%term%'` — no index can help

**Fix:**
- Add `@@index([createdAt, eventName])` or `@@index([eventName, createdAt])`
- For search, add `pg_trgm` index on `users.full_name` and `users.email`
- Consider archiving events older than 90 days to a separate table

### 4.6 Weekly Recap Generation (`lib/recap/generate.ts`)

**Issues:**
1. `generateWeeklyRecap` loads **all** goals, job apps, AI results, resources, pathways, and certs for a member — no limits.
2. The batch version (`generateWeeklyRecapsForOrg`) does this for **all members at once** with giant `IN` clauses.

**Fix:**
- Add `take: 100` to each unbounded query
- Chunk member arrays to ≤500 per batch
- For very active members, cap historical data (e.g., "last 90 days only")

### 4.7 GDPR Data Export (`lib/member/exportData.ts`)

**Issues:** 35+ unbounded queries, including `include: { messages: true }`.

**Fix:**
- Add `take: 1000` (or configurable) to every query
- For messages, use a separate bounded query as described in §2.2
- Consider streaming the export rather than building the entire object in memory

---

## 5. Recommended Index Additions (Migration-ready)

```prisma
// Add these to prisma/schema.prisma

model User {
  // ... existing fields
  @@index([courseraEnrollmentApprovedById])
  @@index([pipelineBoardStage])
}

model Goal {
  // ... existing fields
  @@index([userId, createdAt])
}

model JobApplication {
  // ... existing fields
  @@index([userId, createdAt])
}

model AIToolResult {
  // ... existing fields
  @@index([userId, createdAt])
}

model CounselorAssignment {
  // ... existing fields
  @@index([memberId, active, assignedAt(sort: Desc)])
}

model CourseEnrollment {
  // ... existing fields
  @@index([userId, isPrimary, enrolledAt(sort: Desc)])
}

model PartnerReferral {
  // ... existing fields
  @@index([memberId, referredAt(sort: Desc)])
}

model XapiStatement {
  // ... existing fields
  @@index([processed, createdAt])
}

model MessageThread {
  // ... existing fields
  @@index([memberId, updatedAt(sort: Desc)])
}

model Message {
  // ... existing fields
  @@index([authorId, createdAt])
}

model AIJobMatch {
  // ... existing fields
  @@index([status])
}

model PortalWorkflowEvent {
  // ... existing fields
  @@index([scope, createdAt])
  @@index([kind, createdAt])
}

model Testimonial {
  // ... existing fields
  @@index([status, createdAt])
}
```

After editing `schema.prisma`:
```bash
npx prisma migrate dev --name add_performance_indexes
```

For `pg_trgm` indexes (must be done via raw SQL in a migration):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY idx_users_full_name_trgm ON users USING gin (full_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);
```

> Use `CONCURRENTLY` to avoid locking the table during index creation on production.

---

## 6. N+1 Queries to Fix

| # | Location | Problem | Effort |
|---|----------|---------|--------|
| 1 | `lib/messages/superAdminMessageQueries.ts` | `include: { messages: ... }` loads entire thread history | Medium |
| 2 | `lib/member/exportData.ts:83` | `messageThread.findMany({ include: { messages: true } })` | Low |
| 3 | `lib/readiness/score.ts:158-220` | `user.findMany({ include: { profile: ... } })` on batch | Low |
| 4 | `lib/recap/generate.ts` | Sequential unbounded queries per member | Medium |
| 5 | `lib/admin/metrics.ts:getDailyActivity` | `findMany` + in-memory bucketing instead of SQL `GROUP BY` | Medium |
| 6 | `lib/portal/navBadges.ts` | Multiple unbounded counts/queries for nav badges | Low |

---

## 7. Effort Estimate & Priority

### 🔴 High Priority (Do this week)

| # | Fix | Files | Effort | Impact |
|---|-----|-------|--------|--------|
| 1 | Add `@@index([processed, createdAt])` to `XapiStatement` | `schema.prisma` | 5 min | Unblocks xAPI cron; prevents table scan |
| 2 | Add `@@index([userId, createdAt])` to `Goal`, `JobApplication`, `AIToolResult` | `schema.prisma` | 10 min | Fixes 3 most common dashboard query patterns |
| 3 | Add `@@index([memberId, active, assignedAt(sort: Desc)])` to `CounselorAssignment` | `schema.prisma` | 5 min | Fixes counselor inbox sort |
| 4 | Add `@@index([memberId, updatedAt(sort: Desc)])` to `MessageThread` | `schema.prisma` | 5 min | Fixes inbox ordering |
| 5 | Cap `findMany` queries in `lib/readiness/score.ts` with `take` | `lib/readiness/score.ts` | 15 min | Prevents OOM on high-activity members |
| 6 | Cap `findMany` queries in `lib/recap/generate.ts` with `take` | `lib/recap/generate.ts` | 15 min | Prevents cron OOM |
| 7 | Rewrite SLA queries to avoid loading all messages | `lib/messages/superAdminMessageQueries.ts` | 2 hrs | Fixes major memory risk |

### 🟡 Medium Priority (Do this month)

| # | Fix | Files | Effort | Impact |
|---|-----|-------|--------|--------|
| 8 | Add `@@index([userId, isPrimary, enrolledAt(sort: Desc)])` to `CourseEnrollment` | `schema.prisma` | 5 min | Faster dashboard program resolution |
| 9 | Add `@@index([memberId, referredAt(sort: Desc)])` to `PartnerReferral` | `schema.prisma` | 5 min | Faster partner views |
| 10 | Add `@@index([status])` to `AIJobMatch` | `schema.prisma` | 5 min | Job matching pipeline |
| 11 | Add `pg_trgm` GIN indexes for admin search | SQL migration | 30 min | Faster admin search |
| 12 | Chunk large `in` arrays in batch queries | `lib/readiness/score.ts`, `lib/recap/generate.ts` | 1 hr | Prevents parameter limit / slow queries |
| 13 | Rewrite `getDailyActivity` to use raw SQL `GROUP BY` | `lib/admin/metrics.ts` | 2 hrs | Massive admin dashboard speedup |
| 14 | Add `take` caps to `lib/member/exportData.ts` | `lib/member/exportData.ts` | 30 min | Prevents export OOM |
| 15 | Rewrite unread count to use `threadId` directly | `lib/member/getMemberState.ts` | 15 min | Removes unnecessary join |

### 🟢 Low Priority (Backlog)

| # | Fix | Files | Effort | Impact |
|---|-----|-------|--------|--------|
| 16 | Add materialized view for daily event rollups | SQL + cron | 4 hrs | Faster admin metrics long-term |
| 17 | Archive `member_events` older than 90 days | SQL + cron | 4 hrs | Keeps hot table small |
| 18 | Add full-text search (`tsvector`) for jobs, blog posts | SQL + API changes | 1 day | Better search UX |
| 19 | Add query timing logs to Prisma client | `lib/db/prisma.ts` | 1 hr | Observability |
| 20 | Add `pg_trgm` index on `messages.body` | SQL migration | 15 min | Future message search feature |

---

## 8. Query Patterns to Monitor

Add these to Sentry or application logs:

1. **Queries returning >1,000 rows** — log warning
2. **Queries taking >500ms** — log error
3. **Queries with `IN` clause >1,000 items** — log warning
4. **`include` that returns >100 nested rows** — log warning
5. **`groupBy` or `count` on `member_events` without time bound** — log error

---

*Audit completed by DenchClaw on 2026-05-13.*
