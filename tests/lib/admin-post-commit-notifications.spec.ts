import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const source = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('admin post-commit notification contracts', () => {
  it('returns success-with-warning after job state commits even when email or cache refresh fails', () => {
    for (const file of [
      'app/api/admin/jobs/[id]/approve/route.ts',
      'app/api/admin/jobs/[id]/reject/route.ts',
    ]) {
      const route = source(file);
      expect(route).toContain('notificationEmailSent');
      expect(route).toContain('cacheInvalidated');
      expect(route).toContain('warning: warnings.length > 0');
    }
  });

  it('shows server warnings instead of inviting a duplicate job action', () => {
    const review = source('components/admin/AdminJobReview.tsx');
    expect(review).toContain("type: data.warning ? 'warning' : 'success'");
    expect(review).toContain("data.warning ?? 'Job approved.'");
    expect(review).toContain("data.warning ?? 'Job rejected.'");
  });
});
