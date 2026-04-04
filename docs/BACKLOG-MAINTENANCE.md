# Backlog file maintenance

## Recommended practice

1. **Keep one “remaining work” list** that is easy to scan — in this repo, `AI-TOOLS-BACKLOG.md` holds **open AI-tools items** only (completed bullets are removed or moved here).
2. **Log completed work once** in `docs/COMPLETED-WORK-LOG.md` (append rows; don’t rewrite history).
3. **Do not delete** historical backlog or audit files by default. They contain context (dates, rationale, links) that search and git history won’t always surface nicely.
4. **If a file is truly obsolete**, prefer **archive + pointer** over deletion:
   - Move or copy to `docs/archive/<year>-<topic>-<original-name>.md`
   - Add a one-line stub at the old path *only if* something still links to it — otherwise a single commit message + log entry is enough.

## What we are *not* doing

- **Mass-deleting** `artifacts/*` or root-level `audit-*.md` files — many are referenced from other docs or serve as dated evidence.
- **Treating “backlog = issue tracker”** — GitHub Issues/Projects remain the system of record for execution; Markdown backlogs are for narrative and agent context.

## When OpenClaw (or other agents) return

Point them at:

- `AI-TOOLS-BACKLOG.md` — remaining AI tooling work  
- `docs/plans/2026-04-03-sprint-tracker.md` — queued portal/marketing items  
- `docs/COMPLETED-WORK-LOG.md` — avoid redoing shipped work  

## Live site checks

Before implementing marketing copy from a backlog line, **compare [workforceap.org](https://workforceap.org)** (or the relevant page). If the public site already matches, log that in `COMPLETED-WORK-LOG.md` and close the line without code churn.
