import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const resumeUploadSurfaces = [
  'app/(portal)/dashboard/resume/ResumeClient.tsx',
  'app/admin/members/new/AddMemberWizard.tsx',
  'components/admin/AdminResumeUpload.tsx',
  'components/portal/MobileProfileSkillsResume.tsx',
  'components/portal/ResumeMobileResumeTools.tsx',
  'components/portal/sessions/SessionRunClient.tsx',
  'components/portal/tools/GapAnalyzerForm.tsx',
  'components/portal/tools/JobMatchScorerForm.tsx',
  'components/portal/tools/ResumeRewriterForm.tsx',
  'components/portal/tools/ResumeStrengthForm.tsx',
  'lib/portal/memberResumeUpload.ts',
];

test('resume upload surfaces do not advertise or accept legacy DOC files', () => {
  for (const relativePath of resumeUploadSurfaces) {
    const source = readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert.doesNotMatch(source, /\.pdf,\.doc,/, `${relativePath} still accepts legacy .doc`);
    assert.doesNotMatch(source, /\.docx,\.doc,/, `${relativePath} still accepts legacy .doc`);
    assert.doesNotMatch(source, /\['pdf',\s*'doc'/, `${relativePath} still validates legacy .doc as supported`);
    assert.doesNotMatch(source, /\bPDF,\s*DOC,?\b/, `${relativePath} still advertises legacy DOC`);
  }
});

test('member creation redirects partial resume failures to the created member instead of inviting a duplicate retry', () => {
  const wizardSource = readFileSync(
    path.join(repoRoot, 'app/admin/members/new/AddMemberWizard.tsx'),
    'utf8',
  );
  const toastSource = readFileSync(
    path.join(repoRoot, 'app/admin/members/[id]/CreateSuccessToast.tsx'),
    'utf8',
  );

  assert.match(wizardSource, /if \(!uploadRes\.ok\)/);
  assert.match(wizardSource, /toast:\s*resumeUploadError \|\| fundingSetupError \|\| welcomeEmailError \? 'created-with-warnings'/);
  assert.match(wizardSource, /params\.set\('resumeError'/);
  assert.match(toastSource, /Resume was not attached:/);
  assert.match(toastSource, /do not create the member again/i);
  assert.match(toastSource, /welcomeError/);
});
