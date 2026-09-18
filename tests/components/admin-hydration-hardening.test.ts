import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('admin / portal hydration hardening', () => {
  const adminLayout = readFileSync(path.resolve(__dirname, '../../app/admin/layout.tsx'), 'utf-8');
  const portalLayout = readFileSync(
    path.resolve(__dirname, '../../app/(portal)/layout.tsx'),
    'utf-8',
  );
  const branding = readFileSync(
    path.resolve(__dirname, '../../components/platform/OrgBrandingBar.tsx'),
    'utf-8',
  );
  const notice = readFileSync(
    path.resolve(__dirname, '../../components/portal/LegacyViewNotice.tsx'),
    'utf-8',
  );
  const portalCss = readFileSync(path.resolve(__dirname, '../../css/portal.css'), 'utf-8');

  it('wraps LegacyViewNotice in Suspense for useSearchParams', () => {
    expect(adminLayout).toMatch(/Suspense[\s\S]*LegacyViewNotice/);
    expect(portalLayout).toMatch(/Suspense[\s\S]*LegacyViewNotice/);
  });

  it('keeps branding/legacy notice styles in CSS classes, not inline style objects', () => {
    expect(branding).toContain('org-branding-bar');
    expect(branding).not.toMatch(/style=\{\{/);
    expect(notice).toContain('legacy-view-notice');
    expect(notice).not.toMatch(/style=\{\{/);
    expect(portalCss).toContain('.org-branding-bar');
    expect(portalCss).toContain('.legacy-view-notice');
  });
});
