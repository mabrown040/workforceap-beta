/**
 * One-time migration script: wrap every App Router API route that touches
 * Prisma (or calls helpers that do) with a GUC context wrapper.
 *
 * Usage (from repo root):
 *   npx tsx scripts/wrap-api-routes-with-guc.ts
 *
 * Safety:
 *   - Skips files that already import a GUC wrapper.
 *   - Skips cron routes (already wrapped by withCronLogging).
 *   - Uses withSystemGuc for webhooks, withApiGuc for everything else.
 *   - Preserves every character inside handler bodies.
 *   - Writes a .bak file next to each modified file.
 */

import fs from 'fs';
import path from 'path';

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

type HandlerInfo = {
  name: string;
  signature: string;
  bodyStart: number;
  bodyEnd: number;
  fullStart: number;
  fullEnd: number;
};

function findHandlers(content: string): HandlerInfo[] {
  const handlers: HandlerInfo[] = [];
  const regex = /^export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    const fullStart = match.index;
    const paramsStart = match.index + match[0].length - 1; // position of '('

    // Find matching closing paren for parameters
    let parenDepth = 1;
    let paramsEnd = paramsStart + 1;
    while (parenDepth > 0 && paramsEnd < content.length) {
      const ch = content[paramsEnd];
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      paramsEnd++;
    }

    const signature = content.slice(fullStart + 'export async function '.length, paramsEnd);

    // Skip whitespace to find opening brace
    let bodyStart = paramsEnd;
    while (bodyStart < content.length && /\s/.test(content[bodyStart])) bodyStart++;
    if (content[bodyStart] !== '{') continue; // Not a block body, skip

    // Find matching closing brace
    let braceDepth = 1;
    let bodyEnd = bodyStart + 1;
    while (braceDepth > 0 && bodyEnd < content.length) {
      const ch = content[bodyEnd];
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
      // Skip string literals to avoid false matches
      else if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        bodyEnd++;
        while (bodyEnd < content.length) {
          if (content[bodyEnd] === '\\') {
            bodyEnd += 2;
          } else if (content[bodyEnd] === quote) {
            bodyEnd++;
            break;
          } else {
            bodyEnd++;
          }
        }
        continue;
      }
      bodyEnd++;
    }

    handlers.push({
      name,
      signature,
      bodyStart: bodyStart + 1, // after opening brace
      bodyEnd: bodyEnd - 1,     // before closing brace
      fullStart,
      fullEnd: bodyEnd,
    });
  }

  return handlers;
}

function transformFile(filePath: string): { changed: boolean; newContent: string } {
  const content = fs.readFileSync(filePath, 'utf8');

  if (hasGucWrapper(content)) return { changed: false, newContent: content };
  if (!needsWrapper(content)) return { changed: false, newContent: content };
  if (isCronRoute(filePath)) return { changed: false, newContent: content };

  const handlers = findHandlers(content);
  if (handlers.length === 0) return { changed: false, newContent: content };

  const isWebhook = isWebhookRoute(filePath);
  const wrapperName = isWebhook ? 'withSystemGuc' : 'withApiGuc';
  const importLine = `import { ${wrapperName} } from '@/lib/db/withRequestGuc';\n`;

  // Check if import already exists
  const hasImport = content.includes(`@/lib/db/withRequestGuc`);

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

  // Re-find handlers in newContent (positions shifted by import)
  const shiftedHandlers = findHandlers(newContent);
  if (shiftedHandlers.length === 0) {
    // Should not happen, but safety check
    return { changed: false, newContent: content };
  }

  // Build replacement by processing handlers from end to start to preserve indices
  let result = newContent;
  for (let i = shiftedHandlers.length - 1; i >= 0; i--) {
    const h = shiftedHandlers[i];
    const body = result.slice(h.bodyStart, h.bodyEnd);
    const before = result.slice(0, h.fullStart);
    const after = result.slice(h.fullEnd);

    if (shiftedHandlers.length === 1) {
      // Single handler: inline arrow function
      const paramList = h.signature.slice(h.name.length).trim(); // e.g. "(request: NextRequest)"
      const newHandler = `export const ${h.name} = ${wrapperName}(async ${paramList} => {${body}});`;
      result = before + newHandler + after;
    } else {
      // Multiple handlers: define private async function, export wrapped version
      const paramList = h.signature.slice(h.name.length).trim(); // e.g. "(request: NextRequest)"
      const newHandler = `async function _${h.name}${paramList} {${body}}\nexport const ${h.name} = ${wrapperName}(_${h.name});`;
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
        // Backup
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
