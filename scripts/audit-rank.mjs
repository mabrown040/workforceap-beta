#!/usr/bin/env node
/**
 * Rank is code, not an agent. Zero tokens.
 * Severity: prod-break > ship-break > latent > hygiene.
 * Duplicates (same entity set + normalized title) collapse to the earliest claim.
 * Hygiene never enters the default top slice.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const GRAPH = process.env.AUDIT_GRAPH_DIR || join(ROOT, "graph");
const SEVERITY = { "prod-break": 0, "ship-break": 1, latent: 2, hygiene: 3 };
const TOP_MAX = 7;

function loadClaims() {
  const dir = join(GRAPH, "claims");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const out = [];
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const batch = Array.isArray(raw) ? raw : raw.claims || [raw];
    for (const c of batch) out.push({ ...c, _file: f });
  }
  return out;
}

function normTitle(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function entityKey(ids) {
  return [...(ids || [])].sort().join(",");
}

function main() {
  const claims = loadClaims().filter((c) => c.status === "open" || !c.status);
  const seen = new Map();
  const unique = [];
  const dropped = [];

  for (const c of claims) {
    const key = `${entityKey(c.entityIds)}::${normTitle(c.title)}`;
    if (seen.has(key)) {
      dropped.push({ id: c.id, reason: "duplicate", of: seen.get(key) });
      continue;
    }
    seen.set(key, c.id);
    unique.push(c);
  }

  unique.sort((a, b) => {
    const sa = SEVERITY[a.severity] ?? 9;
    const sb = SEVERITY[b.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    return String(a.id).localeCompare(String(b.id));
  });

  const topSlice = [];
  const rest = [];
  for (const c of unique) {
    if (c.severity === "hygiene") {
      rest.push({ id: c.id, reason: "hygiene-excluded" });
      continue;
    }
    if (topSlice.length < TOP_MAX && (c.severity === "prod-break" || c.severity === "ship-break" || c.severity === "latent")) {
      if (c.severity === "latent" && topSlice.some((t) => t.severity === "prod-break" || t.severity === "ship-break") && topSlice.length >= 5) {
        rest.push({ id: c.id, reason: "below-slice" });
        continue;
      }
      topSlice.push({
        id: c.id,
        severity: c.severity,
        auditor: c.auditor,
        title: c.title,
        blast: c.blast,
        evidence: c.evidence,
        verify: c.verify,
      });
      continue;
    }
    rest.push({ id: c.id, reason: "below-slice" });
  }

  const runId = process.env.AUDIT_RUN_ID || null;
  const rank = {
    runId,
    generatedBy: "scripts/audit-rank.mjs",
    generatedAt: new Date().toISOString(),
    topSlice,
    dropped: [...dropped, ...rest],
  };
  writeFileSync(join(GRAPH, "rank.json"), JSON.stringify(rank, null, 2) + "\n");

  const index = unique.map((c) => ({
    id: c.id,
    runId: c.runId,
    auditor: c.auditor,
    title: c.title,
    severity: c.severity,
    status: c.status || "open",
  }));
  writeFileSync(join(GRAPH, "claims.json"), JSON.stringify(index, null, 2) + "\n");

  console.log(`ranked ${unique.length} unique / ${claims.length} raw`);
  console.log(`top slice (${topSlice.length}):`);
  for (const t of topSlice) console.log(`  [${t.severity}] ${t.id}  ${t.title}`);
}

main();
