---
name: blast-radius-audit
description: Use when asked to run a blast-radius audit, the four-auditor loop, a graph-engineering audit, or to turn accepted findings into durable repo rules.
---

# Blast-radius audit

A codebase audit is a **graph**, not a chat. The agent forgets; the graph does not.

Loop (one beat):

```
repo → map → 4 auditors → rank → fix → verify → report → back into the map
```

One human step in the whole loop: **which fixes ship**. Nothing unattended reaches `main`.

The viral “Anthropic leaked a 4-agent setup” framing is **not** an Anthropic paper. The loop below is this repo’s encoding of that playbook plus [Graph Engineering: A Crash Course](https://agentfactory.panaversity.org/docs/graph-engineering-crash-course) (Panaversity / AI Agent Factory).

## Frozen nodes (do not rewrite mid-loop)

These files are the schema / ranker / check scripts. An optimizing loop may not edit them to make a finding look better:

- `graph/SCHEMA.md`
- `scripts/audit-rank.mjs`
- `scripts/audit-graph-check.sh`

`LOCALEABLE_PATH_PREFIXES` lives in `lib/i18n/config.ts`. The graph-check reads that file, not `middleware.ts`.

Change them in a dedicated PR, not inside an audit beat.

## 1. Map (blast radius, not folders)

Skip this and four agents audit the same three files and miss the one that ships broken.

```bash
node scripts/audit-map.mjs
```

Reads git hotspots + import neighbors + known product clusters. Writes `graph/map.json`.

A **cluster** is a blast-radius cut: the files that fail together when one of them is wrong (shared cookie, shared Prisma write, shared middleware). Folder trees are a hint, not the cut.

Hand each auditor a **subgraph** (one cluster + its edges), never the whole repo.

## 2. Four auditors (parallel, isolated contexts)

Launch four Task agents in **one** message. Separate contexts. **None of them sees another’s findings.**

| Auditor | Looks for | Must not do |
|---|---|---|
| `deps` | version drift, missing peer, import of unpublished / circular, lockfile vs declared | rank, patch |
| `secrets` | leaked keys, unsafe env reads, cookie / token / PII paths | rank, patch |
| `dead-code` | unused exports, orphan routes, seed that never runs, flags that cannot fire | rank, patch |
| `hot-paths` | request paths that hit production (middleware, signup, enroll, consent, payment) | rank, patch |

Each auditor returns **typed claims** only (`graph/SCHEMA.md`). Ground every claim in a file path + line or a command’s stdout. Inference is not evidence. “Looks fine” is not a claim.

Write claims to `graph/claims/<auditor>-<runId>.json` (append-only). Never edit an older claim file — supersede it with a new claim that points at the old `id`.

## 3. Rank (code, not an agent)

```bash
node scripts/audit-rank.mjs
```

Sorts by what breaks production, drops duplicates, writes `graph/rank.json`. Zero tokens. Do not re-rank in prose.

Default **top slice** = severity `ship-break` + `prod-break`, max 7 claims. A hundred findings nobody acts on is a report, not an audit.

## 4. Fix (top slice only)

The fixer opens patches **only** for the ranked top slice. One claim → one commit when possible.

Do not “also clean up” neighboring files. That collapses blast-radius cuts.

## 5. Verify (per patch, not the batch)

Run the suite that the claim’s `verify` field names. Red goes back to **that patch only**, never the whole batch.

Anchors must be real tool output (test runner, `tsc`, HTTP status), not agent prose. Store stdout under `graph/evidence/<claimId>.txt`.

## 6. Report

Write `graph/reports/<runId>.md`:

- top slice (ranked)
- what was patched
- what verified green / red
- what was left for a human
- new rules proposed for the back edge

## 7. Back edge (the whole trick)

Accepted findings become **rules** in `graph/rules.json` so next week starts where this one ended.

A rule is a durable constraint (example: “do not add `/enroll` to `LOCALEABLE_PATH_PREFIXES`”). The map script and later auditors load rules as extra edges / skip-or-fail checks.

Human gate: a rule is `accepted` only after someone marks it. Agents may add `proposed` rules. `scripts/audit-graph-check.sh` fails if a claim is marked `accepted` without a rule or a `wontfix` supersession.

## Governance

- Two graphs: the **commit DAG** (work) and the **knowledge graph** (facts). Do not confuse them.
- Plus a **governance graph**: who checks whom. Auditors do not rank. Ranker does not patch. Fixer does not accept rules. Human accepts rules and chooses which fixes ship.
- Hand subgraphs, not the whole graph.
- On-disk shape: `graph/SCHEMA.md`, `entities.json`, `claims.json` (index), `runs.json`, `rules.json`, `map.json`, `evidence/`.
