import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('school apply variant', () => {
  const client = readFileSync(
    path.resolve(__dirname, '../../app/apply/ApplyEligibilityClient.tsx'),
    'utf-8',
  );
  const applyPage = readFileSync(path.resolve(__dirname, '../../app/apply/page.tsx'), 'utf-8');

  it('hides income questions when the school variant is active', () => {
    expect(client).toContain('const isSchool = Boolean(schoolApply)');
    expect(client).toContain('{!isSchool ? (');
    expect(client).toContain('className="funding-questions"');
    expect(client).toContain('guardianRequired = isSchool && ageGroup === \'under_18\'');
  });

  it('lets the school variant win over the paid UTM apply page', () => {
    expect(applyPage).toContain('if (paidUtmSource && !schoolApply)');
    expect(applyPage).toContain('schoolApply={schoolApply}');
  });
});
