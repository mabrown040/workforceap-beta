import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import MobileStateANextStepCard from '@/app/(portal)/dashboard/_components/MobileStateANextStepCard';
import type { DashboardTranslator } from '@/app/(portal)/dashboard/_components/types';

/**
 * The member dashboard's white CTA pills keep `background: #fff` in both
 * colour modes. Their label used to be `var(--color-accent)`, which is
 * #ad2c4d in light mode (6.5:1) but #e0658a in dark mode — 3.28:1 on the
 * still-white pill. A white pill's label must be a fixed colour that clears
 * WCAG AA on white.
 */

const root = path.resolve(__dirname, '../..');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** jsdom serialises inline hex colours as `rgb(r, g, b)`; a `var()` stays as written. */
function cssColorToHex(value: string): string | null {
  const m = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m) return '#' + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  return hex ? `#${hex[1].toLowerCase()}` : null;
}

const t = ((key: string) => key) as unknown as DashboardTranslator;

describe('mobile State A next-step pill', () => {
  it('pairs the white pill with a fixed label colour that clears 4.5:1', () => {
    const { getByText } = render(<MobileStateANextStepCard t={t} noApplicationOnFile />);
    const pill = getByText('startApplication').parentElement as HTMLElement;

    const bg = cssColorToHex(pill.style.background || pill.style.backgroundColor);
    const fg = cssColorToHex(pill.style.color);
    expect(bg).toBe('#ffffff');
    expect(fg, `pill label colour "${pill.style.color}" must be a fixed hex, not a mode-flipping token`).not.toBeNull();
    expect(contrast(fg as string, bg as string)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('certifications page "Earn More Credentials" pill', () => {
  it('does not pair a white pill with the mode-flipping accent token', () => {
    const source = readFileSync(path.join(root, 'app/(portal)/dashboard/certifications/page.tsx'), 'utf8');
    const whitePills = [...source.matchAll(/background:\s*'#fff',[\s\S]{0,400}?color:\s*'([^']+)'/g)];
    expect(whitePills.length).toBeGreaterThan(0);
    for (const [, color] of whitePills) {
      expect(color).not.toMatch(/var\(--color-accent\)|var\(--wa-accent\)/);
      const hex = cssColorToHex(color);
      expect(hex, `white pill label "${color}" must be a fixed hex`).not.toBeNull();
      expect(contrast(hex as string, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    }
  });
});
