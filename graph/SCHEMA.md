# Audit knowledge graph — schema

Frozen node. Change in a dedicated PR, not inside an audit beat.

The agent forgets; this graph does not. Claims are append-only. Never edit or delete a claim — supersede it.

## Entities (`graph/entities.json`)

```json
{
  "id": "ent_cluster_partner_school",
  "kind": "cluster" | "file" | "route" | "rule" | "secret-sink" | "job",
  "label": "human name",
  "path": "optional repo path or URL path",
  "clusterId": "optional parent cluster id"
}
```

## Claims (`graph/claims.json` index + `graph/claims/*.json` batches)

```json
{
  "id": "clm_<auditor>_<short>",
  "runId": "run_YYYYMMDD_hhmm",
  "auditor": "deps" | "secrets" | "dead-code" | "hot-paths",
  "entityIds": ["ent_..."],
  "title": "one line",
  "severity": "ship-break" | "prod-break" | "latent" | "hygiene",
  "blast": "what else dies if this is wrong",
  "evidence": "file:line or command + stdout pointer under graph/evidence/",
  "verify": "exact command that would go red if the bug is real",
  "supersedes": null,
  "status": "open" | "patched" | "verified" | "accepted" | "wontfix"
}
```

`ship-break` = users cannot complete a path that is supposed to work (404, 500, wrong stamp).
`prod-break` = data loss, leaked secret, wrong tenant, payment / consent skipped.
`latent` = will break on the next school / next deploy / next empty catalog.
`hygiene` = dead code, naming, comments. Ranker drops these from the default top slice.

## Runs (`graph/runs.json`)

```json
{
  "id": "run_YYYYMMDD_hhmm",
  "startedAt": "ISO",
  "mapFile": "graph/map.json",
  "claimFiles": ["graph/claims/deps-run_....json"],
  "rankFile": "graph/rank.json",
  "reportFile": "graph/reports/run_....md",
  "humanGate": "pending" | "ship-selected" | "closed"
}
```

## Rules (`graph/rules.json`) — the back edge

Accepted findings become rules. Next map/audit loads them.

```json
{
  "id": "rul_...",
  "fromClaimId": "clm_...",
  "status": "proposed" | "accepted" | "retired",
  "text": "durable constraint",
  "check": "optional command or file:symbol the map/auditor must honor"
}
```

## Rank (`graph/rank.json`)

Written only by `scripts/audit-rank.mjs`. Severity order: prod-break > ship-break > latent > hygiene. Duplicates (same `entityIds` + normalized title) collapse to the earliest claim.

## Evidence

`graph/evidence/<claimId>.txt` — raw tool output. Anchors are this file, not agent prose.
