# Thermo-Nuclear Code Quality Review — Coursera Cluster

**Date:** 2026-07-08  
**Scope:** `lib/coursera/`, `app/api/admin/coursera/`, `app/admin/coursera/page.tsx`, `components/admin/CourseraMappingsAdmin.tsx`  
**Verdict:** Would not approve as-is — structural debt in progress merge logic and admin page size.

---

## Top findings (severity order)

### 1. CourseProgress merge+upsert implemented three times
**Files:** `lib/coursera/b4bSync.ts`, `lib/coursera/syncUserFromB4B.ts`, `lib/coursera/csvImport.server.ts`

Same "never downgrade COMPLETED / max percent / completedAt" invariant in TS, SQL, and duplicated upsert blocks. **Code-judo:** one `upsertMergedCourseProgress()` helper; CSV promote should feed the TS ladder, not parallel SQL rules.

### 2. `app/admin/coursera/page.tsx` — 1,408 lines, raw SQL in page
Kit + legacy views in one file; `loadXapiCourseProgressSummary` / `loadCourseProgressSummary` belong in `lib/coursera/progressQueries.ts`. Split kit vs legacy components.

### 3. Tenant scoping inconsistent in `progressQueries.ts`
`loadBadgeProgressSummary` / `loadUnmatchedLearners` lack `organizationId` filter while page loaders have it. Require `organizationId` on every loader.

### 4. `syncUserFromB4B` — 500-line monolith
Extract phases: resolve signals, seed enrollments, upsert progress, build message.

### 5. `withApiGuc` half-applied + format scar tissue
Seven routes were bare; four had glued `}export const` lines. **P0 hygiene** — finish sweep (see PR on this branch). Pair with #3; wrapping alone does not fix unscoped raw reads.

### 6. Triplicated test-account exclusion patterns (`progressQueries.ts`)
One `TEST_ACCOUNT_LIKE_PATTERNS` array; delete `void TEST_ACCOUNT_EXCLUSION_WHERE` hack.

### 7. `CourseraMappingsAdmin.tsx` — 1,091 lines
Duplicate mobile/desktop table blocks; extract `<ResponsiveDataList>` + `useAdminAction()`.

### 8. Duplicated 3-way UNION CTE for unmatched learners
Factor shared `UNMATCHED_LEARNER_UNION` SQL fragment.

### 9. Non-atomic per-program rollup transactions
One `$transaction` per user, not per program row.

### 10. Magic catalog scan in `resolveContentIdToWapCourse`
Delete O(catalog) scan when DB mapping already matched.

---

## Execution order

| Wave | Items | Effort |
|------|-------|--------|
| **Now** | #5 withApiGuc sweep + org scoping on loaders (#3) | Small PR |
| **Next** | #1 shared upsert helper | Medium, test-backed |
| **Then** | #2 page split + #7 mappings admin | Large |
| **Later** | #4 decompose syncUserFromB4B, #9 atomic rollups | Medium |

**P0 re-ranking:** #1 and #2 rank above withApiGuc for long-term maintainability; withApiGuc is defense-in-depth hygiene, not an open-auth hole (all routes still call `isAdmin()`).
