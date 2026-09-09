// @vitest-environment node
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';
import { PDF_DEPLOYMENT_RESULT_PREFIX, parsePdfDeploymentResult, pdfDeploymentAssets, verifyPdfDeploymentAssets } from '../scripts/verify-pdf-deployment.mjs';

const root = process.cwd();

async function configuredPdfAssets() {
  const files: string[] = [];
  for (const pattern of nextConfig.outputFileTracingIncludes?.['/api/**'] ?? []) {
    for await (const file of glob(pattern, { cwd: root })) files.push(path.join(root, file));
  }
  return pdfDeploymentAssets(files);
}

describe('PDF deployment packaging', () => {
  it('reads the tagged result when optional warnings arrive before and after it', () => {
    const result = { text: 'Synthetic PDF text' };
    const stdout = [
      'Warning: optional canvas dependency is unavailable',
      `${PDF_DEPLOYMENT_RESULT_PREFIX}${JSON.stringify(result)}`,
      'Warning: Unable to load optional font data',
      '',
    ].join('\r\n');
    expect(parsePdfDeploymentResult(stdout)).toEqual(result);
  });

  it.each([
    ['missing result', 'Warning: no tagged result\n{"text":"untagged"}\n'],
    ['duplicate results', `${PDF_DEPLOYMENT_RESULT_PREFIX}{"text":"one"}\n${PDF_DEPLOYMENT_RESULT_PREFIX}{"text":"two"}\n`],
    ['malformed JSON', `${PDF_DEPLOYMENT_RESULT_PREFIX}{invalid}\n`],
    ['null result', `${PDF_DEPLOYMENT_RESULT_PREFIX}null\n`],
    ['invalid text', `${PDF_DEPLOYMENT_RESULT_PREFIX}{"text":42}\n`],
  ])('rejects %s without accepting surrounding output as evidence', (_label, stdout) => {
    expect(() => parsePdfDeploymentResult(stdout)).toThrow();
  });

  it('extracts text with only the configured API PDF trace assets, outside the workspace', async () => {
    const assets = await configuredPdfAssets();
    const result = await verifyPdfDeploymentAssets(root, assets);
    expect(result.text).toBe('PDF Deployment Test Candidate SQL PostgreSQL Career Coaching');
  }, 30_000);

  it('rejects the synthetic PDF when the runtime worker asset is omitted', async () => {
    const assets = await configuredPdfAssets();
    const worker = 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
    expect(assets.some((asset: { relative: string }) => asset.relative === worker)).toBe(true);
    await expect(verifyPdfDeploymentAssets(root, assets.filter((asset: { relative: string }) => asset.relative !== worker)))
      .rejects.toMatchObject({ stderr: expect.stringContaining('invalid_pdf') });
  }, 30_000);
});
