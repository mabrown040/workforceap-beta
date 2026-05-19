/**
 * Wrap App Router API route handlers that are not already covered by
 * withApiGuc / withAuthenticatedApiGuc / withCronLogging / withRouteObservability.
 *
 * Usage (from repo root):
 *   npx tsx scripts/wrap-api-routes-with-observability.ts
 */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const API_DIR = path.resolve(process.cwd(), 'app/api');

function hasObservabilityWrapper(content: string): boolean {
  return /\bwithApiGuc\b|\bwithAuthenticatedApiGuc\b|\bwithCronLogging\b|\bwithRouteObservability\b/.test(
    content,
  );
}

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function findHandlers(sourceFile: ts.SourceFile): ts.FunctionDeclaration[] {
  const handlers: ts.FunctionDeclaration[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      HTTP_METHODS.has(node.name.text) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) &&
      ts.isSourceFile(node.parent)
    ) {
      handlers.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return handlers;
}

function transformFile(filePath: string): { changed: boolean; newContent: string } {
  const content = fs.readFileSync(filePath, 'utf8');
  if (hasObservabilityWrapper(content)) {
    return { changed: false, newContent: content };
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const fnHandlers = findHandlers(sourceFile);
  if (fnHandlers.length === 0) {
    return { changed: false, newContent: content };
  }

  const importLine = `import { withRouteObservability } from '@/lib/api/routeObservability';\n`;
  const hasImport = content.includes('@/lib/api/routeObservability');

  let newContent = content;
  if (!hasImport) {
    const lastImportMatch = content.match(/^(import\s+.+?;\s*)$/gm);
    if (lastImportMatch && lastImportMatch.length > 0) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const insertPos = content.lastIndexOf(lastImport) + lastImport.length;
      newContent = content.slice(0, insertPos) + '\n' + importLine + content.slice(insertPos);
    } else {
      newContent = importLine + content;
    }
  }

  const shiftedSource = ts.createSourceFile(
    filePath,
    newContent,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const shiftedFnHandlers = findHandlers(shiftedSource);
  if (shiftedFnHandlers.length === 0) {
    return { changed: false, newContent: content };
  }

  let result = newContent;
  for (let i = shiftedFnHandlers.length - 1; i >= 0; i--) {
    const h = shiftedFnHandlers[i];
    const fullStart = h.getFullStart();
    const fullEnd = h.getEnd();
    const body = h.body!.getText(shiftedSource).slice(1, -1);
    const signatureText = result.slice(h.name!.end, h.body!.pos).trimStart();
    const paramList = signatureText.replace(/\s*\{\s*$/, '').trim();

    const before = result.slice(0, fullStart);
    const after = result.slice(fullEnd);

    if (shiftedFnHandlers.length === 1) {
      const newHandler = `export const ${h.name!.text} = withRouteObservability(async ${paramList} => {${body}});`;
      result = before + newHandler + after;
    } else {
      const newHandler = `async function _${h.name!.text}${paramList} {${body}}\nexport const ${h.name!.text} = withRouteObservability(_${h.name!.text});`;
      result = before + newHandler + after;
    }
  }

  return { changed: true, newContent: result };
}

function walk(dir: string, callback: (file: string) => void) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, callback);
    } else if (entry === 'route.ts') {
      callback(full);
    }
  }
}

function main() {
  const files: string[] = [];
  walk(API_DIR, (f) => files.push(f));

  let changed = 0;
  let skipped = 0;

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const result = transformFile(file);
    if (result.changed) {
      fs.writeFileSync(file, result.newContent, 'utf8');
      changed++;
      console.log(`✓ ${rel}`);
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Changed: ${changed}, Skipped: ${skipped}`);
}

main();
