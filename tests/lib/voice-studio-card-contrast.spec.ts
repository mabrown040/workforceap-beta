import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const voiceStudioSource = readFileSync(
  path.join(root, 'components/portal/kit/pages/VoiceStudioKit.tsx'),
  'utf8',
);
const portalKitCss = readFileSync(path.join(root, 'css/portal-kit.css'), 'utf8');

describe('Voice Studio coach-card badge contrast', () => {
  it('uses a component-owned on-color badge without specificity overrides', () => {
    expect(voiceStudioSource).toContain(
      '<span className="wa-voice-coach-badge--on-color">{badge}</span>',
    );

    const rule = portalKitCss.match(/\.wa-voice-coach-badge--on-color\s*\{([^}]*)\}/)?.[1];
    expect(rule).toBeTruthy();
    expect(rule).toContain('color: var(--wa-on-accent)');
    expect(rule).toContain('background: rgba(0, 0, 0, 0.45)');
    expect(rule).not.toContain('!important');
  });

  it('keeps white badge text above WCAG AA on every saturated card color', () => {
    const luminance = ([r, g, b]: number[]) => {
      const channels = [r, g, b].map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const blendOverBlack = ([r, g, b]: number[], blackAlpha: number) => [
      r * (1 - blackAlpha),
      g * (1 - blackAlpha),
      b * (1 - blackAlpha),
    ];
    const contrastWithWhite = (background: number[]) =>
      (luminance([255, 255, 255]) + 0.05) / (luminance(background) + 0.05);

    const cardColors = [
      [164, 127, 56], // light gold
      [212, 173, 90], // dark-mode gold (lightest/worst case)
      [173, 44, 77], // light crimson
      [224, 101, 138], // dark-mode crimson
    ];

    for (const color of cardColors) {
      expect(contrastWithWhite(blendOverBlack(color, 0.45))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
