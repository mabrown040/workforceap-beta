/**
 * One-off: convert `export const metadata = buildPageMetadata({...});`
 * to `export async function generateMetadata() { return buildPageMetadataAsync({...}); }`
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..', 'app');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile() && ent.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function transform(content) {
  const openLegacy =
    /export const metadata(?:: Metadata)? = buildPageMetadata\(\{/m;
  if (!openLegacy.test(content)) return null;

  let c = content.replace(
    /import \{ buildPageMetadata \} from ['"]@\/app\/seo['"];/g,
    "import { buildPageMetadataAsync } from '@/app/seo';"
  );

  c = c.replace(
    /export const metadata(?:: Metadata)? = buildPageMetadata\(\{/g,
    'export async function generateMetadata(): Promise<Metadata> {\n  return buildPageMetadataAsync({'
  );

  const idx = c.indexOf('return buildPageMetadataAsync({');
  if (idx === -1) return null;

  const start = c.indexOf('{', idx + 'return buildPageMetadataAsync('.length);
  if (start === -1) return null;

  let depth = 0;
  let i = start;
  for (; i < c.length; i++) {
    const ch = c[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        // closing `}` of object
        const rest = c.slice(i + 1).trimStart();
        if (!rest.startsWith(');')) return null;
        const closeParenSemi = c.indexOf(');', i + 1);
        if (closeParenSemi === -1) return null;
        const insertAt = closeParenSemi + 2;
        const before = c.slice(0, insertAt);
        const after = c.slice(insertAt);
        if (after.trimStart().startsWith('}')) return c; // already wrapped
        c = `${before}\n}${after}`;
        return c;
      }
    }
  }
  return null;
}

const files = walk(appDir);
let n = 0;
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  if (!raw.includes('buildPageMetadata')) continue;
  const next = transform(raw);
  if (next && next !== raw) {
    fs.writeFileSync(f, next, 'utf8');
    n++;
    console.log('updated', path.relative(path.join(__dirname, '..'), f));
  }
}
console.log('done', n);
