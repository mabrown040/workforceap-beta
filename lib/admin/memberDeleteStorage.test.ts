import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ADMIN_MEMBER_DELETE = 'app/api/admin/members/[id]/delete/route.ts';

function readRoute(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('admin member soft-delete removes storage objects before claiming success', () => {
  const src = readRoute(ADMIN_MEMBER_DELETE);
  assert.match(src, /deleteUserStorageObjects/, 'must call deleteUserStorageObjects');
  assert.match(src, /ACCOUNT_STORAGE_DELETE_FAILED/, 'must fail closed on blob delete');
  assert.match(src, /status:\s*502/, 'must return 502 when blobs remain');
  assert.match(src, /MEMBER_RESUME_BUCKET/, 'must pass resume extraPaths');
  assert.match(src, /MEMBER_FILES_BUCKET/, 'must pass cert-file extraPaths');
});

test('admin member storage delete runs before the Prisma soft-delete write', () => {
  const src = readRoute(ADMIN_MEMBER_DELETE);
  assert.ok(
    src.indexOf('await deleteUserStorageObjects') < src.indexOf('deletedAt: now'),
    'must remove blobs before rewriting deletedAt / email',
  );
  // Soft delete now bans the auth user (lib/admin/authUserLifecycle.ts) instead
  // of hard-deleting it, so restore can re-enable sign-in.
  assert.ok(src.indexOf('disableAuthUserForSoftDelete(') > -1, 'must lock the auth user, not delete it');
  assert.ok(
    src.indexOf('await deleteUserStorageObjects') < src.indexOf('disableAuthUserForSoftDelete('),
    'must remove blobs before locking the auth user',
  );
  assert.equal(src.includes('auth.admin.deleteUser'), false, 'soft delete must not hard-delete the auth user');
});
