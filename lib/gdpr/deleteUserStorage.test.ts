import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCOUNT_STORAGE_DELETE_FAILED,
  MEMBER_FILES_BUCKET,
  MEMBER_RESUME_BUCKET,
  MEMBER_STORAGE_PREFIXES,
  deleteUserStorageObjects,
  parseMemberStoragePath,
  type MemberStorageAdmin,
  type StorageListItem,
} from './deleteUserStorage';

type ListCall = { bucket: string; path?: string; offset?: number };
type RemoveCall = { bucket: string; paths: string[] };

function makeAdmin(opts: {
  listings: Record<string, StorageListItem[] | { error: { message: string } }>;
  removeError?: { message: string } | null;
}): { admin: MemberStorageAdmin; lists: ListCall[]; removes: RemoveCall[] } {
  const lists: ListCall[] = [];
  const removes: RemoveCall[] = [];

  const admin: MemberStorageAdmin = {
    storage: {
      from(bucket: string) {
        return {
          async list(path?: string, options?: { limit?: number; offset?: number }) {
            lists.push({ bucket, path, offset: options?.offset });
            const key = `${bucket}:${path ?? ''}`;
            const entry = opts.listings[key];
            if (entry && 'error' in entry) return { data: null, error: entry.error };
            return { data: (entry as StorageListItem[] | undefined) ?? [], error: null };
          },
          async remove(paths: string[]) {
            removes.push({ bucket, paths });
            return { data: paths, error: opts.removeError ?? null };
          },
        };
      },
    },
  };

  return { admin, lists, removes };
}

test('parseMemberStoragePath keeps object keys and extracts signed URLs', () => {
  assert.equal(parseMemberStoragePath('user-1/resume-original.pdf'), 'user-1/resume-original.pdf');
  assert.equal(
    parseMemberStoragePath(
      'https://xyz.supabase.co/storage/v1/object/sign/member-resumes/user-1/resume-original.pdf?token=abc',
    ),
    'user-1/resume-original.pdf',
  );
  assert.equal(parseMemberStoragePath('https://example.com/not-storage'), null);
  assert.equal(parseMemberStoragePath('../escape'), null);
  assert.equal(parseMemberStoragePath(null), null);
});

test('deleteUserStorageObjects lists both member buckets and removes leftovers', async () => {
  const userId = 'user-123';
  const { admin, removes } = makeAdmin({
    listings: {
      [`${MEMBER_RESUME_BUCKET}:${userId}`]: [
        { name: 'resume-original.pdf', id: 'file-1' },
        { name: 'voice-interview-recordings', id: null },
      ],
      [`${MEMBER_RESUME_BUCKET}:${userId}/voice-interview-recordings`]: [
        { name: 'abc.webm', id: 'file-2' },
      ],
      [`${MEMBER_FILES_BUCKET}:cert-files/${userId}`]: [
        { name: 'cert-1.pdf', id: 'file-3' },
      ],
    },
  });

  const result = await deleteUserStorageObjects(userId, { supabaseAdmin: admin });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.deleted.map((row) => `${row.bucket}:${row.path}`).sort(),
    [
      `${MEMBER_FILES_BUCKET}:cert-files/${userId}/cert-1.pdf`,
      `${MEMBER_RESUME_BUCKET}:${userId}/resume-original.pdf`,
      `${MEMBER_RESUME_BUCKET}:${userId}/voice-interview-recordings/abc.webm`,
    ],
  );
  assert.equal(removes.length, 2);
});

test('deleteUserStorageObjects also removes extra known column paths', async () => {
  const userId = 'user-123';
  const { admin, removes } = makeAdmin({ listings: {} });

  const result = await deleteUserStorageObjects(userId, {
    supabaseAdmin: admin,
    extraPaths: [
      { bucket: MEMBER_RESUME_BUCKET, path: `${userId}/resume-enhanced.txt` },
      { bucket: MEMBER_FILES_BUCKET, path: `cert-files/${userId}/old.png` },
    ],
  });

  assert.equal(result.ok, true);
  const removed = removes.flatMap((call) => call.paths.map((path) => `${call.bucket}:${path}`)).sort();
  assert.deepEqual(removed, [
    `${MEMBER_FILES_BUCKET}:cert-files/${userId}/old.png`,
    `${MEMBER_RESUME_BUCKET}:${userId}/resume-enhanced.txt`,
  ]);
});

test('deleteUserStorageObjects fails closed when listing fails', async () => {
  const { admin, removes } = makeAdmin({
    listings: {
      [`${MEMBER_RESUME_BUCKET}:user-123`]: { error: { message: 'storage timeout' } },
    },
  });

  const result = await deleteUserStorageObjects('user-123', { supabaseAdmin: admin });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /storage timeout/);
  assert.equal(removes.length, 0);
});

test('deleteUserStorageObjects fails closed when remove fails', async () => {
  const { admin } = makeAdmin({
    listings: {
      [`${MEMBER_RESUME_BUCKET}:user-123`]: [{ name: 'resume-original.pdf', id: 'file-1' }],
    },
    removeError: { message: 'permission denied' },
  });

  const result = await deleteUserStorageObjects('user-123', { supabaseAdmin: admin });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /permission denied/);
});

test('deleteUserStorageObjects treats missing buckets as nothing to delete', async () => {
  const { admin, removes } = makeAdmin({
    listings: {
      [`${MEMBER_RESUME_BUCKET}:user-123`]: { error: { message: 'Bucket not found' } },
      [`${MEMBER_FILES_BUCKET}:cert-files/user-123`]: { error: { message: 'The resource was not found' } },
    },
  });

  const result = await deleteUserStorageObjects('user-123', { supabaseAdmin: admin });

  assert.equal(result.ok, true);
  assert.deepEqual(result.deleted, []);
  assert.equal(removes.length, 0);
});

test('deleteUserStorageObjects rejects path-traversal user ids', async () => {
  const { admin, lists } = makeAdmin({ listings: {} });
  const result = await deleteUserStorageObjects('../etc', { supabaseAdmin: admin });
  assert.equal(result.ok, false);
  assert.equal(lists.length, 0);
});

test('member storage prefixes cover both upload buckets', () => {
  assert.deepEqual(
    MEMBER_STORAGE_PREFIXES.map((row) => row.bucket),
    [MEMBER_RESUME_BUCKET, MEMBER_FILES_BUCKET],
  );
  assert.equal(ACCOUNT_STORAGE_DELETE_FAILED.includes('not erased'), true);
});
