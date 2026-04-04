import assert from 'node:assert/strict';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import { extractTextFromResumeBuffer } from './extractTextFromResumeBuffer.ts';

test('extractTextFromResumeBuffer: UTF-8 .txt', async () => {
  const buf = Buffer.from('Hello résumé\nline two', 'utf-8');
  const t = await extractTextFromResumeBuffer(buf, 'txt');
  assert.match(t, /résumé/);
});
