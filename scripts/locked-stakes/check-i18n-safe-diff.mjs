#!/usr/bin/env node
// Conservative diff-shape check for the locked-product-stakes gate.
//
// Returns exit 0 with `safe=true` on stdout when the PR is provably an
// "i18n-only rewrap" — i.e. the only changes are wrapping existing English
// strings with `t('key')` calls and adding the corresponding messages/en.json
// (and optionally messages/<lang>.json) entries. Any other change shape fails
// closed, which means the workflow falls through to the explicit
// `stake-approved` label requirement.
//
// Invoked from .github/workflows/locked-product-stakes.yml via github-script,
// which provides:
//   - lockedPatterns: string[]      — the locked file globs
//   - changedFiles: string[]        — every filename in the PR
//   - lockedPatches: { [f]: string } — patch text per touched locked file
//   - messagesPatches: { [f]: string } — patch text per messages/*.json touched
//   - baseEn: object | null         — parsed messages/en.json at PR base
//   - headEn: object | null         — parsed messages/en.json at PR head
//
// Reads JSON input from stdin, writes JSON `{ safe, reason }` to stdout.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Parse a unified diff patch into lines tagged as added/removed/context.
 * We strip the `+`/`-`/` ` prefix and ignore hunk headers (`@@`) and the
 * file header. We do NOT split into hunks because for our check we only
 * need the global removed/added line lists.
 */
function parsePatch(patch) {
  const removed = [];
  const added = [];
  for (const raw of patch.split('\n')) {
    if (raw.startsWith('+++') || raw.startsWith('---') || raw.startsWith('@@')) continue;
    if (raw.startsWith('+')) added.push(raw.slice(1));
    else if (raw.startsWith('-')) removed.push(raw.slice(1));
    // context lines: ignore
  }
  return { removed, added };
}

/**
 * Flatten a (possibly nested) i18n messages object into a flat
 * `{ 'a.b.c': value }` map of leaf string values.
 */
function flattenMessages(obj, prefix = '') {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenMessages(v, path));
    } else if (typeof v === 'string') {
      out[path] = v;
    }
  }
  return out;
}

/**
 * Compute the keys that are NEW in head (present in head, absent in base, or
 * with a different string value than base). Returns flat-path → value.
 */
function diffNewKeys(base, head) {
  const baseFlat = flattenMessages(base);
  const headFlat = flattenMessages(head);
  const out = {};
  for (const [k, v] of Object.entries(headFlat)) {
    if (baseFlat[k] !== v) out[k] = v;
  }
  return out;
}

/**
 * Extract the string-literal values from a JSX/TS line. Handles `'…'`, `"…"`,
 * and template literals WITHOUT interpolation (`` `foo` ``). Template
 * literals with `${` are excluded — those need the explicit label.
 */
function extractLiterals(line) {
  const out = [];
  // Single + double quotes (greedy non-newline, basic — doesn't handle escapes
  // perfectly but the conservative pair check catches mismatches).
  const re = /(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push(m[2]);
  // Plain backtick templates — only when there's no `${`.
  const tRe = /`([^`$]*)`/g;
  while ((m = tRe.exec(line)) !== null) out.push(m[1]);
  return out;
}

/**
 * Extract `t('keyname')` / `t("keyname")` keys from a line.
 */
function extractTCalls(line) {
  const out = [];
  const re = /\bt\(\s*(['"])([^'"]+?)\1\s*\)/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push(m[2]);
  return out;
}

/**
 * Normalize a removed line by replacing every "i18n-target string" with
 * `__LIT__`. Targets include both quoted JS literals AND any new
 * messages/en.json key value that appears as JSX text (since wrapping a
 * literal JSX text node in `{t('key')}` removes the bare text without it
 * ever being a quoted string).
 *
 * We replace the longest values first to avoid partial overlap when one new
 * key value is a substring of another.
 */
function normalizeRemoved(line, newKeyValues) {
  let out = line;
  for (const v of newKeyValues) {
    if (v && v.length > 0) out = out.split(v).join('__LIT__');
  }
  out = out.replace(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g, '__LIT__');
  return out;
}

/**
 * Normalize an added line by replacing every `t('…')` (with optional surrounding
 * `{}`) with `__LIT__` AND every remaining string literal with `__LIT__`.
 */
function normalizeAdded(line) {
  return line
    .replace(/\{?\s*\bt\(\s*(['"])([^'"]+?)\1\s*\)\s*\}?/g, '__LIT__')
    .replace(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g, '__LIT__');
}

/**
 * Extract anything that LOOKS like an i18n-target on a removed line — quoted
 * literals AND JSX text fragments matching one of the new messages/en.json
 * key values. JSX text isn't a quoted string in source, so we identify it
 * by matching the line text against the set of new-key values.
 */
function extractRemovedTargets(line, newKeyValues) {
  const out = [...extractLiterals(line)];
  for (const v of newKeyValues) {
    if (v && v.length > 0 && line.includes(v)) out.push(v);
  }
  return out;
}

function checkLockedPatch(filename, patch, newKeys) {
  const { removed, added } = parsePatch(patch);

  // Filter out blank/whitespace-only diff lines (e.g. trailing-comma toggles).
  const meaningfulRemoved = removed.filter((l) => l.trim().length > 0);
  const meaningfulAdded = added.filter((l) => l.trim().length > 0);

  if (meaningfulRemoved.length !== meaningfulAdded.length) {
    return {
      safe: false,
      reason: `${filename}: removed=${meaningfulRemoved.length} vs added=${meaningfulAdded.length} lines (must be 1:1 for the i18n bypass)`,
    };
  }

  const newKeyValues = Object.values(newKeys);

  for (let i = 0; i < meaningfulRemoved.length; i += 1) {
    const r = meaningfulRemoved[i];
    const a = meaningfulAdded[i];
    if (normalizeRemoved(r, newKeyValues) !== normalizeAdded(a)) {
      return {
        safe: false,
        reason: `${filename}: line pair ${i + 1} differs in non-literal content. Removed:\n  ${r}\nAdded:\n  ${a}`,
      };
    }
    const removedLits = extractRemovedTargets(r, newKeyValues);
    const addedTKeys = extractTCalls(a);
    if (removedLits.length === 0) {
      return {
        safe: false,
        reason: `${filename}: line pair ${i + 1} removed no string literal or known new-key value — bypass only allows literal-to-t() rewrapping`,
      };
    }
    if (addedTKeys.length === 0) {
      return {
        safe: false,
        reason: `${filename}: line pair ${i + 1} added no t() call — bypass only allows literal-to-t() rewrapping`,
      };
    }
    if (removedLits.length !== addedTKeys.length) {
      return {
        safe: false,
        reason: `${filename}: line pair ${i + 1} has ${removedLits.length} literal(s) vs ${addedTKeys.length} t() call(s)`,
      };
    }
    for (let j = 0; j < removedLits.length; j += 1) {
      const lit = removedLits[j];
      const key = addedTKeys[j];
      // Try (a) the bare key as-is and (b) any flattened key whose suffix matches.
      const value = newKeys[key] ?? Object.entries(newKeys).find(([k]) => k === key || k.endsWith(`.${key}`))?.[1];
      if (value !== lit) {
        return {
          safe: false,
          reason: `${filename}: line pair ${i + 1} literal "${lit}" does not equal new messages key "${key}" value "${value ?? '(missing)'}"`,
        };
      }
    }
  }

  return { safe: true };
}

function checkMessagesPatch(filename, patch) {
  const { removed } = parsePatch(patch);
  // Allow trivial removals: a `,` toggle, blank line, or `}` shift caused by
  // adding new keys. Anything containing a quoted string is treated as a
  // potentially-meaningful removal that requires the explicit label.
  for (const line of removed) {
    if (line.includes('"') || line.includes("'") || line.includes(':')) {
      return {
        safe: false,
        reason: `${filename}: removed line contains key/value content — bypass requires add-only i18n diffs:\n  ${line}`,
      };
    }
  }
  return { safe: true };
}

export function checkI18nSafeDiff(input) {
  const {
    lockedPatterns = [],
    changedFiles = [],
    lockedPatches = {},
    messagesPatches = {},
    baseEn = null,
    headEn = null,
  } = input;

  // Every changed file must be either a locked file or a messages/*.json file.
  const messagesRe = /^messages\/[^/]+\.json$/;
  for (const f of changedFiles) {
    if (lockedPatterns.includes(f)) continue;
    if (messagesRe.test(f)) continue;
    return {
      safe: false,
      reason: `Non-locked, non-i18n file changed: ${f}. Bypass only allowed when ONLY locked files + messages/*.json are touched.`,
    };
  }

  const touchedLockedFiles = changedFiles.filter((f) => lockedPatterns.includes(f));
  for (const f of touchedLockedFiles) {
    if (typeof lockedPatches[f] !== 'string' || lockedPatches[f].length === 0) {
      return {
        safe: false,
        reason: `${f}: missing locked file patch — bypass requires patch text for every touched locked file.`,
      };
    }
  }

  // messages/*.json must be add-only.
  for (const [f, patch] of Object.entries(messagesPatches)) {
    const r = checkMessagesPatch(f, patch);
    if (!r.safe) {
      return r;
    }
  }

  // Locked-file diffs must be 1:1 literal-to-t() rewraps whose values match
  // the new keys in messages/en.json.
  const newKeys = diffNewKeys(baseEn, headEn);
  if (Object.keys(newKeys).length === 0) {
    return {
      safe: false,
      reason: 'No new messages/en.json keys detected — nothing to verify rewraps against.',
    };
  }

  for (const [f, patch] of Object.entries(lockedPatches)) {
    const r = checkLockedPatch(f, patch, newKeys);
    if (!r.safe) {
      return r;
    }
  }

  return {
    safe: true,
    reason: `Verified ${Object.keys(newKeys).length} new i18n keys match removed literal values across ${Object.keys(lockedPatches).length} locked file(s).`,
  };
}

function main() {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw);
  process.stdout.write(JSON.stringify(checkI18nSafeDiff(input)));
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
