import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  LEGACY_TRAINING_STUB_HREF,
  MEMBER_PROGRAM_HREF,
  resolveMemberProgramHref,
} from './memberProgramHref';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('resolveMemberProgramHref sends the dead training stub to My Program', () => {
  assert.equal(resolveMemberProgramHref(LEGACY_TRAINING_STUB_HREF), MEMBER_PROGRAM_HREF);
  assert.equal(resolveMemberProgramHref('/dashboard/training'), '/dashboard/program');
  assert.equal(resolveMemberProgramHref(null), '/dashboard/program');
  assert.equal(resolveMemberProgramHref(undefined), '/dashboard/program');
  assert.equal(resolveMemberProgramHref(''), '/dashboard/program');
});

test('resolveMemberProgramHref preserves ?program= and ?error= on the rewrite', () => {
  assert.equal(
    resolveMemberProgramHref('/dashboard/training?program=google-it-support'),
    '/dashboard/program?program=google-it-support',
  );
  assert.equal(
    resolveMemberProgramHref('/dashboard/training?error=launch_failed'),
    '/dashboard/program?error=launch_failed',
  );
});

test('resolveMemberProgramHref leaves real destinations alone', () => {
  assert.equal(resolveMemberProgramHref('/dashboard/program'), '/dashboard/program');
  assert.equal(resolveMemberProgramHref('/dashboard/learning'), '/dashboard/learning');
  assert.equal(
    resolveMemberProgramHref('/dashboard/program?program=google-it-support'),
    '/dashboard/program?program=google-it-support',
  );
});

test('Resume module kit CTA rewrites the training stub instead of rendering it', () => {
  const home = readFileSync(
    path.join(ROOT, 'components/portal/kit/pages/member/MemberHomeKit.tsx'),
    'utf8',
  );
  const doThisNext = readFileSync(
    path.join(ROOT, 'components/portal/MemberDoThisNextCard.tsx'),
    'utf8',
  );
  assert.match(home, /resolveMemberProgramHref\(resumeHref\)/);
  assert.match(home, /Resume module/);
  assert.match(home, /wa-kit-cert-path/);
  assert.match(home, /lg:wa-col-span-4 wa-min-w-0/);
  assert.doesNotMatch(home, /href=\{resumeHref \?\? ['"]\/dashboard\/program['"]\}/);
  assert.match(doThisNext, /resolveMemberProgramHref\(action\.href\)/);
});
