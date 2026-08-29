import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin overview program completion metric', () => {
  it('counts only non-empty programs whose completed-course X exactly equals Y', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', 'admin', 'overview', 'page.tsx'),
      'utf8',
    );

    expect(source).toContain(
      '.filter((row) => row.totalCourses > 0 && row.completedCount === row.totalCourses)',
    );
    expect(source).not.toMatch(/progressPercent\s*>=\s*100/);
    expect(source).not.toMatch(/completedCount\s*>=\s*row\.totalCourses/);
  });
});
