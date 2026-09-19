import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const extracted = readFileSync(join(process.cwd(), 'css/portal-main-extracted.css'), 'utf8');
const main = readFileSync(join(process.cwd(), 'css/main.css'), 'utf8');

describe('Learning Hub course title wrap', () => {
  it('does not use overflow-wrap:anywhere on course titles', () => {
    expect(extracted).toMatch(/\.training-course-card__title\s*\{[^}]*overflow-wrap:\s*break-word/);
    expect(extracted).not.toMatch(/\.training-course-card__title\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(main).toMatch(/\.training-course-card__title\s*\{[^}]*overflow-wrap:\s*break-word/);
  });

  it('keeps a real min-width on the title column so tablet cannot collapse to 1ch', () => {
    expect(extracted).toMatch(
      /\.training-course-card\s*\{[^}]*grid-template-columns:\s*minmax\(12rem, 1fr\) minmax\(0, 18rem\)/,
    );
    expect(extracted).toMatch(/@media \(max-width: 1100px\)[\s\S]{0,200}\.training-course-card\s*\{[\s\S]{0,120}grid-template-columns:\s*minmax\(0, 1fr\)/);
  });
});
