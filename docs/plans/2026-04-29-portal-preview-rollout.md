# Portal preview rollout — design audit + CEO sprint

**Date:** 2026-04-29  
**Mode:** preview-first, low-risk rollout  
**Goal:** improve portal UI/UX and QA discipline without breaking the site

---

## What we know

From the live route sweep and screenshot-backed audits:
- Public trust copy is in good shape and `/apply` now carries the right funding language.
- The portal shells are mostly stable.
- The biggest remaining UX issue is **duplicate hierarchy**: pages still render parallel mobile/desktop titles and assistant blocks.
- Some surfaces still feel too “tool dump” and not enough “guided flow.”
- CI is still too thin for real release confidence; preview/staging QA is the right next step.

Primary sources:
- `docs/PORTAL-UI-UX-AUDIT-FINDINGS.md`
- `docs/PORTAL-UI-UX-ENHANCEMENTS.md`
- `docs/PORTAL-UI-ONE-SHOT-TASK.md`
- `docs/CROSS-PORTAL-AUDIT-PLAN.md`
- `docs/portal-audit-results.json`

---

## CEO sprint: 3 workstreams

### 1) Shell truth
Make each page feel like **one page**, not two breakpoints fighting.

**Targets:**
- one `h1` story per route
- remove duplicate hero blocks
- normalize mobile/desktop wrappers
- align assistant/voice areas so they feel intentional, not repeated

**Confidence:** Medium-high for targeted fixes, low for whole-shell refactors.

### 2) Visual system cleanup
Make the site feel calmer and more premium.

**Targets:**
- tone down loud accent colors where they read like status/error
- normalize spacing, radius, and card rhythm
- tighten empty states and dense tables
- keep trust copy simple and member-first

**Confidence:** High for copy/color tweaks, medium for layout tuning.

### 3) QA off prod
Stop using the live site as the default test bed.

**Targets:**
- preview-first validation
- seeded QA accounts
- Playwright on preview/staging
- CI audit lane for route drift and auth smoke

**Confidence:** High. Repo already has the pieces; it needs wiring and discipline.

---

## Rollout confidence matrix

| Change class | Confidence | Why |
|---|---:|---|
| Copy-only fixes | 95% | Low blast radius, easy to verify |
| Audit harness fixes | 90% | Doesn’t alter user behavior, only QA accuracy |
| Targeted heading cleanup on one route family | 75% | Limited scope, but must verify mobile + desktop |
| Visual token cleanup (color/spacing) | 70% | Medium risk if shared components are reused widely |
| Single-shell refactor across many routes | 45% | Highest chance of accidental regressions |
| Full portal layout redesign | 25% | Too much surface area for one night |

**Recommendation:** stay in the 75%+ lane tonight.

---

## Preview-first rollout order

### Phase 0 — baseline
- Run preview smoke on `workforceap-beta.vercel.app`
- Confirm member/admin/employer/partner/counselor still route correctly
- Capture any regression before touching code

### Phase 1 — safe fixes
- copy/trust tweaks
- audit harness updates
- very small accessibility polish

### Phase 2 — narrow shell cleanup
- verify heading counts and screenshot polish route-by-route before changing code
- only patch a route family if preview shows a real duplicate-heading or hierarchy regression
- start with employer/partner/counselor subpages, then member AI tools, then admin if needed

### Phase 3 — release discipline
- preview QA becomes the default
- staging becomes the promotion gate
- prod is only final smoke

---

## Night test plan on Vercel preview

1. Open the preview deployment.
2. Sign in with the super-admin QA account.
3. Run the cross-portal route audit.
4. Spot-check:
   - `/dashboard/ai-tools`
   - `/apply`
   - `/employer`
   - `/partner`
   - `/counselor`
5. Record any route that bounces, duplicates hierarchy, or breaks mobile spacing.

### Current preview status (2026-04-29)
- Admin pages sampled (`/admin/programs`, `/admin/employers`, `/admin/metrics`) are clean on heading count in preview.
- Member pages sampled (`/dashboard/training`, `/dashboard/messages`, `/dashboard/ai-tools/job-match-scorer`, `/dashboard/ai-tools/resume-analysis`) are also clean on heading count in preview.
- That means the next code touch should be driven by screenshot/spacing evidence, not stale audit notes.

---

## Stop conditions

Stop and re-plan if any of these show up:
- login breaks on preview
- a shared shell change causes route fallout
- more than one high-risk layout family needs surgery at once
- any change threatens auth, uploads, redirects, or role gating

---

## Decision needed from Mike

- Which route family should be cleaned first if we only do one tonight?
- How aggressive should we be about shell refactors vs targeted fixes?

**My recommendation:**
1. `employer` / `partner` / `counselor` subpages first
2. then member AI tools
3. then admin heading cleanup

That sequence gives the highest confidence with the least chance of breaking the site.
