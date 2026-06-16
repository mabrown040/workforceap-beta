---
title: WorkforceAP Dispatch Board
type: note
---

# WorkforceAP Dispatch Board

Purpose: route work fast without mixing roles, scope, or verification.

Companion helper:

```bash
scripts/dispatch-board.sh <lane> [topic]
```

## How to use this board

For every slice:

1. Name the slice
2. Assign one owner
3. Name the stake touched
4. Pick the lane
5. Run the matching gate

If the slice touches a locked decision, stop and get approval.

---

## Lanes

### Engineer

Use when:

- building features
- fixing bugs
- changing APIs
- touching Prisma or auth flows

Primary surfaces:

- `package.json`
- `scripts/engineer-loop.sh`
- `scripts/sync-portal-test-auth.ts`
- `scripts/audit-portal-routes.mjs`
- `playwright.config.ts`

Default gate:

```bash
scripts/engineer-loop.sh verify
```

Fast lookup:

```bash
scripts/dispatch-board.sh engineer "portal nav bug"
```

Escalate to:

```bash
scripts/engineer-loop.sh e2e
```

### UX

Use when:

- copy feels confusing
- mobile hierarchy is weak
- page is technically correct but feels sloppy

Primary surfaces:

- `docs/PRODUCT_STAKES.md`
- `docs/AGENT_CHANGE_GUARDRAILS.md`
- `components/`
- `app/`
- `css/`

Default gate:

- read product stakes
- run route audit if portal navigation changed
- get engineer to run build before merge

Fast lookup:

```bash
scripts/dispatch-board.sh ux "mobile portal hierarchy"
```

### Security

Use when:

- public endpoints change
- auth/session logic changes
- file upload, webhook, or AI endpoints move
- rate limiting or validation is touched

Primary surfaces:

- `middleware.ts`
- `app/api/`
- `lib/db/`
- `lib/xapi/`
- `prisma/schema.prisma`

Default gate:

```bash
scripts/engineer-loop.sh build
```

And review:

- auth checks
- input validation
- public exposure

Fast lookup:

```bash
scripts/dispatch-board.sh security "public endpoint auth validation"
```

### Product / CEO

Use when:

- choosing scope
- resolving tradeoffs
- deciding if a change should exist at all

Primary surfaces:

- `docs/PRODUCT_STAKES.md`
- `docs/AGENT_CHANGE_GUARDRAILS.md`
- `docs/COMPLETED-WORK-LOG.md`
- `docs/plans/`

Default gate:

- confirm scope is narrow
- confirm no locked stake is being silently changed

Fast lookup:

```bash
scripts/dispatch-board.sh product "partner portal scope"
```

---

## Slice template

Copy this block when dispatching work:

```md
## Slice
- Name:
- Owner:
- Lane: engineer | ux | security | product
- Stake touched:
- Files likely touched:
- Verification gate:
- Notes:
```

---

## Recommended default flows

### Portal bug

- owner: engineer
- support: security if auth/session involved
- gate: `scripts/engineer-loop.sh verify`

### Public page polish

- owner: ux
- support: engineer
- gate: route audit + build

### Schema or migration work

- owner: engineer
- support: security
- gate: build plus targeted app verification

### Risky auth or middleware change

- owner: security
- support: engineer
- gate: verify + e2e

---

## Current high-leverage commands

```bash
scripts/dispatch-board.sh lookup "PortalLayoutClient"
scripts/engineer-loop.sh prep
scripts/engineer-loop.sh auth
scripts/engineer-loop.sh verify
scripts/engineer-loop.sh e2e
node scripts/audit-portal-routes.mjs
npm run test:unit
npm run build
```

---

## GBrain usage

WorkforceAP repo memory is indexed as source `workforceap`.

This repo is pinned locally via `.gbrain-source`, so repo-context commands can resolve WorkforceAP without repeating the source every time.

Useful recall:

```bash
gbrain search "sync-test-auth" --source workforceap
gbrain query "What protects portal routes?" --source workforceap
gbrain query "What are the WorkforceAP product stakes?" --source workforceap
```

Note:

- docs/process recall works now
- full code import ran and symbol lookup works
- `code-callers` / `code-callees` may still under-report JSX/import-only relationships
- use `gbrain query --lang typescript` for broad code recall
- use `gbrain code-def <symbol>` and `gbrain code-refs <symbol>` first for named symbols
- use repo-native search for exact code reads
