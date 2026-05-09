#!/usr/bin/env node
/**
 * One-shot backfill: pull real Coursera content IDs from B4B
 * `listContents` and substitute the `TODO_courseId_<N>` placeholders left
 * over from PR #1068 in `lib/content/courseraDiscoveredCatalog.ts`.
 *
 * USAGE — operator only, never CI:
 *
 *   export COURSERA_B4B_CLIENT_ID=...
 *   export COURSERA_B4B_CLIENT_SECRET=...
 *   # optional, default is the WorkforceAP prod org:
 *   # export COURSERA_ORG_ID=8R2W4McwOMWJp9cCBV1kvw
 *
 *   # dry run — print the resolved IDs + diff summary, do NOT touch the file
 *   node scripts/backfill-coursera-courseids.cjs
 *
 *   # write the updated source back to the file
 *   node scripts/backfill-coursera-courseids.cjs --write
 *
 *   # also pipe the rewritten source to stdout (no file write)
 *   node scripts/backfill-coursera-courseids.cjs --stdout
 *
 * Why a script rather than a runtime fetch:
 *   The catalog is a TypeScript const consumed at build time by the
 *   programs UI, the launch-URL builder, and the Coursera enrolment state
 *   machine. Resolving IDs at module-load would mean a network call in
 *   every server cold-start AND the IDs would be invisible in code review.
 *   Baking them into the source is the right move — every change shows up
 *   in `git diff`.
 *
 * Sandboxed environments (no egress to api.coursera.com): the script
 * exits cleanly with code 3 and a message explaining what's needed.
 *
 * Idempotent: running twice produces the same output. The regex only
 * matches `TODO_courseId_<digits>` placeholders, so once a line has been
 * rewritten it won't be touched again.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const {
  indexB4BContents,
  resolveProgramCourses,
  applyResolutionsToSource,
} = require('./lib/coursera-catalog-backfill.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const CATALOG_FILE = path.join(REPO_ROOT, 'lib', 'content', 'courseraDiscoveredCatalog.ts');

const DEFAULT_OAUTH_URL = 'https://api.coursera.com/oauth2/client_credentials/token';
const DEFAULT_API_BASE = 'https://api.coursera.com/ent';
const DEFAULT_ORG_ID = '8R2W4McwOMWJp9cCBV1kvw';
const PAGE_LIMIT = 1000;
const SAFETY_CAP_PAGES = 200; // 200 * 1000 = 200k contents — well above the org catalog size.

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const STDOUT = args.has('--stdout');

function log(...parts) {
  console.log(...parts);
}

function err(...parts) {
  console.error(...parts);
}

async function main() {
  const clientId = (process.env.COURSERA_B4B_CLIENT_ID || '').trim();
  const clientSecret = (process.env.COURSERA_B4B_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    err(
      '[backfill-coursera-courseids] COURSERA_B4B_CLIENT_ID and COURSERA_B4B_CLIENT_SECRET must be set.',
    );
    err('Run with the same creds you use for `npm run coursera:test`.');
    process.exit(2);
  }

  const orgId = (process.env.COURSERA_ORG_ID || DEFAULT_ORG_ID).trim();
  const oauthUrl = (process.env.COURSERA_OAUTH_TOKEN_URL || DEFAULT_OAUTH_URL).trim();
  const apiBase = (process.env.COURSERA_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/$/, '');

  log(`[backfill] org=${orgId}`);
  log(`[backfill] api base=${apiBase}`);

  let token;
  try {
    token = await fetchAccessToken({ oauthUrl, clientId, clientSecret });
  } catch (e) {
    err(`[backfill] OAuth failed: ${describeError(e)}`);
    err('  - If this is a sandboxed environment with no egress, that is expected.');
    err('  - Run this script locally with the env vars set.');
    process.exit(3);
  }

  log('[backfill] OAuth ok');

  let contents;
  try {
    contents = await fetchAllContents({ apiBase, orgId, token });
  } catch (e) {
    err(`[backfill] listContents failed: ${describeError(e)}`);
    process.exit(3);
  }

  log(`[backfill] fetched ${contents.length} contents from B4B`);

  // Read the catalog file so we can pick out which programs need backfill
  // and so we can rewrite the source.
  const sourceBefore = fs.readFileSync(CATALOG_FILE, 'utf8');

  // Walk the source for `TODO_courseId_<N>` placeholders, gather the LPs
  // that contain at least one. Rather than parse the TypeScript AST, we
  // read the structured copy out of the file by `require`-ing a stripped
  // JSON projection. Simpler: re-parse the raw file with a tiny scanner.
  const programs = scanProgramsFromSource(sourceBefore);
  const placeholderPrograms = programs.filter((p) =>
    p.courses.some((c) => typeof c.courseId === 'string' && c.courseId.startsWith('TODO_courseId_')),
  );

  log(
    `[backfill] ${placeholderPrograms.length} program(s) contain placeholder course IDs out of ${programs.length} total`,
  );

  const index = indexB4BContents(contents);
  const resolutions = [];
  let resolvedCount = 0;
  let placeholderTotal = 0;
  const fullyResolvedPrograms = [];
  const partiallyResolvedPrograms = [];

  for (const program of placeholderPrograms) {
    const matched = resolveProgramCourses(program, index);
    let programResolved = 0;
    let programPlaceholders = 0;
    for (const result of matched) {
      const isPlaceholder =
        typeof result.currentCourseId === 'string' &&
        result.currentCourseId.startsWith('TODO_courseId_');
      if (!isPlaceholder) continue;
      programPlaceholders += 1;
      placeholderTotal += 1;
      if (result.resolved) {
        programResolved += 1;
        resolvedCount += 1;
        resolutions.push({
          programSlug: program.slug,
          courseSlug: result.slug,
          courseName: result.name,
          contentId: result.resolved.contentId,
          strategy: result.resolved.strategy,
        });
      } else {
        log(
          `  [unmatched] ${program.slug} :: ${result.slug} — "${result.name}"`,
        );
      }
    }
    if (programResolved === programPlaceholders) {
      fullyResolvedPrograms.push(program.slug);
    } else if (programResolved > 0) {
      partiallyResolvedPrograms.push({
        slug: program.slug,
        resolved: programResolved,
        total: programPlaceholders,
      });
    }
  }

  log('');
  log(`[backfill] resolved ${resolvedCount}/${placeholderTotal} placeholders`);
  log(`[backfill] fully resolved: ${fullyResolvedPrograms.length} program(s)`);
  for (const slug of fullyResolvedPrograms) log(`           - ${slug}`);
  if (partiallyResolvedPrograms.length > 0) {
    log(`[backfill] partially resolved: ${partiallyResolvedPrograms.length} program(s)`);
    for (const p of partiallyResolvedPrograms) {
      log(`           - ${p.slug} (${p.resolved}/${p.total})`);
    }
  }

  const { source: sourceAfter, replaced, skipped } = applyResolutionsToSource(
    sourceBefore,
    resolutions,
  );
  log(`[backfill] source rewrites applied: ${replaced}, skipped: ${skipped.length}`);
  for (const s of skipped) {
    log(`  [skipped] ${s.programSlug || '?'} :: ${s.courseSlug || '?'} — ${s.reason}`);
  }

  if (STDOUT) {
    process.stdout.write(sourceAfter);
    return;
  }

  if (!WRITE) {
    log('');
    log('[backfill] DRY RUN — pass --write to rewrite the catalog file in place.');
    log(`           target: ${path.relative(REPO_ROOT, CATALOG_FILE)}`);
    return;
  }

  fs.writeFileSync(CATALOG_FILE, sourceAfter, 'utf8');
  log(`[backfill] wrote ${path.relative(REPO_ROOT, CATALOG_FILE)}`);
}

/* -------------------------------------------------------------------- */
/*  HTTP                                                                 */
/* -------------------------------------------------------------------- */

function fetchAccessToken({ oauthUrl, clientId, clientSecret }) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return new Promise((resolve, reject) => {
    const url = new URL(oauthUrl);
    const req = https.request(
      {
        method: 'POST',
        host: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength('grant_type=client_credentials'),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const j = JSON.parse(body);
              if (typeof j.access_token === 'string' && j.access_token) {
                resolve(j.access_token);
                return;
              }
              reject(new Error(`OAuth response missing access_token: ${body.slice(0, 200)}`));
            } catch (e) {
              reject(new Error(`OAuth body not JSON: ${body.slice(0, 200)}`));
            }
          } else {
            reject(new Error(`OAuth ${res.statusCode}: ${body.slice(0, 240)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

function fetchJson({ apiBase, orgId, path: subpath, token }) {
  const url = new URL(
    `${apiBase}/api/businesses.v1/${encodeURIComponent(orgId)}${subpath}`,
  );
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'GET',
        host: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error(`Non-JSON response from ${subpath}: ${body.slice(0, 200)}`));
            }
          } else {
            reject(new Error(`B4B ${res.statusCode} at ${subpath}: ${body.slice(0, 240)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function fetchAllContents({ apiBase, orgId, token }) {
  const all = [];
  let start = 0;
  for (let page = 0; page < SAFETY_CAP_PAGES; page += 1) {
    const params = new URLSearchParams();
    params.set('start', String(start));
    params.set('limit', String(PAGE_LIMIT));
    const data = await fetchJson({
      apiBase,
      orgId,
      path: `/contents?${params.toString()}`,
      token,
    });
    const elements = Array.isArray(data?.elements) ? data.elements : [];
    if (elements.length === 0) break;
    all.push(...elements);
    const total = data?.paging?.total;
    if (typeof total === 'number' && total > 0 && start + elements.length >= total) break;
    if (elements.length < PAGE_LIMIT) break;
    start += elements.length;
  }
  return all;
}

/* -------------------------------------------------------------------- */
/*  Source scanning                                                      */
/* -------------------------------------------------------------------- */

/**
 * Walk the catalog file as text and surface a structured view per
 * program: `{ slug, courses: [{ courseId, slug, name }] }`. We don't want
 * to import the TS module (that would require ts-node + the rest of the
 * Next.js graph) and we don't need full AST fidelity — only the lines
 * that match the well-known shape used in the file.
 */
function scanProgramsFromSource(source) {
  const programs = [];
  const programRe = /"([a-z0-9-]+)":\s*\{\s*$/gm;
  let match;
  // Simpler approach: split into program blocks by their opening `"slug": {`
  // and the matching closing `},` at the same indentation. The catalog file
  // uses a consistent 2-space indent.

  const lines = source.split(/\r?\n/);
  let currentProgram = null;
  for (const line of lines) {
    const open = /^\s{2}"([a-z0-9-]+)":\s*\{\s*$/.exec(line);
    if (open) {
      currentProgram = { slug: open[1], courses: [] };
      programs.push(currentProgram);
      continue;
    }
    if (!currentProgram) continue;
    const close = /^\s{2}\},?\s*$/.test(line);
    if (close) {
      currentProgram = null;
      continue;
    }
    const courseLine =
      /\{\s*courseId:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/.exec(line);
    if (courseLine) {
      currentProgram.courses.push({
        courseId: courseLine[1],
        slug: courseLine[2],
        name: courseLine[3],
      });
    }
  }
  return programs;
}

function describeError(e) {
  if (!e) return 'unknown error';
  if (e instanceof Error) return e.message;
  return String(e);
}

module.exports = { scanProgramsFromSource };

if (require.main === module) {
  main().catch((e) => {
    err(`[backfill] fatal: ${describeError(e)}`);
    process.exit(1);
  });
}
