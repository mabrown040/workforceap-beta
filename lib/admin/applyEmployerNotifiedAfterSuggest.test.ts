import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEmployerNotifiedAfterSuggest } from './applyEmployerNotifiedAfterSuggest';

test('applyEmployerNotifiedAfterSuggest returns ok when update succeeds', async () => {
  const r = await applyEmployerNotifiedAfterSuggest(
    async () => ({ count: 2 }),
    () => {},
    'job-x'
  );
  assert.equal(r, 'ok');
});

test('applyEmployerNotifiedAfterSuggest returns failed and logs when update throws', async () => {
  const logs: string[] = [];
  const r = await applyEmployerNotifiedAfterSuggest(
    async () => {
      throw new Error('deadlock');
    },
    (msg, ctx) => {
      logs.push(msg);
      assert.equal(ctx.jobId, 'job-x');
      assert.match(String(ctx.message), /deadlock/);
    },
    'job-x'
  );
  assert.equal(r, 'failed');
  assert.ok(logs.some((l) => l.includes('updateMany failed')));
});
