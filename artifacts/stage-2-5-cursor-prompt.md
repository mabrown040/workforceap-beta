# WorkforceAP Cursor Prompt — Stages 2–5 Rollout

## Repository and branch

- **Repo path (local):** `C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta` (or CI clone path)
- **Target branch:** `master`
- **Working branch (if used):** `cursor/rollout-stages-2-5-c624`

## Exact goals

1. Finish **Stage 2** launch-alignment: employer-facing job-posting copy on public marketing must not use casual **“free”** framing; keep participant-truth copy such as homepage hero and **“$0 Cost to Qualifying Participants”** intact.
2. **Stage 3:** Run TypeScript check and production build; capture pass/fail.
3. **Stage 4:** Ship a short operator-facing summary (this artifact + execution report): files touched, commands, results, risks.
4. **Stage 5:** Git handoff — scoped commits, push to `origin/master` (or open/update PR per team process).

## Ordered task list

1. **Discover:** Read this artifact, recent merges (`cursor/p0-blocker-fixes-prelaunch`), and grep marketing routes for employer/job-posting “free” wording (`app/employers`, `app/partners`, shared components). Exclude `node_modules` from searches.
2. **Stage 2 — copy:** Update employer/partner **marketing** surfaces only where language implies **employers** get free job posting; do not rewrite participant program SEO (`programs`, `apply`, FAQ participant answers) unless it is clearly the same employer-facing bug.
3. **Stage 2 — portal UI:** If `/employer` or `/partner` authenticated shells look broken (unstyled layout, header overflow), add minimal CSS in `css/main.css` for the React class names used by `WorkspaceShell`, employer dashboard, and shared `PageHeader` — match existing portal tokens (`--color-*`, `--radius-*`, `var(--shadow-sm)`).
4. **Stage 3 — verify:** Run validation commands below; fix only regressions tied to this rollout.
5. **Stage 4:** Refresh this artifact if process or commands change; keep it the single “prompt + checklist” source.
6. **Stage 5:** Commit in logical slices (e.g. copy vs. styling/artifact), push to `origin/master`, note commit SHAs in the execution report.

## Validation commands (run from repo root)

PowerShell-safe (run one line at a time):

```powershell
git status --short
git grep -n -i "free" -- app components lib
npx tsc --noEmit
npm run test:unit
npm run build
```

**Note:** `npm run build` may log Prisma/static-generation warnings when Postgres is not reachable at `127.0.0.1:5432`; that is acceptable locally if the build **exits 0**.

## Completion criteria

- [ ] No employer **job-posting** “free” positioning on intended public surfaces (`/employers`, `/partners` employer blurbs, metadata where it promised “post free”).
- [ ] `/employer` and `/partner` portal chrome is usable on mobile and desktop (header, sidebar/drawer, main padding).
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:unit` passes (when present in `package.json`).
- [ ] Changes committed and pushed per team branch policy; execution report lists SHAs and commands.

## Risk checks

- **Scope creep:** Avoid portal auth, RLS, or routing changes unless fixing a verified regression from this rollout.
- **Copy drift:** Do not remove truthful **no cost to participants** messaging where it is not employer job-posting.
- **Force-push:** Splitting or rewriting commits on `master` may require `--force-with-lease`; confirm with repo owners before rewriting shared history.
- **Search noise:** Restrict greps to `app`, `components`, `lib` so unrelated docs don’t drive churn.

## Guardrails

- No broad refactors.
- No auth, portal-routing, or role-scope changes unless required to fix a verified regression.
- No generic marketing-copy rewrites.
- Keep Austin framed as the launch wedge, not the long-term ceiling.
- Preserve credible salary/outcome framing.

## Rollback notes

- **Copy only:** Revert the commit that touches `app/employers/page.tsx` / `app/partners/page.tsx` (or restore prior strings from `git show <parent>:path`).
- **CSS only:** Revert the commit that touches `css/main.css` for workspace/employer-dash blocks.
- **Ranking logic:** Revert the commit that touches `lib/employer/rankProgramsForEmployerJob.ts` if employer job form suggestions regress.
- **Artifact only:** Delete or restore `artifacts/stage-2-5-cursor-prompt.md` from previous revision — no runtime impact.

## Context (frozen)

- Phase 2 / 2.5 product work and prelaunch blocker merge are already on `master`.
- This prompt is the checklist for **remaining** Stage 2–5 follow-through, not a full Phase 2 re-audit.
