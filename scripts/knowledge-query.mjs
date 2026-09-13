#!/usr/bin/env node
/** Small-context local lookup; reads generated navigation records, never source/env contents. */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const USAGE = 'Usage: node scripts/knowledge-query.mjs QUERY [--limit 25] | --references repo/path [--limit 25]';
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function parseQueryArgs(args) {
  let query = null, references = null, limit = 25;
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument.startsWith('--')) {
      if (!['--limit', '--references'].includes(argument) || seen.has(argument)) throw new Error(USAGE);
      seen.add(argument);
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error('Missing value for ' + argument + '. ' + USAGE);
      if (argument === '--limit') {
        if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 200) throw new Error('--limit must be 1–200');
        limit = Number(value);
      } else references = value;
    } else {
      if (query !== null || !argument.trim()) throw new Error(USAGE);
      query = argument.trim().toLowerCase();
    }
  }
  if ((!query && !references) || (query && references)) throw new Error(USAGE);
  if (references) {
    if (references.includes('\0') || references.includes('\\') || path.posix.isAbsolute(references) || references.split('/').includes('..')) {
      throw new Error('--references must be a repository-relative path without traversal');
    }
    references = path.posix.normalize(references);
  }
  return { query, references, limit };
}

export function queryIndex(load, { query, references, limit }) {
  const inventory = load('inventory');
  if (!Array.isArray(inventory.files)) throw new Error('Invalid inventory catalog; regenerate the knowledge index');
  const results = [];
  if (references) {
    if (!inventory.files.some((record) => record.path === references)) throw new Error('Path is not present in the generated inventory: ' + references);
    for (const edge of load('imports')) {
      if (edge.target === references) results.push({ kind: 'imported-by', file: edge.from, line: edge.line, symbol: edge.specifier });
      if (edge.from === references) results.push({ kind: 'imports', file: edge.from, line: edge.line,
        target: edge.target || edge.specifier, resolution: edge.external ? 'external' : edge.target ? 'local' : 'unresolved' });
    }
  } else {
    const matches = (value) => typeof value === 'string' && value.toLowerCase().includes(query);
    for (const record of inventory.files) {
      if (matches(record.path) || matches(record.domain)) results.push({ kind: 'file', file: record.path, domain: record.domain });
      const exported = new Set();
      for (const symbol of record.exports || []) {
        exported.add(symbol.localName || symbol.name);
        if (matches(symbol.name) || matches(symbol.localName)) results.push({ kind: 'export', file: record.path, line: symbol.line, symbol: symbol.name,
          ...(symbol.localName ? { localName: symbol.localName } : {}) });
      }
      for (const symbol of record.declarations || []) if (!exported.has(symbol.name) && matches(symbol.name)) {
        results.push({ kind: 'declaration', file: record.path, line: symbol.line, symbol: symbol.name });
      }
    }
    for (const model of load('models').models) {
      if (matches(model.name)) results.push({ kind: model.kind, file: model.file, line: model.line, symbol: model.name });
      for (const field of [...(model.fields || []), ...(model.values || [])]) if (matches(field.name)) {
        results.push({ kind: 'schema-field', file: model.file, line: field.line, symbol: model.name + '.' + field.name });
      }
    }
    for (const variable of load('environment').variables) if (matches(variable.name)) results.push({ kind: 'environment-name', name: variable.name,
      referenceCount: variable.references.length, references: variable.references.slice(0, 5) });
    for (const edge of load('imports')) if (matches(edge.specifier) || matches(edge.package)) {
      results.push({ kind: 'import-reference', file: edge.from, line: edge.line, symbol: edge.specifier,
        ...(edge.target ? { target: edge.target } : {}) });
    }
    for (const route of load('routes')) if (matches(route.path)) results.push({ kind: 'route', file: route.file, pattern: route.path, methods: route.methods });
    for (const document of load('documents')) {
      if (matches(document.title)) results.push({ kind: 'document', file: document.file, title: document.title });
      for (const heading of document.headings || []) if (heading.title !== document.title && matches(heading.title)) {
        results.push({ kind: 'heading', file: document.file, line: heading.line, title: heading.title });
      }
    }
    for (const entry of load('tests')) if (matches(entry.file) || entry.declaredRunners?.some((runner) => matches(runner.runner))) {
      results.push({ kind: 'test-selection', file: entry.file, collectionStatus: entry.collectionStatus || 'not-indexed', declaredRunners: entry.declaredRunners || [] });
    }
  }
  const priority = { export: 0, declaration: 1, model: 1, enum: 1, view: 1, 'schema-field': 2, 'environment-name': 2,
    route: 3, 'import-reference': 3, document: 4, heading: 4, 'test-selection': 4, file: 5 };
  const exact = (record) => query && [record.symbol, record.localName, record.name, record.pattern, record.file].some((value) => value?.toLowerCase() === query) ? 0 : 1;
  results.sort((a, b) => exact(a) - exact(b) || (priority[a.kind] ?? 0) - (priority[b.kind] ?? 0) ||
    compare(String(a.file || a.name), String(b.file || b.name)) || (a.line || 0) - (b.line || 0) || compare(a.symbol || '', b.symbol || ''));
  return { query: references ? { references } : query, inputTreeSha256: inventory.inputTreeSha256,
    matched: results.length, shown: Math.min(limit, results.length), results: results.slice(0, limit),
    note: 'Static navigation evidence. This lookup does not check freshness or prove test coverage; run knowledge-index.mjs --check and inspect source before a change.' };
}

export function main(args = process.argv.slice(2)) {
  const options = parseQueryArgs(args);
  const root = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim();
  const directory = path.join(root, 'docs/knowledge-base/generated');
  const load = (name) => {
    try { return JSON.parse(readFileSync(path.join(directory, name + '.json'), 'utf8')); }
    catch { throw new Error('Missing or invalid ' + name + '.json; run node scripts/knowledge-index.mjs from the repository'); }
  };
  console.log(JSON.stringify(queryIndex(load, options), null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error('Knowledge query: ' + error.message); process.exitCode = 1; }
}
