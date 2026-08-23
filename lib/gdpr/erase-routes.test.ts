import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readRoute(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const GDPR_DELETE = 'app/api/gdpr/delete/route.ts';
const ADMIN_ERASE = 'app/api/admin/members/[id]/erase/route.ts';
const MEMBER_DELETE = 'app/api/member/delete-account/route.ts';

test('GDPR and account-delete routes delete storage objects before claiming success', () => {
  for (const rel of [GDPR_DELETE, ADMIN_ERASE, MEMBER_DELETE]) {
    const src = readRoute(rel);
    assert.match(src, /deleteUserStorageObjects/, `${rel} must call deleteUserStorageObjects`);
    assert.match(src, /ACCOUNT_STORAGE_DELETE_FAILED/, `${rel} must fail closed on blob delete`);
    assert.match(src, /status:\s*502/, `${rel} must return 502 when blobs remain`);
  }
});

test('storage delete runs before anonymize / auth delete on GDPR paths', () => {
  const gdpr = readRoute(GDPR_DELETE);
  assert.ok(
    gdpr.indexOf('await deleteUserStorageObjects') < gdpr.indexOf('Anonymize user record'),
    'gdpr/delete must remove blobs before nulling columns',
  );
  assert.ok(
    gdpr.indexOf('await deleteUserStorageObjects') < gdpr.indexOf('await deleteSupabaseAuthUser'),
    'gdpr/delete must remove blobs before auth delete',
  );

  const erase = readRoute(ADMIN_ERASE);
  assert.ok(
    erase.indexOf('await deleteUserStorageObjects') < erase.indexOf('shouldAnonymize'),
    'admin erase must remove blobs before anonymize/hard-delete',
  );

  const selfDelete = readRoute(MEMBER_DELETE);
  assert.ok(
    selfDelete.indexOf('await deleteUserStorageObjects') < selfDelete.indexOf('deletedAt: now'),
    'delete-account must remove blobs before soft-delete',
  );
});
