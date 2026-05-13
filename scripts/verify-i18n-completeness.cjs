#!/usr/bin/env node
/**
 * verify-i18n-completeness.cjs
 *
 * Compares message keys across locales to find missing translations.
 * Usage:
 *   node scripts/verify-i18n-completeness.cjs
 *   node scripts/verify-i18n-completeness.cjs --json
 *   node scripts/verify-i18n-completeness.cjs --locale es
 *
 * Exit code:
 *   0 = all locales complete (or only warnings)
 *   1 = missing keys found (fail CI)
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const SOURCE_LOCALE = 'en';
const LOCALES = ['es', 'fr', 'pt'];

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function findMissing(sourceKeys, targetKeys) {
  const targetSet = new Set(targetKeys);
  return sourceKeys.filter((k) => !targetSet.has(k));
}

function findEmpty(sourceObj, targetObj, prefix = '') {
  const empties = [];
  for (const [k, v] of Object.entries(targetObj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const sourceSub = sourceObj?.[k];
      if (sourceSub && typeof sourceSub === 'object') {
        empties.push(...findEmpty(sourceSub, v, full));
      }
    } else if (typeof v === 'string' && v.trim() === '') {
      const sourceVal = getValueAtPath(sourceObj, full);
      if (sourceVal && sourceVal.trim() !== '') {
        empties.push(full);
      }
    }
  }
  return empties;
}

function getValueAtPath(obj, pathStr) {
  const parts = pathStr.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const localeFilter = args.includes('--locale') ? args[args.indexOf('--locale') + 1] : null;

  const source = loadJson(path.join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`));
  const sourceKeys = flattenKeys(source);

  const localesToCheck = localeFilter ? [localeFilter] : LOCALES;
  const results = [];
  let totalMissing = 0;
  let totalEmpty = 0;

  for (const locale of localesToCheck) {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    if (!fs.existsSync(filePath)) {
      results.push({ locale, file: `${locale}.json`, missing: sourceKeys, empty: [], error: 'File not found' });
      totalMissing += sourceKeys.length;
      continue;
    }

    const target = loadJson(filePath);
    const targetKeys = flattenKeys(target);
    const missing = findMissing(sourceKeys, targetKeys);
    const empty = findEmpty(source, target);

    totalMissing += missing.length;
    totalEmpty += empty.length;

    results.push({ locale, file: `${locale}.json`, totalSource: sourceKeys.length, totalTarget: targetKeys.length, missing, empty });
  }

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(totalMissing > 0 || totalEmpty > 0 ? 1 : 0);
  }

  console.log(`Source: ${SOURCE_LOCALE}.json — ${sourceKeys.length} keys\n`);

  for (const r of results) {
    if (r.error) {
      console.log(`❌ ${r.locale.toUpperCase()}: ${r.error} (${r.missing.length} missing)`);
      continue;
    }
    const pct = ((r.totalTarget / r.totalSource) * 100).toFixed(1);
    const status = r.missing.length === 0 && r.empty.length === 0 ? '✅' : '⚠️';
    console.log(`${status} ${r.locale.toUpperCase()}: ${r.totalTarget}/${r.totalSource} keys (${pct}%)`);
    if (r.missing.length > 0) {
      console.log(`   Missing (${r.missing.length}):`);
      for (const k of r.missing.slice(0, 20)) {
        console.log(`     - ${k}`);
      }
      if (r.missing.length > 20) {
        console.log(`     ... and ${r.missing.length - 20} more`);
      }
    }
    if (r.empty.length > 0) {
      console.log(`   Empty strings (${r.empty.length}):`);
      for (const k of r.empty.slice(0, 10)) {
        console.log(`     - ${k}`);
      }
      if (r.empty.length > 10) {
        console.log(`     ... and ${r.empty.length - 10} more`);
      }
    }
    console.log('');
  }

  if (totalMissing > 0 || totalEmpty > 0) {
    console.log(`\nSummary: ${totalMissing} missing keys, ${totalEmpty} empty strings across ${localesToCheck.length} locale(s).`);
    console.log('Run with --json for machine-readable output.');
    process.exit(1);
  }

  console.log('\n✅ All checked locales are complete.');
  process.exit(0);
}

main();
