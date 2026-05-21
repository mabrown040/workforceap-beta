# Cleanup Log

Tracks deletions of dead/broken code so the history is auditable.

| Date | Audit ID | Action | Notes |
| --- | --- | --- | --- |
| 2026-05-20 | C-D2 | Deleted `lib/swarm/taskQueue.ts` (and empty `lib/swarm/` dir) | Referenced non-existent `agent_tasks` table; no callers in repo. Revert if swarm feature is ever shipped. |
