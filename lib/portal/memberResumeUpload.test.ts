import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getResumeUploadFileError,
  RESUME_UPLOAD_ACCEPT,
  RESUME_UPLOAD_FORMAT_LABEL,
  uploadMemberResumeFile,
} from './memberResumeUpload';

function fakeFile(name: string, size = 1024): File {
  return { name, size } as File;
}

test('resume upload UI contract advertises only extractable formats', () => {
  assert.equal(RESUME_UPLOAD_ACCEPT, '.pdf,.docx,.txt');
  assert.equal(RESUME_UPLOAD_FORMAT_LABEL, 'PDF, DOCX, or TXT');
  assert.equal(getResumeUploadFileError(fakeFile('resume.pdf')), null);
  assert.equal(getResumeUploadFileError(fakeFile('resume.DOCX')), null);
  assert.equal(getResumeUploadFileError(fakeFile('resume.txt')), null);
});

test('legacy DOC files fail client-side with conversion guidance', () => {
  assert.match(getResumeUploadFileError(fakeFile('resume.doc')) ?? '', /Legacy \.doc files are not supported/i);
  assert.match(getResumeUploadFileError(fakeFile('resume.doc')) ?? '', /PDF, DOCX, or TXT/i);
});

test('member upload returns the server extraction warning to the UI', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    ok: true,
    extractionWarning: 'Headings may have been flattened.',
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  try {
    const result = await uploadMemberResumeFile(fakeFile('resume.txt'));
    assert.deepEqual(result, { ok: true, warning: 'Headings may have been flattened.' });
  } finally {
    globalThis.fetch = previousFetch;
  }
});
