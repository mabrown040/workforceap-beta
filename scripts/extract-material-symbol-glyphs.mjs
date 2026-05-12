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
const SCAN_TOP = ['app', 'components', 'lib'].map((d) => path.join(ROOT, d)).filter((p) => fs.existsSync(p));

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
    } else if (/\.(tsx|ts)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function addCronIcons(content) {
  for (const m of content.matchAll(/^\s*icon:\s*['"]([a-z0-9_]+)['"],?\s*$/gm)) {
    glyphs.add(m[1]);
  }
}

function addNavTabMetaIcons(content) {
  const block = content.match(/export const NAV_TAB_META[^]*?\n};/);
  if (!block) return;
  for (const m of block[0].matchAll(/\bicon:\s*'([a-z0-9_]+)'/g)) {
    glyphs.add(m[1]);
  }
}

function addFromMaterialFile(content) {
  const spanRe = /<span[^>]*material-symbols-outlined[^>]*>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = spanRe.exec(content))) {
    const inner = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (/^[a-z0-9_]+$/.test(inner)) {
      glyphs.add(inner);
    }
  }
  // Inline arrays / props that feed <span class="material-symbols-outlined">{row.icon}</span>
  const dynamicMaterialIcon = /\{[^}]*\.icon[^}]*\}/.test(content);
  if (dynamicMaterialIcon) {
    for (const x of content.matchAll(/\bicon:\s*['"]([a-z0-9_]+)['"]/g)) {
      glyphs.add(x[1]);
    }
  }
}

for (const top of SCAN_TOP) {
  for (const file of walk(top)) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  if (rel === path.join('lib', 'admin', 'cronRegistry.ts')) {
    addCronIcons(content);
  }
  if (rel === path.join('lib', 'nav', 'portalNav.ts')) {
    addNavTabMetaIcons(content);
  }
    if (content.includes('material-symbols-outlined')) {
      addFromMaterialFile(content);
    }
  }
}

const sorted = [...glyphs].sort();
const outFile = path.join(__dirname, 'material-symbol-glyphs.txt');
fs.writeFileSync(outFile, `${sorted.join('\n')}\n`);
console.log(`Wrote ${sorted.length} glyph names to ${path.relative(ROOT, outFile)}`);
