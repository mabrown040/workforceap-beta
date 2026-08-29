import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('employer Coursera completion display', () => {
  it('uses explicit COMPLETED status rather than a 100 percent shortcut', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'app/(portal)/employer/candidates/[studentId]/page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('row?.status === CourseProgressStatus.COMPLETED');
    expect(source).not.toMatch(/percentComplete[^\n]*>=\s*100/);
  });
});
