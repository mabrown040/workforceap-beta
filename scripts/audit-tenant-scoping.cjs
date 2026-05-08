#!/usr/bin/env node
/**
 * Track A — Tenant Isolation Hardening (Sprint A.1)
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Static-analysis pass that inventories every Prisma read/write against
 * tenant-scoped models and reports whether the call site appears to be
 * scoped via `withTenantScope` or one of the explicit allowlist helpers.
 *
 * This is a **reporting** script today. After Sprint A.2 (migration) it
 * graduates to a CI gate that fails on new violations.
 *
 * Usage:
 *   node scripts/audit-tenant-scoping.cjs                # full report to stdout
 *   node scripts/audit-tenant-scoping.cjs --json         # machine-readable
 *   node scripts/audit-tenant-scoping.cjs --summary      # counts only
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

// Mirrors lib/tenant/withTenantScope.ts TENANT_SCOPED_MODELS.
// Keep in sync.
const TENANT_SCOPED_MODELS = [
  'user',
  'partner',
  'employer',
  'job',
  'course',
  'courseEnrollment',
  'organizationProgramCatalog',
  'preScreeningResponse',
];

const READ_OPS = ['findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'];
const WRITE_OPS = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];
const ALL_OPS = [...READ_OPS, ...WRITE_OPS];

const SCAN_DIRS = ['app', 'lib', 'components'];

const SKIP_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.test.ts',
  '.test.tsx',
  // The helper itself + the audit script's own consumers
  'lib/tenant/withTenantScope.ts',
  // Cross-tenant utilities that are intentionally org-aware (not org-scoped).
  // Each entry here should be doc'd in docs/TENANT-ISOLATION.md "Allowlist".
  'lib/tenant/organization.ts',
  'lib/admin/boardOutcomes.ts', // platform aggregate; will scope in Sprint A.2
];

// Markers in surrounding context that indicate the call is properly scoped.
// If any of these appear within a small window above a Prisma call site, we
// treat the call as scoped.
const SCOPE_MARKERS = [
  'withTenantScope',
  'crossTenantOK(',
  'getDefaultOrganizationId', // single-tenant write path; allowed during phased rollout
];

function shouldSkipPath(filePath) {
  return SKIP_PATHS.some((p) => filePath.includes(p));
}

function listSourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (shouldSkipPath(full)) continue;
    if (entry.isDirectory()) {
      listSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function buildPattern() {
  const models = TENANT_SCOPED_MODELS.join('|');
  const ops = ALL_OPS.join('|');
  // Matches `prisma.<model>.<op>` or `tx.<model>.<op>`.
  return new RegExp(`(prisma|tx|db)\\.(${models})\\.(${ops})\\b`, 'g');
}

function scanFile(filePath) {
  const rel = path.relative(REPO_ROOT, filePath);
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const pattern = buildPattern();
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(line)) !== null) {
      const lookbackStart = Math.max(0, i - 12);
      const ctx = lines.slice(lookbackStart, i + 1).join('\n');
      const scoped = SCOPE_MARKERS.some((marker) => ctx.includes(marker));
      violations.push({
        file: rel,
        line: i + 1,
        column: match.index + 1,
        symbol: `${match[1]}.${match[2]}.${match[3]}`,
        scoped,
        snippet: line.trim(),
      });
    }
  }

  return violations;
}

function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes('--json');
  const wantSummary = args.includes('--summary');

  const files = SCAN_DIRS.flatMap((d) => listSourceFiles(path.join(REPO_ROOT, d)));
  const allViolations = files.flatMap(scanFile);

  const unscoped = allViolations.filter((v) => !v.scoped);
  const scoped = allViolations.filter((v) => v.scoped);

  if (wantJson) {
    process.stdout.write(JSON.stringify({ total: allViolations.length, unscoped, scoped }, null, 2));
    process.stdout.write('\n');
    return;
  }

  if (wantSummary) {
    console.log(`tenant-scoping audit:`);
    console.log(`  files scanned:      ${files.length}`);
    console.log(`  total call sites:   ${allViolations.length}`);
    console.log(`  scoped:             ${scoped.length}`);
    console.log(`  UNSCOPED:           ${unscoped.length}`);
    return;
  }

  console.log('=== tenant-scoping audit ===');
  console.log(`scanned ${files.length} files in ${SCAN_DIRS.join(', ')}`);
  console.log(`found ${allViolations.length} Prisma calls against tenant-scoped models`);
  console.log(`  ${scoped.length} appear scoped (withTenantScope, crossTenantOK, or getDefaultOrganizationId)`);
  console.log(`  ${unscoped.length} appear UNSCOPED — review and migrate`);
  console.log('');

  // Group unscoped by file
  const byFile = new Map();
  for (const v of unscoped) {
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file).push(v);
  }

  if (unscoped.length === 0) {
    console.log('✅ No unscoped tenant-model Prisma calls detected.');
    return;
  }

  console.log('UNSCOPED CALL SITES (file → line:col symbol):');
  for (const [file, vs] of [...byFile.entries()].sort()) {
    console.log(`\n  ${file}`);
    for (const v of vs) {
      console.log(`    L${v.line}:${v.column}  ${v.symbol}`);
      console.log(`      ${v.snippet.slice(0, 120)}${v.snippet.length > 120 ? '…' : ''}`);
    }
  }

  console.log('');
  console.log('Migration target: see docs/TENANT-ISOLATION.md "Migration approach" (Sprint A.2).');
  console.log('Each call site needs to be wrapped in withTenantScope(orgId, async (db) => { ... }).');
}

main();
