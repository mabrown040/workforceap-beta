---
title: WorkforceAP Engineer Orchestration
type: note
---

# WorkforceAP Engineer Orchestration

Purpose: make engineer work faster without adding a second fake process.

## Operating rule

Use the repo's real commands as the orchestration surface.
Do not invent new verification rituals when these already exist.

## Core dispatch surfaces

### 1. Command map

Source: `package.json`

Use these as the canonical work lanes:

- `npm run db:sync-test-auth`
- `npm run test:unit`
- `node scripts/audit-portal-routes.mjs`
- `npm run test:e2e`
- `npm run build`

### 2. Guardrails first

Before public UX, copy, or flow changes:

1. Read `docs/AGENT_CHANGE_GUARDRAILS.md`
2. Read `docs/PRODUCT_STAKES.md`
3. Name the stake touched
4. Keep the branch narrow

### 3. Engineer verification loop

Use the thin wrapper:

```bash
scripts/engineer-loop.sh verify
```

That runs:

1. portal auth/bootstrap repair
2. unit tests
3. route audit sweep
4. production build path

Use `scripts/engineer-loop.sh e2e` when the slice is portal-heavy or risky.

## Role split

### Engineer

- build the slice
- run `scripts/engineer-loop.sh verify`
- run `scripts/engineer-loop.sh e2e` when route/auth/layout risk is high

### UX reviewer

- review copy clarity
- review mobile hierarchy
- avoid touching locked decisions without approval

### Security reviewer

- review public endpoints
- check auth boundaries
- validate schema/input handling

### CEO/product reviewer

- validate the slice against product stakes
- reject scope creep

## Default slice types

### UI slice

1. read guardrails + product stakes
2. implement narrow change
3. run `scripts/engineer-loop.sh unit`
4. run `scripts/engineer-loop.sh routes`
5. run `scripts/engineer-loop.sh build`

### Portal/auth slice

1. run `scripts/engineer-loop.sh auth`
2. implement change
3. run `scripts/engineer-loop.sh verify`
4. run `scripts/engineer-loop.sh e2e`

### Data/schema slice

1. inspect `prisma/schema.prisma`
2. use existing migration wrappers
3. run `scripts/engineer-loop.sh build`
4. run targeted portal verification

## GBrain tie-in

The repo is indexed as source `workforceap`.
This repo is pinned locally via `.gbrain-source`.

Use this when you need repo-specific recall:

```bash
gbrain query "WorkforceAP portal auth flow" --source workforceap
gbrain search "sync-test-auth" --source workforceap
gbrain query "PortalLayoutClient" --lang typescript
rg -n "PortalLayoutClient|sync-test-auth|wioa-qualification" .
```

Use `scripts/dispatch-board.sh lookup "<topic>"` for the fast path.

## Anti-patterns

- do not skip `db:sync-test-auth` and then blame broken test accounts
- do not jump straight to Playwright when unit or route audit would catch it faster
- do not batch unrelated fixes into one slice
- do not change public product decisions without checking stakes first
