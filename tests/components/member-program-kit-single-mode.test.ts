import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('member program page client tree', () => {
  const pageSource = readFileSync(
    path.resolve(__dirname, '../../app/(portal)/dashboard/program/page.tsx'),
    'utf-8',
  );
  const kitSource = readFileSync(
    path.resolve(__dirname, '../../components/portal/kit/pages/member/MemberProgramKit.tsx'),
    'utf-8',
  );

  it('keeps MemberProgramKit single-mode (no early return to workspace)', () => {
    expect(kitSource).not.toMatch(/trainingWorkspace\??:/);
    expect(kitSource).not.toMatch(/if\s*\(\s*trainingWorkspace\s*\)\s*return/);
    expect(kitSource).not.toMatch(/import\s*\{[^}]*MemberTrainingWorkspace/);
  });

  it('lets the server page choose workspace vs progress kit', () => {
    expect(pageSource).toContain('MemberTrainingWorkspace');
    expect(pageSource).toContain('MemberProgramKit');
    expect(pageSource).toContain('if (workspaceResult.workspace)');
  });
});
