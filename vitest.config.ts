import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'tests/**/*.spec.ts',
      'tests/**/*.test.ts',
      'tests/**/*.spec.tsx',
      'tests/**/*.test.tsx',
      'lib/**/*.test.ts',
      'components/**/*.test.tsx',
      // Colocated vitest route specs. Listed individually (not app/**) so the
      // node:test-runner files under app/ (e.g. app/api/employer/signup/route.test.ts)
      // are not collected by vitest.
      'app/api/apply/signup/route.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      // Playwright suites — they need a running app and the Playwright
      // runner; vitest collecting them only produces phantom failures.
      'tests/e2e/**',
      // node:test-runner files run via `npm run test:unit` (scripts/test-unit.mjs);
      // vitest cannot bundle the node:test built-in.
      'lib/**/*.test.ts',
    ],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'server-only': path.resolve(__dirname, 'tests/empty-module.cjs'),
    },
  },
});
