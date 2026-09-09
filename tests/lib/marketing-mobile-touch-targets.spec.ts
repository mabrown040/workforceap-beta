import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const blendCss = readFileSync(path.join(root, 'marketing/src/styles/blend.css'), 'utf8');
const homeSource = readFileSync(path.join(root, 'marketing/src/pages/index.astro'), 'utf8');
const consentSource = readFileSync(
  path.join(root, 'marketing/src/components/ConsentBanner.astro'),
  'utf8',
);

describe('marketing mobile touch targets', () => {
  it('keeps logo, footer navigation, audience links, and Donate at least 44px tall', () => {
    expect(blendCss).toMatch(/\.brand\{[^}]*min-height:44px/);
    expect(blendCss).toMatch(
      /footer li a,\.flegal a\{display:inline-flex;align-items:center;min-width:44px;min-height:44px;/,
    );
    expect(homeSource).toMatch(/\.tlink\{[^}]*min-height:44px/);
    expect(homeSource).toMatch(/\.pill--donate\{min-height:44px;/);
    expect(consentSource).toMatch(
      /\.consent__copy a\{display:inline-flex;align-items:center;min-height:44px;/,
    );
  });
});
