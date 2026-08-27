import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const challengeSource = readFileSync(
  path.join(root, 'components/portal/SkillMissionChallenge.tsx'),
  'utf8',
);

describe('Skill mission challenge kit tokens', () => {
  it('does not reference legacy --color-* or --surface-container-* tokens', () => {
    expect(challengeSource).not.toMatch(/--color-/);
    expect(challengeSource).not.toMatch(/--surface-container/);
    expect(challengeSource).not.toMatch(/--outline-variant/);
  });
});
