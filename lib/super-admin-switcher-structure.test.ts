import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('super-admin switcher uses server-provided state where available', () => {
  const switcher = read('components/super-admin-view-switcher.tsx');
  const shell = read('components/portal/WorkspaceShell.tsx');
  const memberShell = read('components/portal/MemberWorkspaceShell.tsx');
  const counselorShell = read('components/portal/CounselorPortalShell.tsx');
  const memberLayout = read('app/(portal)/dashboard/layout.tsx');
  const counselorLayout = read('app/(portal)/counselor/layout.tsx');

  assert.match(switcher, /initialIsSuperAdmin\?: boolean/);
  assert.match(switcher, /const isSuperAdmin = initialIsSuperAdmin \|\| fetchedIsSuperAdmin/);
  assert.match(shell, /const isSuperAdmin = Boolean\(superAdmin\) \|\| fetchedIsSuperAdmin/);
  assert.equal((shell.match(/<SuperAdminViewSwitcher initialIsSuperAdmin=\{isSuperAdmin\} \/>/g) ?? []).length, 2);
  assert.match(memberShell, /superAdmin=\{superAdmin\}/);
  assert.match(counselorShell, /superAdmin=\{superAdmin\}/);
  assert.match(memberLayout, /isSuperAdmin\(user\.id\)/);
  assert.match(memberLayout, /<MemberWorkspaceShell[\s\S]*superAdmin=\{superAdmin\}[\s\S]*portalRoles=\{portalRoles\}/);
  assert.match(counselorLayout, /isSuperAdmin\(user\.id\)/);
  assert.match(counselorLayout, /<CounselorPortalShell[\s\S]*superAdmin=\{superAdmin\}[\s\S]*portalRoles=\{portalRoles\}/);
});
