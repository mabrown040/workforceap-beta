import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('Sentry client hydration noise filter', () => {
  const source = readFileSync(path.resolve(__dirname, '../instrumentation-client.ts'), 'utf-8');

  it('drops extension style-attribute hydration replays', () => {
    expect(source).toContain('isExtensionStyleHydrationNoise');
    expect(source).toContain('caret-color');
    expect(source).toContain('beforeSend(event)');
  });
});
