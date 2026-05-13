/**
 * One-time migration script: wrap every App Router API route that touches
 * Prisma (or calls helpers that do) with a GUC context wrapper.
 *
 * Uses the TypeScript compiler API for robust AST-based extraction so
 * nested braces, template literals, and regexes do not confuse the parser.
 *
 * Usage (from repo root):
 *   npx tsx scripts/wrap-api-routes-with-guc-ts.ts
 */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const API_DIR = path.resolve(process.cwd(), 'app/api');
const WEBHOOK_PATHS = ['app/api/stripe/webhook', 'app/api/webhooks'];

function isWebhookRoute(filePath: string): boolean {
  const rel = path.relative(process.cwd(), filePath);
  const dir = path.dirname(rel);
  return WEBHOOK_PATHS.some((wp) => dir === wp || dir.startsWith(wp + '/'));
}

function isCronRoute(filePath: string): boolean {
  const rel = path.relative(process.cwd(), filePath);
  const dir = path.dirname(rel);
  return dir === 'app/api/cron' || dir.startsWith('app/api/cron/');
}

function hasGucWrapper(content: string): boolean {
  return /\bwithApiGuc\b|\bwithAuthenticatedApiGuc\b|\bwithSystemGuc\b|\bwithAnonymousGuc\b|\bwithAuthGuc\b|\bwithUserGuc\b|\brunWithGucContext\b/.test(
    content,
  );
}

function usesPrisma(content: string): boolean {
  return /\bprisma\./.test(content);
}

function usesTrackEvent(content: string): boolean {
  return /\btrackEvent\(/.test(content);
}

function usesSaveAiResult(content: string): boolean {
  return /\bsaveAIToolResult\(/.test(content);
}

function needsWrapper(content: string): boolean {
  return usesPrisma(content) || usesTrackEvent(content) || usesSaveAiResult(content);
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
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
    ) {
      // Only top-level exports (not nested inside another function)
      if (ts.isSourceFile(node.parent)) {
        handlers.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return handlers;
}

function transformFile(filePath: string): { changed: boolean; newContent: string } {
  const content = fs.readFileSync(filePath, 'utf8');

  if (hasGucWrapper(content)) return { changed: false, newContent: content };
  if (!needsWrapper(content)) return { changed: false, newContent: content };
  if (isCronRoute(filePath)) return { changed: false, newContent: content };

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const handlers = findHandlers(sourceFile);
  if (handlers.length === 0) return { changed: false, newContent: content };

  const isWebhook = isWebhookRoute(filePath);
  const wrapperName = isWebhook ? 'withSystemGuc' : 'withApiGuc';
  const importLine = `import { ${wrapperName} } from '@/lib/db/withRequestGuc';\n`;

  // Check if import already exists
  const hasImport = content.includes('@/lib/db/withRequestGuc');

  let newContent = content;
  let importOffset = 0;

  if (!hasImport) {
    // Insert import after the last import statement
    const lastImportMatch = content.match(/^(import\s+.+?;\s*)$/gm);
    if (lastImportMatch && lastImportMatch.length > 0) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const insertPos = content.lastIndexOf(lastImport) + lastImport.length;
      newContent = content.slice(0, insertPos) + '\n' + importLine + content.slice(insertPos);
      importOffset = importLine.length + 1;
    } else {
      newContent = importLine + content;
      importOffset = importLine.length;
    }
  }

  // Re-parse with import inserted so positions are accurate
  const shiftedSource = ts.createSourceFile(
    filePath,
    newContent,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const shiftedHandlers = findHandlers(shiftedSource);

  if (shiftedHandlers.length === 0) {
    return { changed: false, newContent: content };
  }

  // Build replacement by processing handlers from end to start
  let result = newContent;
  for (let i = shiftedHandlers.length - 1; i >= 0; i--) {
    const h = shiftedHandlers[i];
    const fullStart = h.getFullStart(); // includes leading trivia (comments)
    const fullEnd = h.getEnd();

    const body = result.slice(h.body!.getStart(shiftedSource) + 1, h.body!.end - 1); // inside braces
    const signatureText = result.slice(h.name!.end, h.body!.getStart(shiftedSource)).trimStart(); // from name end to body start, includes parameters and maybe type annotation

    // signatureText looks like "(request: NextRequest) {" or "(request: NextRequest): Promise<Response> {"
    // We want just the parameter list: "(request: NextRequest)" or "(request: NextRequest): Promise<Response>"
    const paramList = signatureText.replace(/\s*\{\s*$/, '').trim();

    const before = result.slice(0, fullStart);
    const after = result.slice(fullEnd);

    if (shiftedHandlers.length === 1) {
      const newHandler = `export const ${h.name!.text} = ${wrapperName}(async ${paramList} => {${body}});`;
      result = before + newHandler + after;
    } else {
      const newHandler = `async function _${h.name!.text}${paramList} {${body}}\nexport const ${h.name!.text} = ${wrapperName}(_${h.name!.text});`;
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
  const changedFiles: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const rel = path.relative(process.cwd(), file);
      const result = transformFile(file);
      if (result.changed) {
        fs.writeFileSync(file + '.bak', fs.readFileSync(file, 'utf8'));
        fs.writeFileSync(file, result.newContent, 'utf8');
        changed++;
        changedFiles.push(rel);
        console.log(`✓ ${rel}`);
      } else {
        skipped++;
      }
    } catch (err) {
      const rel = path.relative(process.cwd(), file);
      errors.push(`${rel}: ${err}`);
      console.error(`✗ ${rel}: ${err}`);
    }
  }

  console.log(`\nDone. Changed: ${changed}, Skipped: ${skipped}, Errors: ${errors.length}`);
  if (changedFiles.length > 0) {
    console.log('\nChanged files:');
    for (const f of changedFiles) console.log(`  ${f}`);
  }
  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) console.log(`  ${e}`);
    process.exit(1);
  }
}

main();
