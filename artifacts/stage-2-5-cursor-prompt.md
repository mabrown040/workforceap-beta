# WorkforceAP Cursor Prompt - Stages 2-5 Rollout Follow-Through

Use the latest current `master`.

Repo: `C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta`
Base branch: `master`

## Context
- The major Phase 2 and Phase 2.5 product work is already merged into `master`.
- A prelaunch blocker merge from `cursor/p0-blocker-fixes-prelaunch` is also already merged.
- Local rollout follow-through removed employer-facing "free" job-posting wording from the marketing site so Mike's approved copy direction is reflected consistently.
- `npm run build` is already known to succeed locally, with expected Prisma static-generation warnings when Postgres is unavailable at `127.0.0.1:5432`.

## Stage 2: Finish remaining rollout cleanup
Audit the already-merged experience and complete only the small remaining launch-alignment changes that Mike explicitly requested.

Required focus:
- Keep employer job-posting copy free of "free" language on public employer/partner marketing surfaces unless product approval reintroduces it.
- Preserve existing protected copy:
  - homepage hero headline `"Breaking systemic barriers through education, technology, and opportunity"`
  - `"$0 Cost to Qualifying Participants"`
- Do not reopen broader Phase 2 scope unless a real regression is discovered.
- Keep changes tight and launch-oriented, not exploratory.

## Stage 3: Local verification
Run the relevant local checks against the final staged result.

Minimum verification:
- `npm run test:unit`
- `npm run build`
- Review results for regressions in:
  - public marketing routes
  - portal entry labels/navigation
  - employer marketing copy

Expected note:
- Prisma static-generation warnings about `127.0.0.1:5432` during build are expected in this local environment if the DB is unreachable, as long as the build completes successfully.

## Stage 4: Delivery packaging
Prepare a concise ship artifact for the next operator.

Include:
- exact files changed
- commands run
- outcomes/results
- remaining risks or follow-up checks

## Stage 5: Git handoff
If verification passes:
- commit the rollout follow-through on `master` with a clear, scoped message
- push to `origin/master`

If verification fails:
- fix only launch-blocking issues directly related to this rollout
- rerun the failed checks
- report unresolved blockers with evidence instead of pushing blindly

## Guardrails
- No broad refactors
- No auth, portal-routing, or role-scope changes unless required to fix a verified regression
- No generic marketing-copy rewrites
- Keep Austin framed as the launch wedge, not the long-term ceiling
- Preserve credible salary/outcome framing

## Definition of done
- Employer-facing "free" job-posting wording is removed from the intended public marketing surfaces.
- Local verification is run and results are captured.
- Changes are committed and pushed to `origin/master` if checks pass.
- The final report clearly states what shipped, how it was verified, and any remaining risks.