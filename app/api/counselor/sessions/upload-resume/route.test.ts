import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const routeSource = readFileSync(fileURLToPath(new URL('./route.ts', import.meta.url)), 'utf8');

test('upload-resume authorizes act-on-behalf before tenant lookup or writes', () => {
  const authIndex = routeSource.indexOf('await resolveActOnBehalf(user.id, memberId)');
  const guardIndex = routeSource.indexOf('if (!onBehalf.ok)');
  const subjectIndex = routeSource.indexOf('const authorizedMemberId = onBehalf.subjectUserId');
  const orgIndex = routeSource.indexOf('await getSubjectOrganizationId(authorizedMemberId)');
  const storagePathIndex = routeSource.indexOf('const path = `${authorizedMemberId}/resume-original.${ext}`');
  const profileWhereIndex = routeSource.indexOf('where: { userId: authorizedMemberId }');

  assert.notEqual(authIndex, -1);
  assert.notEqual(guardIndex, -1);
  assert.notEqual(subjectIndex, -1);
  assert.notEqual(orgIndex, -1);
  assert.notEqual(storagePathIndex, -1);
  assert.notEqual(profileWhereIndex, -1);

  assert.ok(authIndex < guardIndex);
  assert.ok(guardIndex < subjectIndex);
  assert.ok(subjectIndex < orgIndex);
  assert.ok(subjectIndex < storagePathIndex);
  assert.ok(subjectIndex < profileWhereIndex);
});
