import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, unlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectSource, resolveReference, routeFor, inspectPrisma, sourceLink, buildIndex, inspectTestRunners, declaredTestOwnership } from './knowledge-index.mjs';
import { parseQueryArgs, queryIndex } from './knowledge-query.mjs';

const script = fileURLToPath(new URL('./knowledge-index.mjs', import.meta.url));
const queryScript = fileURLToPath(new URL('./knowledge-query.mjs', import.meta.url));
function fixture(t, entries) {
  const root = mkdtempSync(path.join(tmpdir(), 'workforce-kb-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), text); };
  for (const [file, text] of Object.entries(entries)) write(file, text);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  return { root, write, add: () => execFileSync('git', ['add', '.'], { cwd: root }),
    cli: (...args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', timeout: 10000 }) };
}

test('indexes imports, route exports and env names without copying secret values or comments', () => {
  const result = inspectSource('route.ts', `
    // import fake from './not-code'; process.env.FAKE
    import { guard } from '@/lib/auth';
    export { GET } from './handler';
    export const POST = guard(async () => import('./worker'));
    export const maxDuration = 300;
    const hidden = process.env['SERVER_KEY'] || 'never-copy-this-value';
    const { AUDIT_KEY: localKey } = process.env;
  `);
  assert.deepEqual(result.imports.map((entry) => entry.specifier), ['@/lib/auth', './handler', './worker']);
  assert.deepEqual(result.environment.map((entry) => entry.name), ['SERVER_KEY', 'AUDIT_KEY']);
  assert.deepEqual(result.exports.map((entry) => entry.name), ['GET', 'POST', 'maxDuration']);
  assert.equal(result.configuration.maxDuration, 300);
  assert.equal(JSON.stringify(result).includes('never-copy-this-value'), false);
  assert.equal(JSON.stringify(result).includes('FAKE'), false);
  assert.equal(inspectSource('x.ts', 'const x = 1; "use client";').directive, null);
  assert.equal(inspectSource('x.ts', '"use strict"; "use client"; const x = 1;').directive, 'use client');
});

test('route groups and parallel slots do not become URL segments; root and dynamic routes survive', () => {
  assert.equal(routeFor('app/(portal)/@modal/dashboard/[id]/page.tsx').path, '/dashboard/[id]');
  assert.equal(routeFor('app/layout.tsx').kind, 'layout');
  assert.equal(routeFor('app/page.tsx').path, '/');
  assert.equal(routeFor('app/api/items/[...parts]/route.ts').path, '/api/items/[...parts]');
  assert.equal(routeFor('app/api/items/route.test.ts'), null);
  assert.equal(routeFor('app/(portal)/@modal/(.)jobs/[id]/page.tsx').routing, 'intercepting-see-source');
});

test('local alias, directory and emitted-js references resolve only to tracked inputs', () => {
  const files = new Set(['lib/a.ts', 'lib/auth/index.ts', 'components/Button.tsx']);
  assert.equal(resolveReference('app/route.ts', '@/lib/auth', files).target, 'lib/auth/index.ts');
  assert.equal(resolveReference('lib/test.ts', './a.js', files).target, 'lib/a.ts');
  assert.equal(resolveReference('app/route.ts', '@/missing', files).target, null);
  assert.equal(resolveReference('app/route.ts', '@supabase/ssr', files).package, '@supabase/ssr');
});

test('Prisma parser retains model fields, relation shape, enum values and source lines', () => {
  const result = inspectPrisma('prisma/schema.prisma', 'model Team {\n  id String @id\n  members User[]\n  @@map("teams")\n}\nenum State {\n  ACTIVE\n  PAUSED @map("paused")\n}\n');
  assert.equal(result[0].fields[1].type, 'User[]');
  assert.equal(result[0].fields[0].line, 2);
  assert.equal(result[0].table, 'teams');
  assert.deepEqual(result[1].values.map((entry) => entry.name), ['ACTIVE', 'PAUSED']);
  assert.equal(result[1].values[1].mappedValue, 'paused');
});

test('indexes default, namespace, import-equals and CommonJS symbols without value payloads', () => {
  const result = inspectSource('module.cts', `
    import helper = require('./helper.cjs');
    export * as tools from './tools';
    export default function namedDefault() {}
    module.exports = { helper, answer: 'synthetic-private-value' };
    exports.extra = () => {};
    module.exports.last = 1;
  `);
  assert.deepEqual(result.exports.map(({ name }) => name), ['tools', 'default', 'helper', 'answer', 'extra', 'last']);
  assert.equal(result.exports[1].localName, 'namedDefault');
  assert.equal(result.imports[0].kind, 'import-equals');
  assert.equal(inspectSource('page.tsx', 'export default async function () {}').exports[0].name, 'default');
  assert.equal(JSON.stringify(result).includes('synthetic-private-value'), false);
});

test('AST env extraction accepts syntax variants, omits rest/computed names and remote credentials', () => {
  const result = inspectSource('source.ts', `
    const first = (process ['env']).KEY_A;
    const second = import.meta . env['KEY_B'];
    const { KEY_C: renamed, ...rest } = (process.env);
    const computed = process.env[pickKey()];
    const unrelated = object.env.KEY_D;
    import remote from 'https://synthetic-user:synthetic-password@example.invalid/private?token=never-copy';
    export const runtime = 'synthetic-not-a-runtime-secret';
    export const revalidate = false;
  `);
  assert.deepEqual(result.environment.map(({ name }) => name), ['KEY_A', 'KEY_B', 'KEY_C']);
  const serialized = JSON.stringify(result);
  for (const marker of ['synthetic-password', 'never-copy', 'synthetic-not-a-runtime-secret']) assert(!serialized.includes(marker));
  assert.equal(result.configuration.revalidate, false);
  assert.equal(result.imports[0].locatorRedacted, true);
});

test('emitted module extensions resolve to matching TS module kinds', () => {
  const files = new Set(['lib/a.mts', 'lib/b.cts', 'lib/c.tsx', 'lib/d/index.mts']);
  assert.equal(resolveReference('lib/test.ts', './a.mjs', files).target, 'lib/a.mts');
  assert.equal(resolveReference('lib/test.ts', './b.cjs', files).target, 'lib/b.cts');
  assert.equal(resolveReference('lib/test.ts', './c.jsx', files).target, 'lib/c.tsx');
  assert.equal(resolveReference('lib/test.ts', './d', files).target, 'lib/d/index.mts');
});

test('intercepted URL patterns and framework pages are not mistaken for literal endpoints', () => {
  assert.equal(routeFor('app/feed/@modal/(..)photos/[id]/page.tsx').path, '/photos/[id]');
  assert.equal(routeFor('app/(portal)/feed/@modal/(...)photos/[id]/page.tsx').path, '/photos/[id]');
  assert.equal(routeFor('src/app/page.tsx').path, '/');
  assert.equal(routeFor('pages/_app.tsx').path, null);
  assert.equal(routeFor('marketing/src/pages/index.astro').path, '/');
  assert.equal(routeFor('marketing/src/pages/[lang]/index.astro').path, '/[lang]');
  assert.equal(routeFor('marketing/src/pages/programs/[slug].astro').kind, 'astro-page');
  assert.equal(routeFor('marketing/src/_archive/outcomes.astro'), null);
});

test('Prisma extraction ignores block comments and quoted braces; preserves enum lines', () => {
  const source = '/*\nmodel Fake {\n id String\n}\n*/\n  model Team {\n id String @id\n label String @default("}")\n}\nenum State {\n ACTIVE @map("active") // note\n}\n';
  const blocks = inspectPrisma('schema.prisma', source);
  assert.deepEqual(blocks.map(({ name }) => name), ['Team', 'State']);
  assert.equal(blocks[0].fields[1].name, 'label');
  assert.equal(blocks[0].fields[1].line, 8);
  assert.equal(blocks[1].values[0].line, 11);
});

test('tracked coverage is deterministic; private values, symlinks and untracked inputs are not read', (t) => {
  const f = fixture(t, {
    'docs/knowledge-base/README.md': '# Human guide\n',
    'vercel.json': '{"crons":[]}',
    'app/(portal)/[member id]/page.tsx': 'export default function Page() {}\n',
    'lib/module.ts': 'export const value = process.env.SYNTHETIC_ENV_KEY;\n',
    'marketing/page.astro': '---\nconst key = import.meta.env.ASTRO_UNINDEXED;\n---',
    'marketing/src/pages/[lang]/index.astro': '---\nconst key = import.meta.env.ASTRO_UNINDEXED;\n---',
    '.env.local': 'SYNTHETIC_PRIVATE=never-copy-private-value',
    '.env.example': 'EXAMPLE_NAME=never-copy-example-value',
    'old.ts': 'export const gone = true;',
    'package.json': '{"name":"fixture","dependencies":{"pkg":"git+https://user:never-copy-package-password@example.invalid/a"}}',
  });
  const outside = path.join(f.root, 'untracked-secret.ts');
  f.write('untracked-secret.ts', 'export const NEVER_READ_LINK_TARGET = 1;');
  symlinkSync(outside, path.join(f.root, 'linked.ts'));
  execFileSync('git', ['add', 'linked.ts'], { cwd: f.root });
  execFileSync('git', ['update-index', '--add', '--cacheinfo', '160000,1111111111111111111111111111111111111111,submodule'], { cwd: f.root });
  unlinkSync(path.join(f.root, 'old.ts'));
  // An untracked deploy declaration must not enter the tracked-only index.
  f.write('docs/knowledge-base/audit-baseline.json', '{"untracked":"never-copy-untracked-baseline"}');
  const first = buildIndex(f.root), second = buildIndex(f.root);
  assert.deepEqual([...first.output], [...second.output]);
  const inventory = JSON.parse(first.output.get('inventory.json'));
  const actual = inventory.files.map(({ path: name }) => name).sort();
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: f.root }).toString().split('\0').filter(Boolean).sort();
  assert.deepEqual(actual, tracked);
  const byPath = new Map(inventory.files.map((record) => [record.path, record]));
  assert.equal(byPath.get('linked.ts').status, 'symlink-not-followed');
  assert.equal(byPath.get('.env.local').status, 'private-content-not-read');
  assert.equal(byPath.get('old.ts').status, 'missing');
  assert.equal(byPath.get('submodule').status, 'submodule-not-traversed');
  assert.equal(byPath.get('marketing/page.astro').area, 'astro-marketing');
  const routes = JSON.parse(first.output.get('routes.json'));
  assert.equal(routes.find((entry) => entry.kind === 'astro-page').path, '/[lang]');
  assert.equal(first.summary.counts.astroPageFiles, 1);
  assert.equal(first.summary.counts.pageFiles, 1);
  const combined = [...first.output.values()].join('\n');
  for (const marker of ['never-copy-private-value', 'never-copy-example-value', 'never-copy-package-password', 'NEVER_READ_LINK_TARGET', 'never-copy-untracked-baseline', 'ASTRO_UNINDEXED']) assert(!combined.includes(marker), marker);
  assert(first.output.get('pages.md').includes('app/%28portal%29/%5Bmember%20id%5D/page.tsx'));
  assert(first.output.get('pages.md').includes('\\[member id\\]'));
});

test('source links encode parentheses, brackets, spaces, hashes and preserve line anchors', () => {
  const file = "app/(portal)/[id]/my page's #file.tsx";
  const link = sourceLink(file, 12);
  assert(!/[\s()\[\]']/.test(link));
  assert.equal(decodeURIComponent(link.split('#')[0].slice(9)), file);
  assert.equal(link.split('#')[1], 'L12');
});

test('generation --check excludes its own tracked output and rejects unexpected files before writes', (t) => {
  const f = fixture(t, { 'lib/a.ts': 'export const A = 1;\n', 'docs/knowledge-base/README.md': '# Guide\n', 'vercel.json': '{"crons":[]}' });
  assert.equal(f.cli().status, 0);
  f.add();
  const before = readFileSync(path.join(f.root, 'docs/knowledge-base/generated/inventory.json'), 'utf8');
  assert.equal(f.cli('--check').status, 0);
  const inventory = JSON.parse(before);
  assert(inventory.files.every((record) => !record.path.startsWith('docs/knowledge-base/generated/')));
  const modified = statSync(path.join(f.root, 'docs/knowledge-base/generated/inventory.json')).mtimeMs;
  f.write('lib/a.ts', 'export const A = 2;\n');
  assert.equal(f.cli('--check').status, 1);
  assert.equal(statSync(path.join(f.root, 'docs/knowledge-base/generated/inventory.json')).mtimeMs, modified);
  f.write('docs/knowledge-base/generated/unexpected.txt', 'preserve me');
  const rejected = f.cli();
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Unexpected generated files/);
  assert.equal(readFileSync(path.join(f.root, 'docs/knowledge-base/generated/inventory.json'), 'utf8'), before);
});

test('tracked ancestor symlinks and output target symlinks are not followed', (t) => {
  const f = fixture(t, { 'lib/a.ts': 'export const A = 1;', 'vercel.json': '{}' });
  rmSync(path.join(f.root, 'lib'), { recursive: true });
  f.write('outside/a.ts', 'export const NEVER_READ_PARENT_LINK = 1;');
  symlinkSync(path.join(f.root, 'outside'), path.join(f.root, 'lib'));
  const indexed = buildIndex(f.root);
  assert.equal(JSON.parse(indexed.output.get('inventory.json')).files.find((entry) => entry.path === 'lib/a.ts').status, 'ancestor-symlink-not-followed');
  assert(![...indexed.output.values()].join('').includes('NEVER_READ_PARENT_LINK'));
  f.write('docs/knowledge-base/generated/README.md', 'placeholder');
  unlinkSync(path.join(f.root, 'docs/knowledge-base/generated/README.md'));
  symlinkSync(path.join(f.root, 'outside/a.ts'), path.join(f.root, 'docs/knowledge-base/generated/README.md'));
  assert.equal(f.cli().status, 1);
  assert.equal(readFileSync(path.join(f.root, 'outside/a.ts'), 'utf8'), 'export const NEVER_READ_PARENT_LINK = 1;');
});

test('declared runner ownership separates selected, delegated, skipped, blocked and helper files', () => {
  const runners = inspectTestRunners(new Map([
    ['scripts/vitest-library-specs.mjs', "export const VITEST_LIBRARY_SPECS = Object.freeze(['lib/shared.test.ts']);"],
    ['scripts/test-unit.mjs', `
      const SKIP_REASONS = { vitest: 'Vitest owns this suite', realDb: 'Needs a live DB' };
      for await (const entry of glob('lib/**/*.test.ts')) {}
      function classify(normalized) {
        const importsVitest = /from\\s+['"]vitest['"]/.test(src);
        if (/lib\\/database\\.test\\.ts/.test(normalized)) return { skip: 'realDb' };
      }`],
    ['vitest.config.ts', `export default defineConfig({ test: { include: ['tests/**/*.spec.ts', ...VITEST_LIBRARY_SPECS], exclude: ['tests/e2e/**'], setupFiles: ['./tests/setup.ts'] } });`],
    ['playwright.config.ts', `loadPrivateEnvAndDoNotRun(); export default defineConfig({ testDir: './tests/e2e' });`],
    ['package.json', '{"scripts":{"kb:test":"node --test scripts/knowledge-index.test.mjs"}}'],
  ]));
  const classify = (file, source = '') => declaredTestOwnership(file, source, runners);
  assert.equal(classify('lib/plain.test.ts').declaredRunners[0].status, 'selected');
  assert.deepEqual(classify('lib/shared.test.ts', "import { test } from 'vitest';").declaredRunners.map(({ status }) => status), ['delegated', 'selected']);
  assert.equal(classify('lib/unknown.test.ts', "import { test } from 'vitest';").declaredRunners[0].status, 'blocked-unregistered');
  assert.equal(classify('lib/database.test.ts').declaredRunners[0].reason, 'Needs a live DB');
  assert.deepEqual(classify('tests/e2e/phone.spec.ts').declaredRunners.map(({ status }) => status), ['excluded', 'selected']);
  assert.equal(classify('tests/e2e/auth-helpers.ts').kind, 'test-helper');
  assert.equal(classify('tests/setup.ts').declaredRunners[0].status, 'setup-helper');
  assert.equal(classify('app/api/example/route.test.ts').collectionStatus, 'not-selected-by-indexed-runners');
  assert.equal(classify('scripts/knowledge-index.test.mjs').declaredRunners[0].runner, 'npm:kb:test');
});

test('computed Playwright selectors are not mislabeled as default runner coverage', () => {
  const computed = inspectTestRunners(new Map([['playwright.config.ts', 'export default defineConfig({ testDir: pickDirectory(), testMatch: choosePattern() });']]));
  assert.equal(computed.playwright.testDir, null);
  assert.equal(computed.playwright.defaultTestMatch, false);
  assert.equal(declaredTestOwnership('tests/example.spec.ts', '', computed).collectionStatus, 'not-selected-by-indexed-runners');
  const regex = inspectTestRunners(new Map([['playwright.config.ts', 'export default defineConfig({ testDir: "tests", testMatch: /special\\.spec\\.ts$/ });']]));
  assert.equal(declaredTestOwnership('tests/special.spec.ts', '', regex).declaredRunners[0].status, 'selected');
  assert.equal(declaredTestOwnership('tests/other.spec.ts', '', regex).declaredRunners.length, 0);
});

test('query argument validation is explicit and order-independent', () => {
  assert.deepEqual(parseQueryArgs(['--limit', '4', 'Tenant']), { query: 'tenant', references: null, limit: 4 });
  assert.deepEqual(parseQueryArgs(['--references', './lib/tenant.ts']), { query: null, references: 'lib/tenant.ts', limit: 25 });
  for (const args of [[], [''], ['one', 'two'], ['one', '--limit'], ['one', '--limit', '0'], ['one', '--unknown'], ['one', '--limit', '3', '--limit', '4'], ['one', '--references', 'file'], ['--references', '../file']]) assert.throws(() => parseQueryArgs(args));
});

test('query references retain importer source lines and lookup includes local symbols/schema fields', () => {
  const catalog = {
    inventory: { inputTreeSha256: 'fixture', files: [{ path: 'lib/a.ts', domain: 'libraries', exports: [], declarations: [{ name: 'privateHelper', line: 6 }] }, { path: 'lib/b.ts', domain: 'libraries' }] },
    imports: [{ from: 'lib/a.ts', target: 'lib/b.ts', line: 2, specifier: './b', external: false },
      { from: 'lib/b.ts', target: null, specifier: 'resend', package: 'resend', external: true, line: 4 }],
    models: { models: [{ kind: 'model', name: 'User', file: 'schema.prisma', line: 1, fields: [{ name: 'tenantId', line: 3 }] }] },
    environment: { variables: [] }, routes: [], documents: [], tests: [],
  };
  const load = (name) => catalog[name];
  assert.deepEqual(queryIndex(load, parseQueryArgs(['--references', 'lib/a.ts'])).results[0],
    { kind: 'imports', file: 'lib/a.ts', line: 2, target: 'lib/b.ts', resolution: 'local' });
  assert.equal(queryIndex(load, parseQueryArgs(['privateHelper'])).results[0].kind, 'declaration');
  assert.equal(queryIndex(load, parseQueryArgs(['tenantId'])).results[0].symbol, 'User.tenantId');
  assert.deepEqual(queryIndex(load, parseQueryArgs(['resend'])).results[0], { kind: 'import-reference', file: 'lib/b.ts', line: 4, symbol: 'resend' });
  assert.throws(() => queryIndex(load, parseQueryArgs(['--references', 'lib/missing.ts'])), /not present/);
});

test('missing generated query catalogs produce actionable errors without stack traces', (t) => {
  const f = fixture(t, { 'README.md': '# Fixture' });
  const result = spawnSync(process.execPath, [queryScript, 'tenant'], { cwd: f.root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /run node scripts\/knowledge-index.mjs/);
  assert(!result.stderr.includes('at main'));
});
