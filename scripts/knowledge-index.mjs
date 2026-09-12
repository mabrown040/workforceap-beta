#!/usr/bin/env node
/** Deterministic, source-only navigation index. Never loads application modules or env values. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, lstatSync, readlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const OUTPUT = 'docs/knowledge-base/generated';
const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?)$/;
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const CONFIG_EXPORTS = new Set(['runtime', 'dynamic', 'maxDuration', 'revalidate', 'fetchCache']);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const sorted = (values) => [...new Set(values)].sort();
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const quote = (value) => String(value ?? '').replace(/([\\[\]`|])/g, '\\$1').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\r\n]/g, ' ');
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Navigation must not reproduce credentials embedded in a remote import/package URL.
function safeLocator(value) {
  if (typeof value !== 'string') return null;
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value) || /^(?:git\+|git@|data:)/i.test(value)) {
    return '<remote locator omitted>';
  }
  return value.split(/[?#]/)[0];
}

function unwrap(node) {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression;
  return node;
}

function property(node) {
  node = unwrap(node);
  if (ts.isPropertyAccessExpression(node)) return { object: unwrap(node.expression), name: node.name.text };
  if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)) {
    return { object: unwrap(node.expression), name: node.argumentExpression.text };
  }
  return null;
}

function isEnvObject(node) {
  const p = node && property(node);
  return p?.name === 'env' && ((ts.isIdentifier(p.object) && p.object.text === 'process') ||
    (ts.isMetaProperty(p.object) && p.object.keywordToken === ts.SyntaxKind.ImportKeyword && p.object.name.text === 'meta'));
}

export function areaFor(file) {
  if (file.startsWith('app/api/')) return 'api';
  if (file.startsWith('app/')) return 'pages';
  const top = file.split('/')[0];
  if (!file.includes('/')) return 'root';
  return ({ lib: 'libraries', components: 'components', prisma: 'database', supabase: 'database',
    scripts: 'operations', tests: 'tests', docs: 'documentation', graph: 'audit-graph',
    marketing: 'astro-marketing', public: 'assets', emails: 'communications', messages: 'localization',
    i18n: 'localization', content: 'content', css: 'styles', hooks: 'components', shared: 'libraries',
    '.github': 'delivery' })[top] || (top.startsWith('.') ? 'agent-tooling' : 'supporting-files');
}

export function domainFor(file) {
  const rules = [
    ['identity-tenancy', /(?:^|\/)(?:auth|tenant|supabase|gucContext|roles|middleware)(?:[/.]|$)/],
    ['learning-coursera', /coursera|\/xapi\/|\/courses?\/|\/training\/|\/learning\/|\/curriculum\/|\/consent\//i],
    ['ai-voice', /elevenlabs|\/ai\/|\/lilley\/|resume-coach|interview-prep/i],
    ['communications', /\/email|\/notify|notification|\/cron\/|\/messages\/|\/push\//i],
    ['applications-enrollment', /\/apply\/|\/enroll\/|\/onboarding\/|\/signup\/|\/referral/i],
    ['jobs-employers', /\/employer\/|\/jobs?\/|\/applications\/|\/placements?\/|\/interviews?\//i],
    ['partners-funding', /\/partners?\/|\/funder|\/funding\/|\/billing\/|\/stripe\/|\/donat|\/wioa/i],
    ['member-counselor', /\/member\/|\/counselor\/|\/dashboard\/|\/milestone|\/retention\/|\/resume\//i],
    ['administration', /\/admin\/|\/platform\/|\/analytics\/|\/reports?\//i],
    ['public-experience', /\/marketing\/|\/programs?\/|\/blog\/|\/content\/|\/i18n\/|\/nav\//i],
  ];
  return rules.find(([, pattern]) => pattern.test(file))?.[0] || areaFor(file);
}

function bindingNames(node) {
  if (ts.isIdentifier(node)) return [node.text];
  if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
    return node.elements.flatMap((element) => ts.isBindingElement(element) ? bindingNames(element.name) : []);
  }
  return [];
}

/** AST facts, not execution, authorization certification, or a complete call graph. */
export function inspectSource(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const imports = [], exports = [], environment = [], declarations = [];
  const configuration = {};
  const line = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const moduleRef = (node, literal, kind) => {
    if (literal && ts.isStringLiteralLike(literal)) imports.push({ specifier: safeLocator(literal.text), line: line(node), kind,
      ...(safeLocator(literal.text) !== literal.text ? { locatorRedacted: true } : {}) });
  };
  for (const node of source.statements) {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) || [] : [];
    const isExported = modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword);
    if (node.name && ts.isIdentifier(node.name) &&
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node))) {
      const entry = { name: node.name.text, line: line(node), kind: ts.SyntaxKind[node.kind] };
      declarations.push(entry);
      if (isExported) exports.push(isDefault ? { ...entry, name: 'default', localName: entry.name } : entry);
    }
    if (isDefault && !node.name && (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node))) {
      exports.push({ name: 'default', line: line(node), kind: ts.SyntaxKind[node.kind] });
    }
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        for (const name of bindingNames(declaration.name)) {
          declarations.push({ name, line: line(declaration), kind: 'Variable' });
          if (isExported) exports.push({ name, line: line(declaration), kind: 'Variable' });
          if (isExported && CONFIG_EXPORTS.has(name) && declaration.initializer &&
            (ts.isStringLiteralLike(declaration.initializer) || ts.isNumericLiteral(declaration.initializer))) {
            const value = ts.isNumericLiteral(declaration.initializer) ? Number(declaration.initializer.text) : declaration.initializer.text;
            if (typeof value === 'number' || /^(?:nodejs|edge|experimental-edge|auto|force-dynamic|error|force-static|default-cache|only-cache|force-cache|force-no-store|default-no-store|only-no-store)$/.test(value)) configuration[name] = value;
          }
          if (isExported && name === 'revalidate' && declaration.initializer?.kind === ts.SyntaxKind.FalseKeyword) configuration[name] = false;
        }
      }
    }
    if (ts.isExportAssignment(node)) exports.push({ name: 'default', line: line(node), kind: 'ExportAssignment' });
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) exports.push({ name: element.name.text, line: line(element), kind: 'ReExport' });
      } else if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
        exports.push({ name: node.exportClause.name.text, line: line(node), kind: 'NamespaceReExport' });
      } else if (node.moduleSpecifier) exports.push({ name: '*', line: line(node), kind: 'ReExport' });
    }
  }
  function visit(node) {
    if (ts.isImportDeclaration(node)) moduleRef(node, node.moduleSpecifier, node.importClause?.isTypeOnly ? 'type' : 'import');
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) moduleRef(node, node.moduleReference.expression, node.isTypeOnly ? 'type' : 'import-equals');
    if (ts.isExportDeclaration(node)) moduleRef(node, node.moduleSpecifier, 're-export');
    if (ts.isCallExpression(node) && node.arguments.length &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      moduleRef(node, node.arguments[0], node.expression.kind === ts.SyntaxKind.ImportKeyword ? 'dynamic-import' : 'require');
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) moduleRef(node, node.argument.literal, 'type');
    const access = (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && property(node);
    if (access && isEnvObject(access.object) && ENV_NAME.test(access.name)) environment.push({ name: access.name, line: line(node) });
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer &&
      isEnvObject(unwrap(node.initializer))) {
      for (const element of node.name.elements) {
        const key = element.propertyName || element.name;
        if (!element.dotDotDotToken && (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) && ENV_NAME.test(key.text)) environment.push({ name: key.text, line: line(element) });
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const target = property(node.left);
      const parent = target && property(target.object);
      const moduleExports = target?.name === 'exports' && ts.isIdentifier(target.object) && target.object.text === 'module';
      const namedExport = target && ((ts.isIdentifier(target.object) && target.object.text === 'exports') ||
        (parent?.name === 'exports' && ts.isIdentifier(parent.object) && parent.object.text === 'module'));
      if (moduleExports && ts.isObjectLiteralExpression(node.right)) {
        for (const item of node.right.properties) if (item.name && (ts.isIdentifier(item.name) || ts.isStringLiteralLike(item.name))) {
          exports.push({ name: item.name.text, line: line(item), kind: 'CommonJSExport' });
        }
      } else if (moduleExports || namedExport) exports.push({ name: moduleExports ? 'default' : target.name, line: line(node), kind: 'CommonJSExport' });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  let directive;
  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    if (['use client', 'use server'].includes(statement.expression.text)) { directive = statement; break; }
  }
  return { imports, exports, declarations, environment, configuration,
    directive: directive?.expression.text || null,
    parseDiagnostics: source.parseDiagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      line: source.getLineAndCharacterOfPosition(diagnostic.start || 0).line + 1,
    })) };
}

export function resolveReference(from, specifier, files) {
  if (specifier === '<remote locator omitted>') return { external: true, package: null, resolution: 'redacted-remote' };
  const clean = specifier.split('?')[0];
  let base;
  if (clean.startsWith('@/')) base = clean.slice(2);
  else if (clean.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), clean));
  else return { external: true, package: clean.startsWith('@') ? clean.split('/').slice(0, 2).join('/') : clean.split('/')[0] };
  const candidates = [base, ...['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.d.ts'].map((ext) => base + ext),
    ...['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.d.ts'].map((ext) => base + '/index' + ext)];
  if (base.endsWith('.mjs')) candidates.push(base.slice(0, -4) + '.mts');
  else if (base.endsWith('.cjs')) candidates.push(base.slice(0, -4) + '.cts');
  else if (/\.jsx?$/.test(base)) candidates.push(base.replace(/\.jsx?$/, '.ts'), base.replace(/\.jsx?$/, '.tsx'));
  return { external: false, target: candidates.find((candidate) => files.has(candidate)) || null };
}

export function routeFor(file) {
  const astro = /^marketing\/src\/pages\/(.*)\.(?:astro|md|mdx)$/.exec(file);
  if (astro) return { kind: 'astro-page', path: '/' + astro[1].replace(/(?:^|\/)index$/, ''), groups: [],
    routing: 'astro-filesystem-unexpanded', note: 'Active static-build source pattern. getStaticPaths expansion, locale expansion, middleware/static/Next precedence and current deployed serving are not proven.' };
  const app = /^(?:src\/)?app\/(?:(.*)\/)?(page|route|layout|loading|error|global-error|not-found|template|default)\.[jt]sx?$/.exec(file);
  if (app) {
    const kind = app[2] || path.posix.basename(file).split('.')[0];
    const segments = (app[1] || '').split('/').filter(Boolean);
    const structural = segments.filter((segment) => segment.startsWith('@') || /^\([^)]*\)$/.test(segment));
    const resolved = [];
    let intercepted = false;
    for (let segment of segments.filter((part) => !structural.includes(part))) {
      while (/^\((?:\.|\.\.|\.\.\.)\)/.test(segment)) {
        intercepted = true;
        const marker = /^\((?:\.|\.\.|\.\.\.)\)/.exec(segment)[0];
        if (marker === '(...)') resolved.length = 0;
        if (marker === '(..)') resolved.pop();
        segment = segment.slice(marker.length);
      }
      if (segment) resolved.push(segment);
    }
    return { kind, path: '/' + resolved.join('/'), groups: structural, routing: intercepted ? 'intercepting-see-source' : 'filesystem' };
  }
  const pages = /^(?:src\/)?pages\/(.*)\.[jt]sx?$/.exec(file);
  if (pages) return { kind: /^_(?:app|document|error)$/.test(pages[1]) ? 'pages-framework' : 'pages-router',
    path: /^_(?:app|document|error)$/.test(pages[1]) ? null : '/' + pages[1].replace(/(?:^|\/)index$/, ''), groups: [], routing: 'filesystem' };
  return null;
}

// Mask comments, preserving line/offset positions and quoted schema strings.
function withoutComments(text) {
  return text.replace(/"(?:\\.|[^"\\])*"|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g,
    (token) => token.startsWith('"') ? token : token.replace(/[^\r\n]/g, ' '));
}

export function inspectPrisma(file, text) {
  text = withoutComments(text);
  const blocks = [];
  // Prisma blocks do not nest. Quoted braces are hidden only for locating the end.
  const structural = text.replace(/"(?:\\.|[^"\\])*"/g, (value) => value.replace(/[{}]/g, ' '));
  const starts = /^[ \t]*(model|enum|view)[ \t]+(\w+)[ \t]*\{/gm;
  for (const start of structural.matchAll(starts)) {
    const bodyStart = start.index + start[0].length;
    const bodyEnd = structural.indexOf('}', bodyStart);
    if (bodyEnd < 0) continue;
    const match = [start[0], start[1], start[2], text.slice(bodyStart, bodyEnd)];
    match.index = start.index;
    const startLine = text.slice(0, match.index).split('\n').length;
    const fields = [];
    for (const [offset, raw] of match[3].split('\n').entries()) {
      const field = /^\s*(\w+)\s+([\w]+(?:\[\]|\?)?)(.*)$/.exec(raw);
      if (field && !raw.trim().startsWith('//')) fields.push({ name: field[1], type: field[2], line: startLine + offset,
        id: /@id\b/.test(field[3]), unique: /@unique\b/.test(field[3]),
        relation: /@relation\b/.test(field[3]),
        relationFields: /@relation\([^)]*\bfields:\s*\[([^\]]+)\]/.exec(field[3])?.[1].split(',').map((value) => value.trim()) || [] });
    }
    const values = match[1] === 'enum' ? match[3].split('\n').flatMap((raw, offset) => {
      const value = /^\s*(\w+)(?:\s+@map\("([^"]+)"\))?\s*(?:\/\/.*)?$/.exec(raw);
      return value ? [{ name: value[1], mappedValue: value[2] || null, line: startLine + offset }] : [];
    }) : [];
    blocks.push({ name: match[2], kind: match[1], file, line: startLine, fields, ...(match[1] === 'enum' ? { values } : {}),
      table: /@@map\("([^"]+)"\)/.exec(match[3])?.[1] || null });
  }
  return blocks;
}

export function sourceLink(file, line) {
  const encoded = file.split('/').map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g,
    (character) => '%' + character.charCodeAt(0).toString(16).toUpperCase())).join('/');
  return `../../../${encoded}${line ? '#L' + line : ''}`;
}

// Read declarations, never import configs: Playwright's config can load private env files.
function staticValue(node, constants = {}) {
  node = unwrap(node);
  if (!node) return undefined;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isRegularExpressionLiteral(node)) return { regex: regexLiteral(node) };
  if (ts.isIdentifier(node)) return constants[node.text];
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap((element) => {
    const value = staticValue(ts.isSpreadElement(element) ? element.expression : element, constants);
    return ts.isSpreadElement(element) ? (Array.isArray(value) ? value : []) : [value];
  }).filter((value) => value !== undefined);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.flatMap((item) => {
    if (!ts.isPropertyAssignment(item) || !(ts.isIdentifier(item.name) || ts.isStringLiteralLike(item.name))) return [];
    const value = staticValue(item.initializer, constants);
    return value === undefined ? [] : [[item.name.text, value]];
  }));
  if (ts.isCallExpression(node) && node.arguments.length &&
    ((ts.isIdentifier(node.expression) && node.expression.text === 'defineConfig') ||
      (property(node.expression)?.name === 'freeze' && property(node.expression)?.object?.text === 'Object'))) {
    return staticValue(node.arguments[0], constants);
  }
  return undefined;
}

function walk(node, fn) { if (!node) return; fn(node); ts.forEachChild(node, (child) => { walk(child, fn); }); }
function parseConfig(file, text = '', constants = {}) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  for (const statement of ast.statements) if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) {
      constants[declaration.name.text] = staticValue(declaration.initializer, constants);
    }
  }
  const exported = ast.statements.find((node) => ts.isExportAssignment(node));
  return { ast, constants, config: exported ? staticValue(exported.expression, constants) || {} : {} };
}

/** A deliberately bounded glob subset used by the declared repo runner configurations. */
export function matchesDeclaredGlob(file, pattern) {
  if (pattern?.regex) return regexMatches(pattern.regex, file);
  if (file === pattern?.replace(/^\.\//, '')) return true;
  if (typeof pattern !== 'string') return false;
  pattern = pattern.replace(/^\.\//, '');
  if (/[\[\]{}()!]/.test(pattern)) return false;
  let expression = '^';
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === '*' && pattern[index + 1] === '*') {
      index++;
      if (pattern[index + 1] === '/') { expression += '(?:.*/)?'; index++; }
      else expression += '.*';
    } else if (char === '*') expression += '[^/]*';
    else if (char === '?') expression += '[^/]';
    else expression += char.replace(/[\\.^$+|]/g, '\\$&');
  }
  return new RegExp(expression + '$').test(file);
}

function regexLiteral(node) {
  if (!node || !ts.isRegularExpressionLiteral(node)) return null;
  const end = node.text.lastIndexOf('/');
  return { source: node.text.slice(1, end), flags: node.text.slice(end + 1) };
}
const regexMatches = (regex, value) => new RegExp(regex.source, regex.flags).test(value);

export function inspectTestRunners(texts) {
  const manifestPath = 'scripts/vitest-library-specs.mjs';
  const manifest = parseConfig(manifestPath, texts.get(manifestPath)).constants.VITEST_LIBRARY_SPECS || [];
  const nodePath = 'scripts/test-unit.mjs';
  const node = parseConfig(nodePath, texts.get(nodePath));
  const nodePatterns = [], skipRules = [], vitestImportPatterns = [];
  walk(node.ast, (entry) => {
    if (ts.isCallExpression(entry) && ts.isIdentifier(entry.expression) && entry.expression.text === 'glob') {
      const pattern = staticValue(entry.arguments[0]);
      if (typeof pattern === 'string') nodePatterns.push(pattern);
    }
    if (ts.isVariableDeclaration(entry) && entry.name.getText(node.ast) === 'importsVitest') {
      walk(entry.initializer, (value) => {
        const regex = ts.isCallExpression(value) && regexLiteral(property(value.expression)?.object);
        if (regex) vitestImportPatterns.push(regex);
      });
    }
    if (ts.isIfStatement(entry) && ts.isCallExpression(entry.expression)) {
      const call = entry.expression, regex = regexLiteral(property(call.expression)?.object);
      if (regex && call.arguments[0]?.getText(node.ast) === 'normalized') {
        walk(entry.thenStatement, (child) => {
          const skip = ts.isReturnStatement(child) && staticValue(child.expression)?.skip;
          if (typeof skip === 'string') skipRules.push({ ...regex, reason: skip,
            line: node.ast.getLineAndCharacterOfPosition(entry.getStart(node.ast)).line + 1 });
        });
      }
    }
  });
  const vitestPath = 'vitest.config.ts';
  const vitest = parseConfig(vitestPath, texts.get(vitestPath), { VITEST_LIBRARY_SPECS: manifest }).config.test || {};
  const playwrightPath = 'playwright.config.ts';
  const playwrightSource = parseConfig(playwrightPath, texts.get(playwrightPath));
  const playwright = playwrightSource.config;
  const declaredPlaywrightKeys = new Set();
  walk(playwrightSource.ast, (node) => {
    if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name))) declaredPlaywrightKeys.add(node.name.text);
  });
  let scripts = {};
  try { scripts = JSON.parse(texts.get('package.json') || '{}').scripts || {}; } catch { /* Build validation reports invalid JSON. */ }
  const directNodeScripts = Object.entries(scripts).flatMap(([name, command]) => {
    if (typeof command !== 'string' || /[;&|$`]/.test(command)) return [];
    const match = /^node\s+(?:--import\s+\S+\s+)?--test\s+(.+)$/.exec(command);
    const patterns = match?.[1].split(/\s+/) || [];
    if (!patterns.length || patterns.some((value) => value.startsWith('-') || /["']/.test(value))) return [];
    return [{ runner: 'npm:' + name, source: 'package.json', patterns }];
  });
  return { note: 'Static declared selection only; no runner collection or execution occurred. Dynamic config, project overrides, and unsupported glob syntax require source review.',
    sources: [nodePath, manifestPath, vitestPath, playwrightPath, 'package.json'].filter((file) => texts.has(file)).map((file) => ({ file, sha256: sha(texts.get(file)) })),
    directNodeScripts,
    nodeUnit: { source: nodePath, patterns: sorted(nodePatterns), skipReasons: node.constants.SKIP_REASONS || {}, skipRules,
      delegatedVitestFiles: manifest, vitestImportPatterns },
    vitest: { source: vitestPath, include: vitest.include || [], exclude: vitest.exclude || [], setupFiles: vitest.setupFiles || [] },
    playwright: { source: playwrightPath, present: texts.has(playwrightPath), testDir: typeof playwright.testDir === 'string' ? playwright.testDir.replace(/^\.\//, '') : declaredPlaywrightKeys.has('testDir') ? null : '.',
      testMatch: playwright.testMatch || null, testIgnore: playwright.testIgnore || [],
      defaultTestMatch: !declaredPlaywrightKeys.has('testMatch'), note: 'Without testMatch, uses Playwright default *.spec/test.[cm]?[jt]sx? naming inside testDir; computed selectors and project overrides require review, not inferred ownership.' } };
}

export function declaredTestOwnership(file, text, runners) {
  const selections = [];
  const node = runners.nodeUnit, vitest = runners.vitest, playwright = runners.playwright;
  if (node.patterns.some((pattern) => matchesDeclaredGlob(file, pattern))) {
    const importsVitest = node.vitestImportPatterns.some((pattern) => regexMatches(pattern, text));
    const skip = node.skipRules.find((pattern) => regexMatches(pattern, file));
    selections.push({ runner: 'node-unit', source: node.source,
      status: importsVitest ? node.delegatedVitestFiles.includes(file) ? 'delegated' : 'blocked-unregistered' : skip ? 'skipped' : 'selected',
      ...(importsVitest ? { reason: node.delegatedVitestFiles.includes(file) ? node.skipReasons.vitest || 'Delegated to shared Vitest manifest' : 'Vitest import is absent from the shared library manifest; Node runner rejects it' }
        : skip ? { reason: node.skipReasons[skip.reason] || skip.reason, sourceLine: skip.line } : {}) });
  }
  if (vitest.include.some((pattern) => matchesDeclaredGlob(file, pattern))) {
    const excluded = vitest.exclude.find((pattern) => matchesDeclaredGlob(file, pattern));
    selections.push({ runner: 'vitest', source: vitest.source, status: excluded ? 'excluded' : 'selected', ...(excluded ? { reason: 'Excluded by ' + excluded } : {}) });
  }
  if (vitest.setupFiles.some((name) => name.replace(/^\.\//, '') === file)) selections.push({ runner: 'vitest', source: vitest.source, status: 'setup-helper' });
  const inPlaywright = playwright.present && typeof playwright.testDir === 'string' && (playwright.testDir === '.' || file.startsWith(playwright.testDir + '/'));
  const patterns = Array.isArray(playwright.testMatch) ? playwright.testMatch : [playwright.testMatch];
  if (inPlaywright && (playwright.defaultTestMatch ? /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) : patterns.some((pattern) => matchesDeclaredGlob(file, pattern)))) {
    const ignores = Array.isArray(playwright.testIgnore) ? playwright.testIgnore : [playwright.testIgnore];
    const excluded = ignores.find((pattern) => matchesDeclaredGlob(file, pattern));
    selections.push({ runner: 'playwright', source: playwright.source, status: excluded ? 'excluded' : 'selected', ...(excluded ? { reason: 'Excluded by ' + excluded } : {}) });
  }
  for (const direct of runners.directNodeScripts || []) if (direct.patterns.some((pattern) => matchesDeclaredGlob(file, pattern))) {
    selections.push({ runner: direct.runner, source: direct.source, status: 'selected' });
  }
  const kind = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) ? 'test-candidate' : 'test-helper';
  return { kind, declaredRunners: selections,
    collectionStatus: kind === 'test-helper' ? 'helper-not-a-suite' : selections.some((entry) => entry.status === 'selected') ? 'statically-selected' : 'not-selected-by-indexed-runners',
    coverageNote: 'Selection metadata is not proof of collection, passing assertions, execution, or test coverage.' };
}

export function buildIndex(root) {
  const trackedEntries = execFileSync('git', ['ls-files', '--stage', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
  const trackedMetadata = new Map(trackedEntries.map((entry) => {
    const tab = entry.indexOf('\t');
    const [mode, object, stage] = entry.slice(0, tab).split(' ');
    if (stage !== '0') throw new Error('Cannot index unresolved Git conflict: ' + entry.slice(tab + 1));
    return [entry.slice(tab + 1), { mode, object }];
  }));
  const tracked = [...trackedMetadata.keys()];
  const inputs = sorted(tracked.filter((file) => !file.startsWith(OUTPUT + '/')));
  const fileSet = new Set(inputs), records = [], edges = [], routes = [], models = [], environments = new Map();
  const documents = [], tests = [], manifests = [], examples = [];
  const texts = new Map();
  const directorySafety = new Map();
  const parseJson = (file) => {
    if (!texts.has(file)) return {};
    try { return JSON.parse(texts.get(file)); } catch { throw new Error('Invalid JSON in tracked input: ' + file); }
  };
  for (const file of inputs) {
    const location = path.join(root, file);
    const metadata = { path: file, area: areaFor(file), domain: domainFor(file) };
    if (trackedMetadata.get(file).mode === '160000') {
      records.push({ ...metadata, status: 'submodule-not-traversed', gitObject: trackedMetadata.get(file).object, bytes: null, lines: null, sha256: null });
      continue;
    }
    const ancestors = file.split('/').slice(0, -1).map((_part, index, parts) => parts.slice(0, index + 1).join('/'));
    if (ancestors.some((directory) => {
      if (!directorySafety.has(directory)) {
        try { directorySafety.set(directory, lstatSync(path.join(root, directory)).isSymbolicLink()); }
        catch (error) { if (error.code !== 'ENOENT') throw error; directorySafety.set(directory, false); }
      }
      return directorySafety.get(directory);
    })) {
      records.push({ ...metadata, status: 'ancestor-symlink-not-followed', bytes: null, lines: null, sha256: null });
      continue;
    }
    let stat;
    try { stat = lstatSync(location); } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Cannot inspect tracked input: ' + file);
      records.push({ ...metadata, status: 'missing', bytes: null, lines: null, sha256: null });
      continue;
    }
    // Account for every tracked path without opening a submodule, symlink, or private data file.
    if (stat.isSymbolicLink()) {
      const link = readlinkSync(location);
      records.push({ ...metadata, status: 'symlink-not-followed', bytes: Buffer.byteLength(link), lines: null, sha256: sha(link) });
      continue;
    }
    if (!stat.isFile()) {
      records.push({ ...metadata, status: 'non-file', bytes: null, lines: null, sha256: null });
      continue;
    }
    const basename = path.posix.basename(file);
    if ((/^\.env(?:\.|$)/.test(basename) && !/^\.env\.(?:example|sample|template)$/.test(basename)) || /\.(?:pem|key|p12|pfx|sqlite\d*|db)$/i.test(basename)) {
      records.push({ ...metadata, status: 'private-content-not-read', bytes: stat.size, lines: null, sha256: null });
      continue;
    }
    const buffer = readFileSync(location);
    const binary = buffer.includes(0);
    const text = binary ? null : buffer.toString('utf8');
    const record = { path: file, area: areaFor(file), domain: domainFor(file), bytes: buffer.length,
      lines: text === null ? null : text.split('\n').length - (text.endsWith('\n') ? 1 : 0), sha256: sha(buffer), binary };
    if (text !== null) texts.set(file, text);
    if (SOURCE_EXTENSIONS.test(file) && text !== null) {
      const facts = inspectSource(file, text);
      Object.assign(record, { exports: facts.exports, declarations: facts.declarations, directive: facts.directive });
      if (facts.parseDiagnostics.length) record.parseDiagnostics = facts.parseDiagnostics;
      for (const reference of facts.imports) edges.push({ from: file, ...reference, ...resolveReference(file, reference.specifier, fileSet) });
      for (const reference of facts.environment) {
        if (!environments.has(reference.name)) environments.set(reference.name, []);
        environments.get(reference.name).push({ file, line: reference.line });
      }
      const route = routeFor(file);
      if (route) routes.push({ file, ...route, exports: facts.exports, methods: facts.exports.map((value) => value.name).filter((name) => HTTP_METHODS.has(name)),
        configuration: facts.configuration,
        boundaryReferences: facts.imports.filter((reference) => /auth|tenant|guard|rate[-_]?limit|security|guc/i.test(reference.specifier)) });
      if (/(?:\.test\.|\.spec\.|^tests\/)/.test(file)) tests.push({ file, area: record.area, domain: record.domain,
        frameworkImports: sorted(facts.imports.filter((reference) => /vitest|node:test|playwright|testing-library/.test(reference.specifier)).map((reference) => reference.specifier)),
        localReferences: edges.filter((edge) => edge.from === file && edge.target).map((edge) => ({ file: edge.target, line: edge.line })) });
    }
    if (file.endsWith('.prisma') && text !== null) {
      models.push(...inspectPrisma(file, text));
      for (const match of withoutComments(text).matchAll(/\benv\("([A-Za-z_][A-Za-z0-9_]*)"\)/g)) {
        if (!environments.has(match[1])) environments.set(match[1], []);
        environments.get(match[1]).push({ file, line: text.slice(0, match.index).split('\n').length });
      }
    }
    const astroRoute = routeFor(file);
    if (astroRoute?.kind === 'astro-page' && text !== null) routes.push({ file, ...astroRoute,
      exports: [], methods: [], configuration: {}, boundaryReferences: [],
      extraction: 'Filename route pattern only; Astro frontmatter and template imports are not AST-indexed.' });
    if (/\.(?:md|mdx)$/.test(file) && text !== null) {
      const headings = [...text.matchAll(/^(#{1,3})\s+(.+)$/gm)].map((match) => ({ level: match[1].length,
        title: match[2].replace(/<[^>]+>/g, ''), line: text.slice(0, match.index).split('\n').length }));
      documents.push({ file, title: headings[0]?.title || path.posix.basename(file), headings,
        datedFilename: /\d{4}-\d{2}-\d{2}/.test(file), note: 'Filename dates and headings are navigation metadata, not authority or freshness proof.' });
    }
    if (path.posix.basename(file) === 'package.json' && text !== null) {
      const manifest = parseJson(file);
      const dependencyNames = (dependencies) => Object.fromEntries(Object.entries(dependencies || {}).map(([name, locator]) => [name, safeLocator(locator)]));
      manifests.push({ file, name: manifest.name, version: manifest.version, packageManager: manifest.packageManager || null,
        dependencies: dependencyNames(manifest.dependencies), devDependencies: dependencyNames(manifest.devDependencies),
        scripts: Object.keys(manifest.scripts || {}).sort() });
    }
    if (file === '.env.example' && text !== null) {
      for (const match of text.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) examples.push(match[1]);
    }
    records.push(record);
  }
  const testRunners = inspectTestRunners(texts);
  for (const candidate of tests) Object.assign(candidate, declaredTestOwnership(candidate.file, texts.get(candidate.file), testRunners));
  for (const name of examples) if (!environments.has(name)) environments.set(name, []);
  const modelNames = new Set(models.filter((model) => model.kind !== 'enum').map((model) => model.name));
  const relations = models.flatMap((model) => model.fields.filter((field) => modelNames.has(field.type.replace(/[?\[\]]/g, '')))
    .map((field) => ({ from: model.name, to: field.type.replace(/[?\[\]]/g, ''), field: field.name, list: field.type.endsWith('[]'), optional: field.type.endsWith('?'),
      file: model.file, line: field.line, relationFields: field.relationFields })));
  const vercel = parseJson('vercel.json');
  const crons = (vercel.crons || []).map((cron) => ({ ...cron, timezone: 'UTC', route: routes.find((route) => route.kind === 'route' && route.path === cron.path) || null }));
  const incoming = new Map();
  for (const edge of edges) if (edge.target) incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
  const baseline = parseJson('docs/knowledge-base/audit-baseline.json');
  const inventory = { schemaVersion: 1, generator: 'scripts/knowledge-index.mjs', auditBaseline: baseline,
    inputTreeSha256: sha(records.map((record) => record.path + '\0' + (record.sha256 ?? record.gitObject ?? record.status) + '\n').join('')),
    scope: 'Every tracked path except this generator output directory. Untracked/ignored files are excluded. Symlinks, submodules, private dotenv/key/database paths and missing tracked files have metadata-only entries; their content is not read.',
    extractionLimits: 'AST extraction covers JS/TS variants only, not Astro frontmatter, shell, generated runtime behavior, computed environment names, or a complete call graph. Symbols are top-level declarations plus static ESM/CommonJS exports. Route indexing covers Next page/route/layout boundaries and Astro page filename patterns, not every metadata/file convention, dynamic expansion, or deployed precedence.',
    excludedOutputPrefix: OUTPUT + '/', files: records };
  const summary = { schemaVersion: 1, inputTreeSha256: inventory.inputTreeSha256, auditBaseline: baseline,
    counts: { files: records.length, sourceModules: records.filter((record) => record.exports).length, importReferences: edges.length,
      resolvedLocalReferences: edges.filter((edge) => edge.target).length, unresolvedLocalReferences: edges.filter((edge) => !edge.external && !edge.target).length,
      routeFiles: routes.length, nextRouteFiles: routes.filter((route) => route.kind !== 'astro-page').length,
      apiHandlers: routes.filter((route) => route.kind === 'route').length,
      pageFiles: routes.filter((route) => route.kind === 'page').length, astroPageFiles: routes.filter((route) => route.kind === 'astro-page').length, configuredCrons: crons.length,
      prismaModels: modelNames.size, prismaEnums: models.filter((model) => model.kind === 'enum').length,
      relationFields: relations.length, testFiles: tests.length, testCandidates: tests.filter((entry) => entry.kind === 'test-candidate').length,
      testHelpers: tests.filter((entry) => entry.kind === 'test-helper').length, staticallySelectedTests: tests.filter((entry) => entry.collectionStatus === 'statically-selected').length,
      unselectedTestCandidates: tests.filter((entry) => entry.kind === 'test-candidate' && entry.collectionStatus !== 'statically-selected').length,
      metadataOnlyFiles: records.filter((entry) => entry.status).length, documentFiles: documents.length, environmentNames: environments.size },
    areas: sorted(records.map((record) => record.area)).map((area) => ({ area, files: records.filter((record) => record.area === area).length })),
    mostReferenced: [...incoming].sort((a, b) => b[1] - a[1] || compare(a[0], b[0])).slice(0, 35).map(([file, references]) => ({ file, references })),
    largestSourceFiles: records.filter((record) => record.exports).sort((a, b) => b.lines - a.lines || compare(a.path, b.path)).slice(0, 35).map(({ path: file, lines }) => ({ file, lines })) };
  const output = new Map();
  for (const [name, value] of Object.entries({ inventory, summary, imports: edges, routes, crons, models: { models, relations }, tests, 'test-runners': testRunners,
    documents, environment: { note: 'AST JS/TS process.env/import.meta.env names, Prisma env() names, and root .env.example names only. No values are copied. Astro, computed names, shell templates and deployed configuration are not resolved. Presence does not prove required configuration.',
      variables: [...environments].sort(([a], [b]) => compare(a, b)).map(([name, references]) => ({ name, publicPrefix: name.startsWith('NEXT_PUBLIC_'), declaredInRootExample: examples.includes(name), references })),
      rootExampleNames: sorted(examples) }, packages: manifests })) output.set(name + '.json', json(value));
  let index = '# Generated repository index\n\nGenerated by `node scripts/knowledge-index.mjs`. Do not edit these files.\n\n' +
    'The catalog accounts for every tracked path, including assets and historical material. Private dotenv/key/database paths, symlinks, submodules and missing files receive metadata-only entries. It excludes its own output directory and untracked/ignored files. JS/TS AST extraction does not cover Astro or shell; static imports and guard references are navigation evidence, not a runtime call graph or security certification.\n\n' +
    'Start with [the human guide](../README.md), [summary](summary.json), [routes](routes.md), [models](models.md), [crons](crons.md), [environment names](environment.json), [test inventory](tests.json), or [declared runner selection](test-runners.json). Runner selection is not proof of execution or coverage.\n\n| Area | Files | Catalog |\n| --- | ---: | --- |\n';
  for (const { area, files: count } of summary.areas) {
    index += `| ${area} | ${count} | [Open](${area}.md) |\n`;
    let page = `# ${area}: complete file catalog\n\n[All areas](README.md) · [Machine inventory](inventory.json)\n\n| File | Lines | Domain | Exported symbols |\n| --- | ---: | --- | --- |\n`;
    for (const record of records.filter((record) => record.area === area)) {
      const location = record.status ? quote(record.path) : `[${quote(record.path)}](${sourceLink(record.path)})`;
      page += `| ${location} | ${record.lines ?? record.status ?? 'binary'} | ${record.domain} | ${quote((record.exports || []).map((entry) => entry.name + ':' + entry.line).join(', '))} |\n`;
    }
    output.set(area + '.md', page);
  }
  output.set('README.md', index);
  output.set('routes.md', '# Route and layout index\n\n[Human guide](../README.md) · [Machine route records](routes.json)\n\nNext groups are removed from URL patterns; bracketed parameters remain. Intercepting routes are flagged for source review. Astro page patterns are active static-build inputs, with no proof of getStaticPaths/locale expansion or current middleware/static/Next serving precedence. Imported boundary helpers do not prove authorization coverage.\n\n| Pattern | Kind | Methods | Source | Boundary import references |\n| --- | --- | --- | --- | --- |\n' +
    routes.map((route) => `| ${quote(route.path)} | ${route.kind} | ${route.methods.join(', ')} | [${quote(route.file)}](${sourceLink(route.file)}) | ${quote(route.boundaryReferences.map((ref) => ref.specifier + ':' + ref.line).join(', '))} |`).join('\n') + '\n');
  output.set('crons.md', '# Configured scheduled jobs\n\n[Source vercel.json](../../../vercel.json) · [Machine records](crons.json)\n\nSchedules are UTC declarations; this index does not prove a deployed invocation, successful result, or safe retry.\n\n| Schedule (UTC) | Endpoint | Source | Declared duration |\n| --- | --- | --- | --- |\n' +
    crons.map((cron) => `| \`${cron.schedule}\` | ${cron.path} | ${cron.route ? `[route](${sourceLink(cron.route.file)})` : '**MISSING ROUTE**'} | ${cron.route?.configuration.maxDuration ?? 'platform/default or computed'} |`).join('\n') + '\n');
  output.set('models.md', '# Prisma schema index\n\n[Machine fields and relationships](models.json) · [Complete relationship diagram](database-relations.mmd)\n\nDeclared Prisma schema only. Migration SQL, RLS, triggers, and actual production state require separate inspection. Each relation field is listed; inverse fields are retained.\n\n| Name | Kind | Table mapping | Fields | Source |\n| --- | --- | --- | ---: | --- |\n' +
    models.map((model) => `| ${model.name} | ${model.kind} | ${model.table || 'Prisma default'} | ${(model.values || model.fields).length} | [schema:${model.line}](${sourceLink(model.file, model.line)}) |`).join('\n') + '\n');
  output.set('database-relations.mmd', 'flowchart LR\n' + [...modelNames].sort().map((name) => `  ${name}["${name}"]`).join('\n') + '\n' +
    relations.map((relation) => `  ${relation.from} -->|"${relation.field}${relation.list ? ' many' : relation.optional ? ' optional' : ' one'}"| ${relation.to}`).join('\n') + '\n');
  const areaEdges = new Map();
  for (const edge of edges) if (edge.target && areaFor(edge.from) !== areaFor(edge.target)) {
    const key = areaFor(edge.from) + '\0' + areaFor(edge.target);
    areaEdges.set(key, (areaEdges.get(key) || 0) + 1);
  }
  output.set('area-dependencies.mmd', 'flowchart LR\n' + summary.areas.map(({ area, files: count }) => `  ${area.replaceAll('-', '_')}["${area}: ${count} files"]`).join('\n') + '\n' +
    [...areaEdges].sort(([a], [b]) => compare(a, b)).map(([key, count]) => { const [from, to] = key.split('\0'); return `  ${from.replaceAll('-', '_')} -->|"${count} static references"| ${to.replaceAll('-', '_')}`; }).join('\n') + '\n');
  return { output, summary };
}

export function main(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some((argument) => argument !== '--check')) throw new Error('Usage: node scripts/knowledge-index.mjs [--check]');
  const root = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim();
  const { output, summary } = buildIndex(root);
  const destination = path.join(root, OUTPUT);
  let parent = root;
  for (const segment of OUTPUT.split('/')) {
    parent = path.join(parent, segment);
    try {
      const stat = lstatSync(parent);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Generated directory must be a real directory: ' + path.relative(root, parent));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const unexpected = existsSync(destination) ? readdirSync(destination).filter((name) => !output.has(name)) : [];
  if (unexpected.length) throw new Error('Unexpected generated files require explicit review: ' + unexpected.sort().join(', '));
  for (const name of output.keys()) {
    try {
      const stat = lstatSync(path.join(destination, name));
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Generated target must be a regular file: ' + name);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const stale = [];
  for (const [name, contents] of output) {
    const target = path.join(destination, name);
    if (!existsSync(target) || readFileSync(target, 'utf8') !== contents) stale.push(name);
    if (!args.includes('--check')) { mkdirSync(destination, { recursive: true }); writeFileSync(target, contents); }
  }
  console.log(JSON.stringify({ mode: args.includes('--check') ? 'check' : 'write', ...summary.counts, changedOutputs: stale }, null, 2));
  if (args.includes('--check') && stale.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error('Knowledge index: ' + error.message); process.exitCode = 1; }
}
