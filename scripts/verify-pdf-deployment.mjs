import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import ts from 'typescript';

const execFileAsync = promisify(execFile);
const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_TEXT = 'PDF Deployment Test Candidate SQL PostgreSQL Career Coaching';
const PDF_PACKAGE = '/node_modules/pdfjs-dist/';

/** No member data, external resources, or network access is needed for this fixture. */
function syntheticPdf() {
  const stream = `BT /F1 12 Tf 50 740 Td (${EXPECTED_TEXT}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf);
}

/** Keep only actual PDF assets selected by a config include or emitted NFT trace. */
export function pdfDeploymentAssets(files) {
  return files.flatMap((source) => {
    const normalized = path.resolve(source).replaceAll('\\', '/');
    const packageOffset = normalized.lastIndexOf(PDF_PACKAGE);
    if (packageOffset < 0) return [];
    return [{ source, relative: normalized.slice(packageOffset + 1) }];
  });
}

/**
 * Exercise the unchanged production extractor with only the selected PDF assets.
 * Transpilation supplies the app helper, not any missing package dependency. The
 * subprocess runs outside the checkout with no inherited Node loader or NODE_PATH.
 * This verifies parser packaging, not authenticated upload/storage/provider behavior.
 */
export async function verifyPdfDeploymentAssets(root, assets) {
  const temporaryParent = path.resolve(tmpdir());
  const artifact = await mkdtemp(path.join(temporaryParent, 'workforceap-pdf-deployment-'));
  try {
    for (const { source, relative } of assets) {
      const destination = path.resolve(artifact, relative);
      assert.ok(destination.startsWith(`${artifact}${path.sep}`), 'PDF asset must stay in the temporary artifact');
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }
    for (const name of ['extractTextFromResumeBuffer', 'extractionQuality']) {
      const source = await readFile(path.join(root, 'lib/resume', `${name}.ts`), 'utf8');
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      });
      await writeFile(path.join(artifact, `${name}.js`), outputText);
    }
    await writeFile(path.join(artifact, 'package.json'), '{"type":"commonjs"}\n');
    await writeFile(path.join(artifact, 'synthetic-resume.pdf'), syntheticPdf());
    const runner = String.raw`
      const assert = require('node:assert/strict');
      const path = require('node:path');
      const { readFileSync } = require('node:fs');
      const entry = require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
      assert.ok(entry.startsWith(process.cwd() + path.sep), 'Resolved outside the isolated PDF artifact');
      const { extractTextFromResumeBuffer } = require('./extractTextFromResumeBuffer.js');
      extractTextFromResumeBuffer(readFileSync('synthetic-resume.pdf'), 'pdf')
        .then((text) => process.stdout.write(JSON.stringify({ text }) + '\n'))
        .catch((error) => { console.error(error.code || error.message); process.exitCode = 1; });
    `;
    const { stdout } = await execFileAsync(process.execPath, ['--no-global-search-paths', '--eval', runner], {
      cwd: artifact,
      timeout: 30_000,
      // No application credentials or inherited test loaders reach the subprocess.
      env: { SystemRoot: process.env.SystemRoot ?? '', NODE_PATH: '', NODE_OPTIONS: '' },
    });
    // pdf.js may write optional canvas/font warnings before the final JSON result.
    const result = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
    assert.equal(result.text.trim(), EXPECTED_TEXT);
    return { text: result.text.trim(), assetCount: assets.length };
  } finally {
    assert.equal(path.dirname(artifact), temporaryParent);
    assert.ok(path.basename(artifact).startsWith('workforceap-pdf-deployment-'));
    await rm(artifact, { recursive: true, force: true });
  }
}

const DEFAULT_ROUTES = [
  'api/member/resume/upload',
  'api/member/resume/plain-text',
  'api/admin/members/[id]/upload-resume',
  'api/counselor/sessions/upload-resume',
  'api/ai/extract-resume-text',
  'api/member/resume-coach/session',
];

/** Run after `pnpm run build:local`; optional first argument is a build checkout. */
async function main() {
  const root = path.resolve(process.argv[2] ?? SCRIPT_ROOT);
  for (const route of DEFAULT_ROUTES) {
    const manifestPath = path.join(root, '.next/server/app', route, 'route.js.nft.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const assets = pdfDeploymentAssets(manifest.files.map((file) => path.resolve(path.dirname(manifestPath), file)));
    let assetCount;
    try {
      ({ assetCount } = await verifyPdfDeploymentAssets(root, assets));
    } catch (error) {
      throw new Error(`${route}: ${error.stderr?.trim() || error.message}`, { cause: error });
    }
    console.log(`PASS ${route}: extracted synthetic PDF with ${assetCount} traced PDF assets`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('PDF deployment verification failed:', error.message);
    process.exitCode = 1;
  });
}
