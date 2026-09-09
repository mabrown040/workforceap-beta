import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': process.cwd(), 'server-only': path.resolve('tests/empty-module.cjs') } },
  test: { environment: 'node', include: ['graph/evidence/secrets-run_20260909_1730.test.ts'] },
});
