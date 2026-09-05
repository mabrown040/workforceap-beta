// @vitest-environment node
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';
import { pdfDeploymentAssets, verifyPdfDeploymentAssets } from '../scripts/verify-pdf-deployment.mjs';

const root = process.cwd();

async function configuredPdfAssets() {
  const files: string[] = [];
  for (const pattern of nextConfig.outputFileTracingIncludes?.['/api/**'] ?? []) {
    for await (const file of glob(pattern, { cwd: root })) files.push(path.join(root, file));
  }
  return pdfDeploymentAssets(files);
}

describe('PDF deployment packaging', () => {
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
