# Voice Coaches Dedicated Flows Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the member-facing voice coaches out of compact dashboard cards and into dedicated full-screen flows so Resume Coach and Voice Interview feel like primary experiences instead of embedded widgets.

**Architecture:** Keep the existing ElevenLabs session APIs and core session components, but change the entry pattern. The dashboard and AI toolkit cards become lightweight launchers that deep-link into dedicated routes. Resume Coach gets its own top-level page built around `ResumeCoachWorkspace`, while Voice Interview keeps its dedicated page and gets cleaner coach-specific entry copy and CTAs.

**Tech Stack:** Next.js App Router, React server/client components, existing WorkforceAP portal components, ElevenLabs voice session integration.

---

### Task 1: Audit the existing voice coach entry points

**Files:**
- Inspect: `components/portal/VoiceCoachesPromo.tsx`
- Inspect: `components/portal/MemberDashboardVoiceSection.tsx`
- Inspect: `app/(portal)/dashboard/ai-tools/page.tsx`
- Inspect: `app/(portal)/dashboard/ai-tools/voice-interview/page.tsx`
- Inspect: `app/(portal)/dashboard/ai-tools/resume-rewriter/page.tsx`
- Inspect: `components/portal/ResumeCoachWorkspace.tsx`

**Step 1: Confirm which cards currently embed live voice UI**

Run:
```bash
grep -Rni "PortalVoiceSession\|ResumeCoachWorkspace\|VoiceCoachesPromo\|MemberDashboardVoiceSection" app components | head -200
```

Expected: direct voice session mounts inside dashboard/toolkit promo surfaces.

**Step 2: Confirm which dedicated routes already exist**

Run:
```bash
find app/(portal)/dashboard/ai-tools -maxdepth 2 -type f | sort
```

Expected: dedicated page exists for `voice-interview`, but no dedicated `resume-coach` page yet.

**Step 3: Write implementation note in the PR description or local scratch notes**

Capture:
- embedded entry points to replace
- existing route to reuse (`/dashboard/ai-tools/voice-interview`)
- new route to create (`/dashboard/ai-tools/resume-coach`)

**Step 4: Commit audit notes only if you create a tracked notes file**

```bash
git add docs/plans/2026-04-11-voice-coaches-dedicated-flows.md
git commit -m "docs: add voice coaches dedicated flows plan"
```

### Task 2: Create a dedicated Resume Coach route

**Files:**
- Create: `app/(portal)/dashboard/ai-tools/resume-coach/page.tsx`
- Create: `app/(portal)/dashboard/ai-tools/resume-coach/loading.tsx`
- Reuse: `components/portal/ResumeCoachWorkspace.tsx`
- Reuse pattern from: `app/(portal)/dashboard/ai-tools/voice-interview/page.tsx`

**Step 1: Write the failing route test or route existence check**

If route tests exist, add one there. If not, use a manual route smoke check as the acceptance gate.

Manual acceptance target:
- visiting `/dashboard/ai-tools/resume-coach` renders a dedicated page
- unauthenticated access redirects to login with `redirectTo`

**Step 2: Create the page shell**

Implement a page that includes:
- metadata title like `Resume Coach`
- auth gate via `getUser()`
- breadcrumb back to `AI Career Toolkit`
- page title + short framing copy
- `ResumeCoachWorkspace`
- `MobileBottomNav`

**Step 3: Add a lightweight loading state**

Create `loading.tsx` matching the tone/pattern used by other AI tool pages.

**Step 4: Manually verify the route renders**

Run:
```bash
npm run build
```

Expected: route compiles without import/path errors.

**Step 5: Commit**

```bash
git add app/(portal)/dashboard/ai-tools/resume-coach/page.tsx app/(portal)/dashboard/ai-tools/resume-coach/loading.tsx
git commit -m "feat: add dedicated resume coach route"
```

### Task 3: Convert dashboard and toolkit voice cards into launchers

**Files:**
- Modify: `components/portal/VoiceCoachesPromo.tsx`
- Modify: `components/portal/MemberDashboardVoiceSection.tsx`
- Possibly create helper: `components/portal/VoiceCoachLauncherCard.tsx`

**Step 1: Remove embedded live session mounts from promo surfaces**

Replace direct `PortalVoiceSession` usage in the launcher areas with CTA cards that link to dedicated routes.

Target links:
- Career Readiness → either keep embedded for now or link to its own existing route if one already exists and is acceptable
- Resume Coach → `/dashboard/ai-tools/resume-coach`
- Voice Interviewer → `/dashboard/ai-tools/voice-interview`

Recommendation: for this change set, switch Resume Coach and Voice Interview first, and leave Career Readiness unchanged only if it already depends on the compact layout. If possible, make all three cards consistent.

**Step 2: Make CTA copy coach-specific**

Examples:
- Resume Coach: `Open resume coach`
- Voice Interviewer: `Start mock interview`
- Career Readiness: `Open readiness coach`

Avoid generic `Start voice session` copy.

**Step 3: Preserve the premium card visual design**

Keep:
- badge
- icon tile
- headline/subtext
- gradient ring

Change only the interaction model from embedded widget to launcher.

**Step 4: Verify mobile behavior**

Acceptance:
- cards feel lighter on mobile
- no embedded mic/session UI inside the grid
- tapping a card opens the dedicated page

**Step 5: Commit**

```bash
git add components/portal/VoiceCoachesPromo.tsx components/portal/MemberDashboardVoiceSection.tsx components/portal/VoiceCoachLauncherCard.tsx
git commit -m "feat: convert voice coach cards into dedicated-flow launchers"
```

### Task 4: Refine the dedicated Voice Interview flow entry experience

**Files:**
- Modify: `app/(portal)/dashboard/ai-tools/voice-interview/page.tsx`
- Possibly modify: `components/portal/tools/VoiceInterviewScaffold.tsx`

**Step 1: Tighten the top-of-page framing**

Adjust the header copy so it feels like a dedicated interview experience, not just a utility page.

Add or refine:
- 1-line purpose statement
- optional preflight bullets: mic, camera optional, live feedback, saved review

**Step 2: Ensure the CTA language matches the launcher card**

If launcher says `Start mock interview`, the page should reinforce that exact experience.

**Step 3: Keep existing recording/history behavior intact**

Do not rework session APIs in this story unless needed for the launcher transition.

**Step 4: Verify mobile view**

Acceptance:
- clear heading and setup context before starting
- no duplicated controls
- existing scaffold still works

**Step 5: Commit**

```bash
git add app/(portal)/dashboard/ai-tools/voice-interview/page.tsx components/portal/tools/VoiceInterviewScaffold.tsx
git commit -m "refactor: sharpen dedicated voice interview flow entry"
```

### Task 5: Decouple Resume Coach from Resume Rewriter mode confusion

**Files:**
- Modify: `app/(portal)/dashboard/ai-tools/resume-rewriter/page.tsx`
- Modify: `app/(portal)/dashboard/ai-tools/resume-rewriter/ResumeRewriterClient.tsx`
- Possibly modify: `lib/portal/aiToolsHub.ts`

**Step 1: Decide the product rule**

Recommended rule:
- `Resume Rewriter` becomes the text workflow
- `Resume Coach` becomes the voice workflow
- the mode toggle inside Resume Rewriter should no longer be the primary path to voice

**Step 2: Update Resume Rewriter copy**

Change copy that currently says users can choose voice coach “in the tool below”.

Replace with copy that points voice users to the dedicated Resume Coach route.

**Step 3: Simplify the selector UX**

Preferred approach:
- remove `voice` as an in-place mode from `ResumeRewriterClient`
- replace with a cross-link card/button to `/dashboard/ai-tools/resume-coach`

Fallback approach if you want lower risk in this PR:
- keep the internal mode temporarily, but default the voice CTA across the product to the dedicated route.

**Step 4: Verify no dead-end links remain**

Search:
```bash
grep -Rni "voice coach\|ResumeCoachWorkspace\|resume-coach" app components lib | head -200
```

Expected: product language consistently separates text rewrite vs voice coaching.

**Step 5: Commit**

```bash
git add app/(portal)/dashboard/ai-tools/resume-rewriter/page.tsx app/(portal)/dashboard/ai-tools/resume-rewriter/ResumeRewriterClient.tsx lib/portal/aiToolsHub.ts
git commit -m "refactor: separate resume coach from resume rewriter flow"
```

### Task 6: Add smoke-test coverage and regression checks

**Files:**
- Modify or create nearest portal test files for route rendering/navigation
- If no route tests exist, document manual QA in plan comments / PR checklist

**Step 1: Add minimal coverage where practical**

Good candidates:
- route smoke for `/dashboard/ai-tools/resume-coach`
- link rendering assertions for launcher cards
- copy assertion that generic `Start voice session` is gone from targeted cards

**Step 2: Run targeted checks**

Run:
```bash
npm run build
```

If a lighter test command exists, also run it for touched components/routes.

**Step 3: Manual QA checklist**

Verify on mobile width:
- `/dashboard` Resume Coach card opens dedicated page
- `/dashboard/ai-tools` Resume Coach card opens dedicated page
- `/dashboard` Voice Interview card opens dedicated page
- `/dashboard/ai-tools` Voice Interview card opens dedicated page
- Resume Coach page shows the full `ResumeCoachWorkspace`
- Voice Interview page still starts session normally
- no embedded live session cards remain in the launcher grids

**Step 4: Commit final polish**

```bash
git add .
git commit -m "test: verify dedicated voice coach entry flows"
```

### Task 7: Ship cleanly

**Files:**
- No new product files required beyond the above

**Step 1: Review diff for scope creep**

Run:
```bash
git diff --stat origin/master...
```

Goal: keep this story focused on dedicated voice flows, launcher UX, and copy alignment.

**Step 2: Push branch**

```bash
git push
```

**Step 3: Update PR summary**

Include:
- Resume Coach now has a dedicated route
- Voice Interview remains dedicated and is now launched more clearly
- dashboard/toolkit voice cards are now launchers instead of embedded sessions
- Resume Rewriter no longer competes with Resume Coach for the same voice workflow

**Step 4: Attach screenshots**

Required screenshots:
- dashboard mobile launcher cards
- AI toolkit mobile launcher cards
- dedicated Resume Coach page
- dedicated Voice Interview page
