# Agent Lanes

## Operating Model

Use each tool for a clear lane instead of mixing responsibilities:

- `Codex CLI`
  Primary implementation lane. Use for multi-file edits, bug fixes, refactors, and shipping code.

- `Claude Code CLI`
  Review and architecture lane. Use for repo reasoning, bug hunts, change review, and risk analysis.

- `Kimi CLI`
  Cheap bulk execution lane. Use for transformations, drafting, summarization, and parallel low-risk tasks.

- `Cursor CLI`
  Fast background implementation lane. Use for branch-local coding passes, paired edits, and fast iteration when the task fits Cursor well.

- `Cursor cloud / Cursor API`
  Parallel remote execution lane. Use for isolated background tasks, long-running coding jobs, and branch-based parallel work without blocking the local loop.

- `OpenClaw`
  Orchestration lane. Use for routing, reminders, cross-session coordination, and ACP workflows.

- `Jules API`
  Automation orchestration lane. Use for structured task execution, workflow chaining, and event-driven handoffs once the local development loop is stable.

- `Stitch MCP`
  UI generation and first-pass visual composition lane. Use for layout exploration, marketing-page composition, and quick visual variants before hardening in code.

- `Chrome + browser automation`
  Visual QA lane. Use for login reuse, route checks, screenshots, and manual validation.

- `Cursor / cloud agents`
  Background implementation lane. Use when a task can run in parallel on an isolated branch or worktree.

- `Vercel`
  Preview lane. Every meaningful branch should have a preview URL validated before merge.

- `Supabase`
  Data lane. Use for migrations, type generation, and schema safety checks.

## Recommended Handoff Pattern

1. Codex implements
2. Claude reviews
3. Stitch can draft or remix UI direction when the task is design-heavy
4. Cursor or Cursor cloud can run bounded parallel implementation tasks
5. Browser lane validates UI
6. CI validates build and smoke tests
7. Vercel preview gets route verification
8. Merge after green checks

## Practical Rules

- Keep work on short-lived branches.
- Prefer one owner per lane for a task.
- Use screenshots for visual changes, not just prose.
- Use `npm run ship:check` before asking for merge.
- When schema changes land, run the Prisma/Supabase path before preview validation.
- Bring Jules into the loop only after the branch, CI, and preview contracts are already clear.
