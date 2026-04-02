/**
 * Split a concatenated Stitch HTML paste into separate files.
 * Usage: node .stitch/tools/split-stitch-dark-bundle.mjs .stitch/stitch-dark-exports.raw.html
 */
import fs from "node:fs";
import path from "node:path";

const rawPath = process.argv[2];
if (!rawPath) {
  console.error("Usage: node split-stitch-dark-bundle.mjs <raw-bundle.html>");
  process.exit(1);
}

const raw = fs.readFileSync(rawPath, "utf8");

const segments = [
  { marker: "<!-- Apply Flow Start (Mobile) -->", out: "stitch-dark-mobile-apply.html" },
  { marker: "<!-- Pathfinder Quiz (Mobile) -->", out: "stitch-dark-mobile-quiz-pathfinder.html" },
  { marker: "<!-- Programs Catalog (Mobile Final) -->", out: "stitch-dark-mobile-programs-catalog-final.html" },
  { marker: "<!-- Homepage (Mobile Final) -->", out: "stitch-dark-mobile-homepage-final.html" },
  { marker: "<!-- Home (Mobile) -->", out: "stitch-dark-mobile-home-alt.html" },
  { marker: "<!-- Programs Catalog (Mobile) -->", out: "stitch-dark-mobile-programs-catalog-bento.html" },
  { marker: "<!-- Member Dashboard (Mobile) -->", out: "stitch-dark-portal-member-dashboard.html" },
  { marker: "<!-- Apply Flow (Desktop) -->", out: "stitch-dark-desktop-apply.html" },
  { marker: "<!-- Login (Desktop) -->", out: "stitch-dark-desktop-login.html" },
  { marker: "<!-- Signup (Desktop) -->", out: "stitch-dark-desktop-signup.html" },
  { marker: "<!-- Leadership Profile - Michael Brown -->", out: "stitch-dark-leadership-michael-brown.html" },
  { marker: "<!-- Programs Catalog (with Tool Switcher) -->", out: "stitch-dark-desktop-programs-tool-switcher.html" },
];

const outDir = path.resolve(path.dirname(rawPath));
const indices = segments.map((s) => raw.indexOf(s.marker)).map((i, idx) => ({ i, name: segments[idx].out }));

for (const { i, name } of indices) {
  if (i < 0) {
    console.error("Missing marker for:", name);
    process.exit(1);
  }
}

for (let k = 0; k < segments.length; k++) {
  const start = raw.indexOf(segments[k].marker);
  const end = k + 1 < segments.length ? raw.indexOf(segments[k + 1].marker) : raw.length;
  let chunk = raw.slice(start, end).trim();
  const doctype = chunk.indexOf("<!DOCTYPE html>");
  if (doctype > 0) chunk = chunk.slice(doctype);
  const target = path.join(outDir, segments[k].out);
  fs.writeFileSync(target, chunk + "\n", "utf8");
  console.log("Wrote", path.relative(process.cwd(), target), `(${chunk.length} chars)`);
}
