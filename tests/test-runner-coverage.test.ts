// @vitest-environment node
import { glob, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import config from '../vitest.config';
import { VITEST_LIBRARY_SPECS } from '../scripts/vitest-library-specs.mjs';

describe('library test runner ownership', () => {
  it('registers every library suite that imports Vitest exactly once', async () => {
    const discovered: string[] = [];
    for await (const file of glob('lib/**/*.test.ts')) {
      const source = await readFile(file, 'utf8');
      if (/from\s+['"]vitest['"]|require\(['"]vitest['"]\)/.test(source)) {
        discovered.push(file.replaceAll('\\', '/'));
      }
    }
    expect([...VITEST_LIBRARY_SPECS].sort()).toEqual(discovered.sort());
    expect(new Set(VITEST_LIBRARY_SPECS).size).toBe(VITEST_LIBRARY_SPECS.length);
  });

  it('collects every registered suite with the actual Vitest include/exclude rules', async () => {
    const collected = new Set<string>();
    for await (const file of glob(config.test?.include ?? [], { exclude: config.test?.exclude ?? [] })) {
      collected.add(file.replaceAll('\\', '/'));
    }
    const missing = VITEST_LIBRARY_SPECS.filter((file) => !collected.has(file));
    expect(missing, 'Suites delegated by the Node runner must be collected by Vitest').toEqual([]);
    const libraryFiles = [...collected].filter((file) => file.startsWith('lib/')).sort();
    expect(libraryFiles, 'Do not collect node:test library suites in Vitest').toEqual(
      [...VITEST_LIBRARY_SPECS].sort(),
    );
  });
});
