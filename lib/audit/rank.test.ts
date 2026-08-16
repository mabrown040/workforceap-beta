import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "../..");
const RANKER = join(ROOT, "scripts/audit-rank.mjs");

function rank(claims: unknown[]) {
  const dir = mkdtempSync(join(tmpdir(), "audit-rank-"));
  mkdirSync(join(dir, "claims"));
  writeFileSync(join(dir, "claims", "batch.json"), JSON.stringify(claims, null, 2));
  execFileSync(process.execPath, [RANKER], {
    env: { ...process.env, AUDIT_GRAPH_DIR: dir, AUDIT_RUN_ID: "run_test" },
    cwd: ROOT,
  });
  const out = JSON.parse(readFileSync(join(dir, "rank.json"), "utf8"));
  rmSync(dir, { recursive: true, force: true });
  return out;
}

function claim(partial: Record<string, unknown>) {
  return {
    id: "clm_x",
    runId: "run_test",
    auditor: "hot-paths",
    entityIds: ["ent_a"],
    title: "x",
    severity: "latent",
    blast: "b",
    evidence: "e",
    verify: "v",
    status: "open",
    ...partial,
  };
}

test("ranker puts prod-break above ship-break and drops hygiene from the slice", () => {
  const out = rank([
    claim({ id: "clm_h", title: "unused export", severity: "hygiene", entityIds: ["ent_h"] }),
    claim({ id: "clm_s", title: "enroll 404", severity: "ship-break", entityIds: ["ent_s"] }),
    claim({ id: "clm_p", title: "leaked key", severity: "prod-break", entityIds: ["ent_p"] }),
    claim({ id: "clm_l", title: "empty catalog", severity: "latent", entityIds: ["ent_l"] }),
  ]);
  assert.equal(out.generatedBy, "scripts/audit-rank.mjs");
  assert.deepEqual(
    out.topSlice.map((t: { id: string }) => t.id),
    ["clm_p", "clm_s", "clm_l"]
  );
  assert.ok(out.dropped.some((d: { id: string; reason: string }) => d.id === "clm_h" && d.reason === "hygiene-excluded"));
});

test("ranker collapses duplicate titles on the same entities", () => {
  const out = rank([
    claim({ id: "clm_1", title: "Cookie not stamped", entityIds: ["ent_apply"], severity: "ship-break" }),
    claim({ id: "clm_2", title: "cookie  not   stamped", entityIds: ["ent_apply"], severity: "ship-break", auditor: "secrets" }),
  ]);
  assert.deepEqual(
    out.topSlice.map((t: { id: string }) => t.id),
    ["clm_1"]
  );
  assert.ok(out.dropped.some((d: { id: string; reason: string; of: string }) => d.id === "clm_2" && d.reason === "duplicate" && d.of === "clm_1"));
});

test("ranker caps the top slice at 7", () => {
  const claims = Array.from({ length: 10 }, (_, i) =>
    claim({
      id: `clm_${i}`,
      title: `break ${i}`,
      severity: "ship-break",
      entityIds: [`ent_${i}`],
    })
  );
  const out = rank(claims);
  assert.equal(out.topSlice.length, 7);
  assert.equal(out.dropped.filter((d: { reason: string }) => d.reason === "below-slice").length, 3);
});
