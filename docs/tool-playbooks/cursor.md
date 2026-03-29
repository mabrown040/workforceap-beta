# Cursor Playbook

## Use Cases

- fast implementation passes on bounded feature work
- branch-local cleanup after a design or product direction is already chosen
- parallel code changes that should not block the main local loop

## Cursor CLI

Use `Cursor CLI` for:

- quick edits in an active local branch
- paired coding when the task is implementation-heavy but not orchestration-heavy
- follow-up cleanup after Codex or Claude reasoning

Local host note:

- the Windows install is at `C:\Users\mabro\AppData\Local\Programs\Cursor\Cursor.exe`
- the WSL bridge command should be `cursor`
- if `cursor` is missing in WSL, fix the bridge before relying on Cursor in repo workflows

## Cursor Cloud / API

Use `Cursor cloud` for:

- isolated branch work
- long-running background feature work
- parallel tasks that can be reviewed and merged back later

## Rules

- give Cursor a bounded scope
- prefer one branch or worktree per parallel task
- do not use Cursor cloud for tasks that depend on fast back-and-forth local state
- run `npm run ship:check` before merge handoff
- run `npm run tooling:doctor` after Cursor upgrades to confirm the bridge still works
