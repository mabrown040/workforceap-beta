#!/usr/bin/env bash
# Frozen schema gate. Fail closed.
set -euo pipefail
cd "$(dirname "$0")/.."

need=(
  graph/SCHEMA.md
  graph/entities.json
  graph/claims.json
  graph/runs.json
  graph/rules.json
  graph/rank.json
  graph/map.json
  scripts/audit-rank.mjs
  scripts/audit-map.mjs
)
for f in "${need[@]}"; do
  [[ -f "$f" ]] || { echo "missing $f"; exit 1; }
done

node -e '
const fs = require("fs");
for (const f of ["graph/entities.json","graph/claims.json","graph/runs.json","graph/rules.json","graph/rank.json","graph/map.json"]) {
  JSON.parse(fs.readFileSync(f, "utf8"));
}
const claims = JSON.parse(fs.readFileSync("graph/claims.json","utf8"));
const rules = JSON.parse(fs.readFileSync("graph/rules.json","utf8"));
for (const c of claims) {
  if (c.status === "accepted") {
    const ok = rules.some((r) => r.fromClaimId === c.id && r.status === "accepted")
      || rules.some((r) => r.status === "accepted" && r.text && c.title && r.text.includes(c.title.slice(0, 24)));
    const wont = claims.some((x) => x.supersedes === c.id && x.status === "wontfix");
    if (!ok && !wont) {
      console.error("accepted claim has no rule or wontfix:", c.id);
      process.exit(1);
    }
  }
}
console.log("graph schema ok");
'

# Canonical enroll URL must stay un-prefixed (accepted rule).
# Prefix list lives in lib/i18n/config.ts (middleware imports it).
if grep -n "LOCALEABLE_PATH_PREFIXES" lib/i18n/config.ts >/dev/null; then
  if awk '/export const LOCALEABLE_PATH_PREFIXES/,/];/' lib/i18n/config.ts | grep -E "['\"]/?enroll['\"]"; then
    echo "rule fail: /enroll must not be in LOCALEABLE_PATH_PREFIXES"
    exit 1
  fi
fi
echo "rules ok"
