import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');

describe('protected page login redirect contract', () => {
  it('uses the redirectTo parameter consumed by the login page', () => {
    for (const file of [
      'app/admin/analytics/page.tsx',
      'app/admin/outcomes/page.tsx',
      'app/employer/outcomes/page.tsx',
    ]) {
      const source = readFileSync(path.join(root, file), 'utf8');
      expect(source).toContain('/login?redirectTo=');
      expect(source).not.toContain('/login?redirect=');
    }

    const login = readFileSync(path.join(root, 'app/(auth)/login/page.tsx'), 'utf8');
    expect(login).toContain('sp?.redirectTo');
  });

  it('keeps partner next actions from looping to the current dashboard', () => {
    const partner = readFileSync(path.join(root, 'app/(portal)/partner/page.tsx'), 'utf8');
    expect(partner).toContain("href: '/partner/attention?tier=all'");
    expect(partner).toContain("href: '/partner/referred-members'");
    expect(partner).not.toContain("nextActionEncourageTraining', { count: inTraining }), href: '/partner'");
  });
});
