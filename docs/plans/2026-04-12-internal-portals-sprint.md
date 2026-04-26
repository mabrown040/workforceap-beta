# Internal Portals Sprint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the highest-risk production issues across WorkforceAP internal portals and ship a stronger action-oriented experience for members, employers, counselors, and partners.

**Architecture:** Triage the sprint in four layers: reliability first, mobile usability second, high-value workflow depth third, information architecture cleanup fourth. Ship counselor reliability and member mobile fixes before any polish work. Convert the best existing portal surfaces into stronger decision engines rather than adding net-new pages.

**Tech Stack:** Next.js App Router, React, TypeScript, portal route groups under `app/(portal)/*`, existing portal UI components, production QA via browser/gstack browse.

---

## Sprint outcome targets

- Counselor portal loads without badge/API errors.
- Member dashboard and training work cleanly on mobile.
- Employer, partner, and member detail pages feel like actionable dossiers, not shallow previews.
- Duplicate / aliased routes are either merged or clearly differentiated.
- At least one strong “next best action” improvement ships in each major portal.

---

### Task 1: Lock sprint scope and owners

**Files:**
- Create: `docs/plans/2026-04-12-internal-portals-sprint.md`
- Optional update later: `docs/plans/2026-04-12-internal-portals-sprint-status.md`

**Step 1: Confirm sprint lanes**

Lanes:
1. Counselor reliability
2. Member mobile responsiveness
3. Detail page depth
4. IA cleanup and route clarity
5. Action-driving portal upgrades

**Step 2: Freeze non-sprint work**

Do not add new portal sections unless required to complete one of the lanes above.

**Step 3: Define done**

Done means:
- production QA rerun on touched routes
- mobile + desktop verified
- no known console/API errors on touched routes
- commit and PR notes written

**Step 4: Commit**

```bash
git add docs/plans/2026-04-12-internal-portals-sprint.md
git commit -m "docs: add internal portals sprint plan"
```

---

### Task 2: Fix counselor portal reliability first

**Files:**
- Inspect: `app/(portal)/counselor/page.tsx`
- Inspect: `app/(portal)/counselor/layout.tsx`
- Inspect: any nav badge loaders used by counselor routes
- Inspect: API handlers powering `/api/portal/nav-badges`
- Test: routes under `/counselor*`

**Step 1: Reproduce the failing counselor badge request locally/prod-like**

Run:
```bash
openclaw status || true
npm run dev
```

Check:
- `/counselor`
- `/counselor/messages`
- `/counselor/students`

Expected now: identify why `role=counselor` returns `400`.

**Step 2: Find the exact API contract mismatch**

Look for:
- role validation
- missing auth/session shaping
- unsupported counselor role branch
- query parsing issues

**Step 3: Write minimal fix**

Implement the narrowest fix that makes counselor nav badges return valid data or a safe empty payload.

**Step 4: Verify all counselor entry pages load without API error**

Test:
```bash
npx tsc --noEmit
```

Then verify in browser:
- `/counselor`
- `/counselor/messages`
- `/counselor/students`
- `/counselor/resources`
- `/counselor/guide`

**Step 5: Commit**

```bash
git add app/(portal)/counselor app/api
git commit -m "fix: restore counselor portal navigation data"
```

---

### Task 3: Fix member mobile breakage on dashboard and training

**Files:**
- Inspect: `app/(portal)/dashboard/page.tsx`
- Inspect: `app/(portal)/dashboard/training/page.tsx`
- Inspect: shared portal CSS in `css/portal.css`
- Inspect: related portal components rendered on those pages

**Step 1: Reproduce mobile clipping**

Check at 375×812:
- `/dashboard`
- `/dashboard/training`

Capture what overflows, clips, or gets hidden.

**Step 2: Patch layout at the component/CSS level**

Likely fixes:
- tighten grid breakpoints
- prevent fixed-width card overflow
- stack controls vertically on mobile
- ensure bottom-nav spacing is correct

**Step 3: Verify desktop still looks clean**

Check again at 1280×800.

**Step 4: Verify related pages using the same component patterns**

Spot-check:
- `/dashboard/ai-tools`
- `/dashboard/readiness`
- `/dashboard/learning`

**Step 5: Commit**

```bash
git add app/(portal)/dashboard css/portal.css components/portal
git commit -m "fix: resolve member portal mobile layout issues"
```

---

### Task 4: Enrich shallow employer and partner detail pages

**Files:**
- Inspect: `app/(portal)/employer/candidates/[studentId]/page.tsx`
- Inspect: `app/(portal)/employer/jobs/[id]/page.tsx`
- Inspect: `app/(portal)/partner/referred-members/[memberId]/page.tsx`
- Inspect: data loaders and shared detail components

**Step 1: Inventory missing information**

For each sampled detail page, list what is absent:
- status
- last activity
- recommendation / next step
- evidence / history
- notes / context

**Step 2: Add decision-support sections, not fluff**

Examples:
- candidate strengths / readiness
- recommended next action
- timeline / milestones
- recent interactions
- status summary card

**Step 3: Keep UI DRY using shared cards where possible**

Do not invent one-off styling if portal card patterns already exist.

**Step 4: Verify pages feel materially richer on mobile and desktop**

Check the live/sample detail pages again after patching.

**Step 5: Commit**

```bash
git add app/(portal)/employer app/(portal)/partner components/portal
git commit -m "feat: strengthen portal detail pages with action-ready context"
```

---

### Task 5: Remove or differentiate aliased routes

**Files:**
- Inspect: `app/(portal)/dashboard/settings/page.tsx`
- Inspect: `app/(portal)/dashboard/profile/page.tsx`
- Inspect: `app/(portal)/partner/members/page.tsx`
- Inspect: `app/(portal)/partner/referred-members/page.tsx`

**Step 1: Decide per duplicate pair**

For each pair choose one:
- merge and redirect
- keep both, but give them distinct purpose

**Step 2: Apply the simpler choice**

Default:
- if no differentiated UX exists, redirect one route to the canonical route

**Step 3: Fix nav labels and breadcrumb copy**

Make sure users do not see two names for the same thing.

**Step 4: Verify routes and nav make sense in prod-like flow**

Check desktop + mobile.

**Step 5: Commit**

```bash
git add app/(portal)/dashboard app/(portal)/partner
git commit -m "fix: clarify internal portal route structure"
```

---

### Task 6: Upgrade member dashboard from menu to action engine

**Files:**
- Inspect: `app/(portal)/dashboard/page.tsx`
- Inspect: `components/portal/DashboardHomeClient.tsx`
- Inspect: `components/portal/WeeklyRecapClient.tsx`
- Inspect: any readiness / activity summary components used there

**Step 1: Add one dominant next action section**

Above the shortcuts, show:
- what to do next
- why it matters
- CTA

**Step 2: Add one backup action if blocked**

Examples:
- resume incomplete → upload resume
- no recent applications → browse jobs
- no interview prep → start interview tool

**Step 3: Reduce equal-weight CTA clutter**

Do not let every shortcut look equally important.

**Step 4: Validate with mobile first**

Member portal should be optimized for phone use.

**Step 5: Commit**

```bash
git add app/(portal)/dashboard components/portal
git commit -m "feat: make member dashboard action-driven"
```

---

### Task 7: Upgrade employer workflow around the work queue

**Files:**
- Inspect: `app/(portal)/employer/work-queue/page.tsx`
- Inspect: `app/(portal)/employer/page.tsx`
- Inspect: employer candidate/job summary components

**Step 1: Promote the work queue as the primary employer home action**

Home should clearly answer:
- who needs review now
- what changed since last visit
- what action to take next

**Step 2: Add ranking/confidence context where possible**

Examples:
- strongest fit
- freshest application
- waiting on employer action

**Step 3: Reduce dead-end pages**

Where `applications` or `matches` are thin, route users toward the work queue.

**Step 4: Verify employer home, work queue, and candidate detail feel connected**

**Step 5: Commit**

```bash
git add app/(portal)/employer components/employer
git commit -m "feat: center employer workflow on the work queue"
```

---

### Task 8: Upgrade partner attention and reporting workflow

**Files:**
- Inspect: `app/(portal)/partner/page.tsx`
- Inspect: `app/(portal)/partner/attention/page.tsx`
- Inspect: `app/(portal)/partner/outcomes/page.tsx`
- Inspect: `app/(portal)/partner/milestones/page.tsx`
- Inspect: `app/(portal)/partner/exports/page.tsx`

**Step 1: Keep attention queue as the hero workflow**

Make partner home route users toward action, not passive browsing.

**Step 2: Turn thin reporting pages into decision pages**

Add:
- summary metrics
- trend context
- “needs action” callouts
- export purpose framing

**Step 3: Ensure referred-member detail links connect back to the attention workflow**

**Step 4: Verify mobile readability for reporting surfaces**

**Step 5: Commit**

```bash
git add app/(portal)/partner components/portal
git commit -m "feat: make partner portal action- and impact-driven"
```

---

### Task 9: Full regression QA on touched portal routes

**Files:**
- No code changes required unless bugs are found
- Save notes to: `docs/plans/2026-04-12-internal-portals-sprint-status.md`

**Step 1: Re-run production QA on desktop and mobile**

Re-check touched pages for:
- layout breakage
- console errors
- missing content
- duplicate rendering
- weak empty states

**Step 2: Sample dynamic pages again**

Check:
- employer candidate detail
- employer job detail
- partner referred-member detail
- one member job detail

**Step 3: Record pass/fail by route group**

**Step 4: Commit QA/status notes if useful**

```bash
git add docs/plans/2026-04-12-internal-portals-sprint-status.md
git commit -m "docs: record internal portals sprint QA status"
```

---

### Task 10: Ship in this order

**Phase 1, same day**
- Task 2 Counselor reliability
- Task 3 Member mobile fixes

**Phase 2, next 1–2 days**
- Task 4 Detail page depth
- Task 5 IA cleanup

**Phase 3, next 2–4 days**
- Task 6 Member dashboard next-action redesign
- Task 7 Employer workflow upgrade
- Task 8 Partner action/reporting upgrade

**Phase 4, ship gate**
- Task 9 regression QA

---

## Sprint recommendation

If time is tight, do not spread thin across all portals equally.

**Must ship this sprint:**
1. Counselor reliability
2. Member mobile fixes
3. One real workflow win each for member, employer, and partner

**Can defer if needed:**
- lower-value shell pages that no one depends on daily
- net-new pages
- visual polish not tied to action completion
