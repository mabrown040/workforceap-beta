# Career Studio Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Voice + Career Studio the canonical, easy-to-reach member tool experience while preserving direct tool URLs and eliminating duplicate toolkit entrypoints.

**Architecture:** `/dashboard/ai-tools` becomes the canonical Studio route and defaults to Coaches. Legacy `/dashboard/ai-tools/studio` and `/dashboard/toolkit` become redirects into canonical Studio tabs. Navigation uses one “Career Studio” entry. Resume extraction runs only when the Resume tab is requested directly so the default Coaches experience does not block on storage/file parsing.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, Playwright.

---

### Task 1: Add consolidation regression tests

**Files:**
- Create: `tests/lib/career-studio-consolidation.spec.ts`

**Steps:**
1. Assert `/dashboard/ai-tools` renders `VoiceStudioKit` and defaults to Coaches.
2. Assert `/dashboard/ai-tools/studio` redirects to `/dashboard/ai-tools` while preserving tab/agent parameters.
3. Assert `/dashboard/toolkit` redirects to `/dashboard/ai-tools?tab=toolkit`.
4. Assert member navigation contains one canonical `Career Studio` entry.
5. Assert default Coaches requests do not call `loadResumeStudioData`.
6. Run the focused test and verify RED.

### Task 2: Make Career Studio canonical

**Files:**
- Modify: `app/(portal)/dashboard/ai-tools/page.tsx`
- Modify: `app/(portal)/dashboard/ai-tools/studio/page.tsx`
- Modify: `app/(portal)/dashboard/toolkit/page.tsx`

**Steps:**
1. Move the Studio server-page behavior to `/dashboard/ai-tools`.
2. Keep Coaches as the default tab.
3. Load resume data only for direct `?tab=studio` requests.
4. Redirect the old Studio URL to the canonical route, preserving valid query parameters.
5. Redirect the reduced Toolkit route to the canonical Toolkit tab.
6. Run focused tests and verify GREEN.

### Task 3: Align member navigation and labels

**Files:**
- Modify: `lib/nav/portalNav.ts`
- Modify: `components/portal/MemberPortalTopNav.tsx`
- Modify: `scripts/lib/portal-audit-paths.mjs`

**Steps:**
1. Rename the top-level member destination to `Career Studio`.
2. Point all top-level navigation to `/dashboard/ai-tools`.
3. Remove the separate Voice Studio navigation row.
4. Keep old routes as aliases/redirects.
5. Update the audit inventory to canonical URLs only.
6. Run focused tests, ESLint, typecheck, and diff checks.

### Task 4: Verify and ship

**Steps:**
1. Run focused Vitest regression suites.
2. Run full unit tests, lint, typecheck, and production build with a 4 GB Node heap.
3. Review the diff for scope and security.
4. Commit, push, open PR, and wait for green CI.
5. Merge and verify the production Studio route on mobile.
6. Re-run the authenticated portal audit and confirm the earlier message/prefetch fixes.
