# WorkforceAP Codex PR Recheck — 2026-03-22

## Live Recheck (now)

Open PR count is currently **16**.

- Non-codex: **#112**
- Codex-labeled/open: **#164–#178** (15 PRs)

## Codex PRs and Diff Size

| PR | Files | +/- | Title |
|---|---:|---:|---|
| #164 | 26 | +679 / -24 | Add analytics funnels and workflow diagnostics |
| #165 | 11 | +445 / -166 | Improve shared app UI primitives |
| #166 | 19 | +147 / -90 | Standardize workspace navigation language |
| #167 | 26 | +1169 / -1320 | Improve AI tools workflow and consistency |
| #168 | 8 | +301 / -109 | Refine portal dashboard next-step journey |
| #169 | 9 | +284 / -115 | Clarify /apply 3-step journey; improve messaging, validation, and analytics |
| #170 | 8 | +331 / -226 | Standardize public marketing copy and CTAs |
| #171 | 5 | +228 / -53 | Add employer ranking and scrape cleanup regression coverage |
| #172 | 1 | +351 / -34 | Add role-family detection and rebalance program scoring |
| #173 | 2 | +76 / -8 | Harden employer skill matching |
| #174 | 13 | +258 / -41 | Persist job import provenance metadata |
| #175 | 3 | +74 / -37 | Harden job scrape text sanitization |
| #176 | 2 | +12 / -7 | Soften employer recommendation confidence language |
| #177 | 7 | +132 / -20 | Add readiness issue jump links for employer job edits |
| #178 | 1 | +133 / -32 | Auto-refresh employer program rankings |

## Immediate overlap/conflict map (high-value)

### Strong overlap clusters
1. **Employer recommendation cluster:** #171, #172, #173 (same scorer files)
   - Shared core: `lib/employer/rankProgramsForEmployerJob.ts`
2. **Employer editing UX cluster:** #176, #177, #178 (same recommendation UI component)
   - Shared core: `components/employer/SuggestedProgramsRanked.tsx`
3. **Import/provenance cluster:** #164 and #174 (large backend/API overlap)
   - Shared: import routes, job routes, `JobForm`, schema/provenance plumbing
4. **Global style contention:** many PRs touch `css/main.css` (#112 and multiple codex PRs)

### Explicit overlap with open non-codex PR #112
- Conflicts likely with #166, #174, #177 (plus css conflicts with several others).
- Direct shared files include:
  - `app/(portal)/employer/jobs/[id]/page.tsx` (with #174, #177)
  - `components/portal/EmployerPortalShell.tsx` (with #166)
  - `css/main.css` (with multiple)

## Provisional merge strategy (pending deep review)

### Wave 1 (lowest blast radius)
- #176, #175, #178

### Wave 2 (dependent UX)
- #177 (after deciding final behavior with #176/#178)

### Wave 3 (matching engine + tests)
- #172 → #173 → #171

### Wave 4 (backend/import)
- #174 (then determine whether #164 should be partially cherry-picked or closed as superseded)

### Wave 5 (broader UX/copy/navigation)
- #169, #168, #170, #166, #165, #167

## ACP review dispatch status

I also kicked off two independent ACP reviewer lanes as requested:

1. **Codex ACP review request**
   - Session: `agent:codex:acp:0f22e0a8-40be-44ad-9502-3c9578a00e33`
   - Run: `b858ae40-30e1-46df-a1b4-e399641c1a4d`
   - Deliverable target: `artifacts/codex-acp-pr-review-2026-03-22.md`

2. **Claude ACP (Sonnet-style) review request**
   - Session: `agent:claude:acp:100afc3c-d49c-4ce1-aaf6-47b8a4ac804e`
   - Run: `b259d482-060f-4754-b4c6-68653f702e8a`
   - Deliverable target: `artifacts/claude-sonnet-acp-pr-review-2026-03-22.md`

These will provide per-PR verdicts, blockers, and merge/close picks.
