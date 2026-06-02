# WorkforceAP Code-Aware Workflow

Current truth:

- repo-local source pin is active via `.gbrain-source`
- GBrain source `workforceap` is live for repo docs and markdown context
- a full code import ran against the repo: `1242` code pages, `3470` chunks
- symbol lookup works for definitions and references
- caller/callee graph is still sparse for JSX/import-only relationships

That means the practical code-aware stack is:

1. GBrain for repo memory and decision context
2. `gbrain code-def` / `gbrain code-refs` for symbol lookup
3. `gbrain query` for broad TypeScript/code retrieval
4. `rg` for exact code retrieval
5. repo command map for verification

## Working pattern

### 1. Pull context

```bash
gbrain query "What are the WorkforceAP product stakes?" --source workforceap
gbrain search "portal audit" --source workforceap
```

### 2. Pull broad code context

```bash
gbrain code-def PortalLayoutClient
gbrain code-refs PortalLayoutClient
gbrain query "PortalLayoutClient" --lang typescript
gbrain query "sync-test-auth portal auth bootstrap" --lang typescript
```

### 3. Pull exact code

```bash
rg -n "PortalLayoutClient|sync-test-auth|wioa-qualification" .
```

### 4. Run the right gate

```bash
scripts/engineer-loop.sh verify
```

Or, if the slice is risky:

```bash
scripts/engineer-loop.sh e2e
```

## Best code-aware entry points

- `package.json` — canonical command map
- `scripts/sync-portal-test-auth.ts` — auth/bootstrap stabilizer
- `scripts/audit-portal-routes.mjs` — route-wide portal sweep
- `tests/e2e/` — full UI and auth verification
- `docs/AGENT_CHANGE_GUARDRAILS.md` — execution discipline
- `docs/PRODUCT_STAKES.md` — product constraints

## Repo-local source pin

This repo now carries:

```bash
cat .gbrain-source
```

Expected output:

```text
workforceap
```

That keeps repo-context commands pointed at the right source without extra flags.

## Why this is enough for now

This avoids fake “smart” workflow theater.
It keeps decision memory in GBrain, symbol lookup in GBrain, broad code recall in GBrain query, and exact truth in the repo.
That is enough to dispatch fast without hallucinating architecture.
