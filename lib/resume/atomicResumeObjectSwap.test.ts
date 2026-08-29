import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AtomicResumeObjectSwapError,
  isApplicationResumeSnapshotPath,
  isLegacyResumeProfilePath,
  replaceResumeObjectsAtomically,
  type ResumeProfilePaths,
} from './atomicResumeObjectSwap';

const ORIGINAL_BODY = new ArrayBuffer(8);

function versionSequence(...versions: string[]): () => string {
  let index = 0;
  return () => versions[index++] ?? `extra-${index}`;
}

test('rolls back the first staged object when an admin two-part second upload fails', async () => {
  const uploads: Array<{ path: string; upsert: boolean }> = [];
  const removals: string[][] = [];
  let persistCalls = 0;

  await assert.rejects(
    replaceResumeObjectsAtomically({
      userId: 'member-1',
      uploads: [
        {
          field: 'resumeOriginalPath',
          extension: 'pdf',
          contentType: 'application/pdf',
          body: ORIGINAL_BODY,
        },
        {
          field: 'resumeEnhancedPath',
          extension: 'txt',
          contentType: 'text/plain',
          body: 'A substantive enhanced resume with skills and work history.',
        },
      ],
      makeVersionId: versionSequence('original-v1', 'enhanced-v1'),
      uploadObject: async (path, _body, options) => {
        uploads.push({ path, upsert: options.upsert });
        return {
          error: path.includes('resume-enhanced') ? new Error('second upload failed') : null,
        };
      },
      removeObjects: async (paths) => {
        removals.push(paths);
        return { error: null };
      },
      swapProfilePaths: async () => {
        persistCalls += 1;
        return {};
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AtomicResumeObjectSwapError);
      assert.equal(error.phase, 'upload');
      assert.equal(error.field, 'resumeEnhancedPath');
      return true;
    },
  );

  assert.deepEqual(uploads, [
    { path: 'member-1/resume-original-original-v1.pdf', upsert: false },
    { path: 'member-1/resume-enhanced-enhanced-v1.txt', upsert: false },
  ]);
  assert.deepEqual(removals, [['member-1/resume-original-original-v1.pdf']]);
  assert.equal(persistCalls, 0);
});

test('rolls back every staged object when the profile transaction fails', async () => {
  const removals: string[][] = [];
  let persistedPaths: ResumeProfilePaths | null = null;

  await assert.rejects(
    replaceResumeObjectsAtomically({
      userId: 'member-2',
      uploads: [
        {
          field: 'resumeOriginalPath',
          extension: 'docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          body: ORIGINAL_BODY,
        },
        {
          field: 'resumeEnhancedPath',
          extension: 'txt',
          contentType: 'text/plain',
          body: 'Substantive enhanced resume content for the failure test.',
        },
      ],
      makeVersionId: versionSequence('original-v2', 'enhanced-v2'),
      uploadObject: async () => ({ error: null }),
      removeObjects: async (paths) => {
        removals.push(paths);
        return { error: null };
      },
      swapProfilePaths: async (nextPaths) => {
        persistedPaths = nextPaths;
        throw new Error('database unavailable');
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AtomicResumeObjectSwapError);
      assert.equal(error.phase, 'persist');
      return true;
    },
  );

  assert.deepEqual(persistedPaths, {
    resumeOriginalPath: 'member-2/resume-original-original-v2.docx',
    resumeEnhancedPath: 'member-2/resume-enhanced-enhanced-v2.txt',
  });
  assert.deepEqual(removals, [[
    'member-2/resume-original-original-v2.docx',
    'member-2/resume-enhanced-enhanced-v2.txt',
  ]]);
});

test('swaps profile pointers and retires only replaced profile objects', async () => {
  const events: string[] = [];
  let persistedPaths: ResumeProfilePaths | null = null;

  const result = await replaceResumeObjectsAtomically({
    userId: 'member-3',
    uploads: [{
      field: 'resumeOriginalPath',
      extension: 'pdf',
      contentType: 'application/pdf',
      body: ORIGINAL_BODY,
    }],
    makeVersionId: () => 'original-v3',
    uploadObject: async (path, _body, options) => {
      events.push(`upload:${path}:${String(options.upsert)}`);
      return { error: null };
    },
    removeObjects: async (paths) => {
      events.push(`remove:${paths.join(',')}`);
      return { error: null };
    },
    swapProfilePaths: async (nextPaths) => {
      events.push('persist');
      persistedPaths = nextPaths;
      return {
        resumeOriginalPath: 'member-3/resume-original-old.pdf',
        // Not supplied in this operation, so it must not be retired.
        resumeEnhancedPath: 'member-3/resume-enhanced-current.txt',
      };
    },
  });

  assert.deepEqual(result.paths, {
    resumeOriginalPath: 'member-3/resume-original-original-v3.pdf',
  });
  assert.deepEqual(persistedPaths, result.paths);
  assert.deepEqual(events, [
    'upload:member-3/resume-original-original-v3.pdf:false',
    'persist',
    'remove:member-3/resume-original-old.pdf',
  ]);
});

test('clears a stale enhanced pointer in the same swap as a new original', async () => {
  let persistedPaths: ResumeProfilePaths | null = null;

  const result = await replaceResumeObjectsAtomically({
    userId: 'member-4',
    uploads: [{
      field: 'resumeOriginalPath',
      extension: 'txt',
      contentType: 'text/plain',
      body: 'Substantive plain-text resume content for a member.',
    }],
    clearFields: ['resumeEnhancedPath'],
    makeVersionId: () => 'original-v4',
    uploadObject: async () => ({ error: null }),
    removeObjects: async () => ({ error: null }),
    swapProfilePaths: async (paths) => {
      persistedPaths = paths;
      return {
        resumeOriginalPath: 'member-4/resume-original-old.txt',
        resumeEnhancedPath: 'member-4/resume-enhanced-old.txt',
      };
    },
  });

  assert.equal(result.paths.resumeOriginalPath, 'member-4/resume-original-original-v4.txt');
  assert.equal(result.paths.resumeEnhancedPath, null);
  assert.deepEqual(persistedPaths, result.paths);
  // Both replaced profile objects are retired; application snapshots use
  // separate application-* keys and are never returned as profile pointers.
});

test('retries staged-object cleanup three times and reports the terminal error', async () => {
  let removalCalls = 0;
  const cleanupErrors: unknown[] = [];

  await assert.rejects(replaceResumeObjectsAtomically({
    userId: 'member-5',
    uploads: [
      {
        field: 'resumeOriginalPath',
        extension: 'pdf',
        contentType: 'application/pdf',
        body: ORIGINAL_BODY,
      },
      {
        field: 'resumeEnhancedPath',
        extension: 'txt',
        contentType: 'text/plain',
        body: 'A substantive enhanced resume that will fail staging.',
      },
    ],
    makeVersionId: versionSequence('original-v5', 'enhanced-v5'),
    uploadObject: async (path) => ({
      error: path.includes('resume-enhanced') ? new Error('staging failed') : null,
    }),
    removeObjects: async () => {
      removalCalls += 1;
      return { error: new Error('cleanup unavailable') };
    },
    swapProfilePaths: async () => ({}),
    onCleanupError: (error) => cleanupErrors.push(error),
  }));

  assert.equal(removalCalls, 3);
  assert.equal(cleanupErrors.length, 1);
});

test('preserves bounded legacy profile keys until application rows are backfilled', async () => {
  const removals: string[][] = [];

  await replaceResumeObjectsAtomically({
    userId: 'member-legacy',
    uploads: [{
      field: 'resumeOriginalPath',
      extension: 'pdf',
      contentType: 'application/pdf',
      body: ORIGINAL_BODY,
    }],
    makeVersionId: () => 'replacement',
    uploadObject: async () => ({ error: null }),
    removeObjects: async (paths) => {
      removals.push(paths);
      return { error: null };
    },
    swapProfilePaths: async () => ({
      resumeOriginalPath: 'member-legacy/resume-original.pdf',
    }),
  });

  assert.deepEqual(removals, []);
  assert.equal(
    isLegacyResumeProfilePath('member-legacy', 'member-legacy/resume-original.pdf'),
    true,
  );
  assert.equal(
    isLegacyResumeProfilePath('member-legacy', 'member-legacy/resume-original-v2.pdf'),
    false,
  );
  assert.equal(
    isApplicationResumeSnapshotPath(
      'member-legacy',
      'application-1',
      'member-legacy/application-application-1-resume.doc',
    ),
    true,
  );
});
