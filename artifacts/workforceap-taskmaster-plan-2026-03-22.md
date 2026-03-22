# WorkforceAP Taskmaster Plan (Major TODO Lock)

Last updated: 2026-03-22
Owner: Forge

## Mission
Keep critical WorkforceAP execution work visible and tracked so nothing drops while parallel lanes run.

## Priority Stack

## P0 — Ship + Stability (Do First)
1. **Resolve and land open PR gate**
   - PR: #112 `Launch Prep: Salary Guide Mobile Defect Fix + Last-Mile Polish`
   - Current state: open, `mergeable_state=dirty` (conflict/blocker)
   - Required: conflict resolution, quick regression pass, merge decision
2. **Full site smoke test (live critical flows)**
   - Public pages + member portal + employer portal + core forms
   - Confirm no nav-shell regressions and no mobile breakage
3. **Programs course-content glitch verification/fix**
   - Reproduce on live
   - Patch + verify + record evidence
4. **ClosingLock/Rippling multi-import regression watch**
   - Validate imports end-to-end with latest logic
   - Keep rollback/mitigation notes ready

## P1 — Data & Evidence Foundation
1. **Canonical key mapping + merged dataset**
   - Build cross-file identity map
   - Produce merged CSV for KPI calculations
2. **Compute baseline metrics**
   - Cohort completion
   - Time-to-placement
   - Outcome coverage by program/cohort
3. **MDB unlock path (credentialed export)**
   - Access locked tables via owner credentials
   - Export priority tables to CSV/XLSX for integration

## P1 — Go-to-Market Execution
1. **Publish messaging artifacts**
   - Grant one-pager
   - Homepage block
   - Impact narrative snippets
2. **Run SDR week-1 cadence**
   - Tier-1 employer + partner outreach
   - Track reply/meeting/qualification rates

## P2 — Hygiene & Risk Reduction
1. **PR hygiene cleanup**
   - Re-check duplicate PR concern from earlier context (#128 vs #129) and close stale duplicates if still present
2. **Optional UX polish backlog**
   - Keyboard focus polish (if still pending)
3. **Untracked artifact triage**
   - Decide keep/archive/delete

---

## 7-Day Execution Grid

### Day 0 (Today)
- Lock task plan (this file)
- Review open PR(s) + blockers
- Publish send-now messaging

### Day 1
- Resolve PR #112 conflicts and re-verify
- Run full smoke test and log pass/fail matrix

### Day 2
- Build canonical key map + merged dataset v1
- Compute completion/time-to-placement baselines

### Day 3
- Launch SDR week-1 wave
- Stand up KPI tracker from analyst KPI pack

### Day 4-5
- MDB export integration (if credentials/exports available)
- Refresh evidence-backed narrative with improved confidence

### Day 6-7
- Weekly checkpoint: shipped items, unresolved blockers, next merge queue

---

## Blockers / Dependencies
- MDB locked-table access depends on owner credentials and Access export path.
- Open PR merge depends on conflict resolution against `master`.

## Definition of Done (for this plan)
- No P0 item left untracked.
- Open PR queue reviewed and dispositioned.
- KPI baseline published from merged data.
- Outbound execution started with measurable pipeline metrics.
