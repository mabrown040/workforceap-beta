#!/usr/bin/env node
/**
 * Collect Material Symbols ligature names used across the repo so we can subset the font.
 * Run from repo root: node scripts/extract-material-symbol-glyphs.mjs
 *
 * Pair with scripts/subset-material-symbols.py (Google Fonts `icon_names` subset → self-hosted woff2).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SKIP_DIRS = new Set(['node_modules', '.next', 'out', '.git', 'playwright-report', 'test-results']);

/** Only scan first-party source trees (avoids rare huge symlinked dirs under repo root). */
const SCAN_TOP = ['app', 'components', 'lib', 'css']
  .map((d) => path.join(ROOT, d))
  .filter((p) => fs.existsSync(p));

/** Local const maps whose string values are Material icon ligature names. */
const ICON_MAP_NAMES = [
  'LEVEL_ICONS',
  'MODULE_ICONS',
  'STAGE_ICONS',
  'INTEREST_ICONS',
  'SECTION_ICONS',
  'TOOL_ICONS',
];

/** @type {Set<string>} */
const glyphs = new Set();

function walk(dir, acc = []) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of ents) {
    if (ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx|ts|css)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

/** `icon: 'name'` in objects / nav config / data files (no `<span>` nearby). */
function addIconPropGlyphs(content) {
  for (const m of content.matchAll(/\bicon:\s*['"]([a-z0-9_]+)['"]/g)) {
    glyphs.add(m[1]);
  }
}

/** JSX props like `<ContactInfoCard icon="call" />` that later render in a Material Symbols span. */
function addJsxIconAttributeGlyphs(content) {
  for (const m of content.matchAll(/\bicon\s*=\s*['"]([a-z0-9_]+)['"]/g)) {
    glyphs.add(m[1]);
  }
}

/** Pathway milestones use const arrays without `icon:` keys. */
function addPathwayIconArrays(content) {
  for (const m of content.matchAll(
    /(?:IT_SUPPORT_STEP_ICONS|FALLBACK_STEP_ICONS)\s*=\s*\[([\s\S]*?)\]\s*as\s+const/g
  )) {
    for (const x of m[1].matchAll(/'([a-z0-9_]+)'/g)) {
      glyphs.add(x[1]);
    }
  }
}

function addIconMapGlyphs(content) {
  for (const name of ICON_MAP_NAMES) {
    const re = new RegExp(`${name}\\s*[:=][\\s\\S]*?\\{([\\s\\S]*?)\\}`, 'g');
    let m;
    while ((m = re.exec(content))) {
      for (const x of m[1].matchAll(/['"]([a-z][a-z0-9_]*)['"]/g)) {
        glyphs.add(x[1]);
      }
    }
  }
}

/** CSS pseudo-elements that render Material Symbols via `content: 'icon_name'`. */
function addCssContentGlyphs(content) {
  if (!content.includes('Material Symbols Outlined')) return;
  for (const m of content.matchAll(/content:\s*['"]([a-z][a-z0-9_]*)['"]/g)) {
    glyphs.add(m[1]);
  }
}

function addQuotedIconCandidates(inner, add) {
  /** Drop comparison operands (`=== 'loading'`) and i18n keys (`t('completed')`). */
  const stripped = inner
    .replace(/(?:===|!==)\s*['"][^'"]+['"]/g, '')
    .replace(/\bt\(\s*['"][^'"]+['"]\s*\)/g, '');
  for (const sm of stripped.matchAll(/['"]([a-z][a-z0-9_]*)['"]/g)) {
    add(sm[1]);
  }
}

function addMaterialSymbolSpans(content) {
  const spanRe = /<span[^>]*material-symbols-outlined[^>]*>([\s\S]*?)<\/span>/gi;

  let m;
  while ((m = spanRe.exec(content))) {
    const inner = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (/^[a-z0-9_]+$/.test(inner)) {
      glyphs.add(inner);
      continue;
    }
    /** Ternaries like `{filled ? 'star' : 'star_border'}`, template fragments, etc. */
    addQuotedIconCandidates(inner, (name) => glyphs.add(name));
  }
}

for (const top of SCAN_TOP) {
  for (const file of walk(top)) {
    const content = fs.readFileSync(file, 'utf8');
    addIconPropGlyphs(content);
    addJsxIconAttributeGlyphs(content);
    addPathwayIconArrays(content);
    addIconMapGlyphs(content);
    if (file.endsWith('.css')) {
      addCssContentGlyphs(content);
    }
    if (content.includes('material-symbols-outlined')) {
      addMaterialSymbolSpans(content);
    }
  }
}

const sorted = [...glyphs].sort();
const outFile = path.join(__dirname, 'material-symbol-glyphs.txt');

// --check: verify the committed glyph list covers every icon used in source,
// without rewriting it. Run by verify-material-symbols-font-size.mjs during
// `npm run build` so a new icon can't ship rendering as raw ligature text
// (e.g. FLIGHT_TAKEOFF) because the subset font was never regenerated.
if (process.argv.includes('--check')) {
  const committed = new Set(
    fs.existsSync(outFile)
      ? fs.readFileSync(outFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
      : [],
  );
  const missing = sorted.filter((name) => !committed.has(name));
  if (missing.length > 0) {
    console.error(
      `Material Symbols subset is stale — ${missing.length} icon(s) used in source ` +
        `but missing from scripts/material-symbol-glyphs.txt:\n  ${missing.join('\n  ')}\n` +
        `These will render as raw text (e.g. "${missing[0].toUpperCase()}") in production.\n` +
        `Fix with: npm run fonts:subset-material-symbols (then commit the txt + woff2).`,
    );
    process.exit(1);
  }
  console.log(`Material Symbols subset covers all ${sorted.length} icons in source.`);
  process.exit(0);
}

fs.writeFileSync(outFile, `${sorted.join('\n')}\n`);
console.log(`Wrote ${sorted.length} glyph names to ${path.relative(ROOT, outFile)}`);
