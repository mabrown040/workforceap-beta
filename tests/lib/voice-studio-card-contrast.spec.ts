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
  it('uses an explicit on-color badge treatment for saturated coach cards', () => {
    expect(voiceStudioSource).toContain(
      "className={isLightBody ? undefined : 'wa-voice-coach-badge--on-color'}",
    );
    expect(portalKitCss).toMatch(
      /\.wa-voice-coach-badge--on-color\s*\{[\s\S]*?color:\s*var\(--wa-on-accent\)\s*!important;[\s\S]*?background:\s*rgba\(0, 0, 0, 0\.3\)\s*!important;/,
    );
  });
});
