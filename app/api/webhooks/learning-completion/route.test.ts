import test from 'node:test';
import assert from 'node:assert/strict';
import { webhookSchema, verifyWebhookSecret, buildDedupeKey, checkIdempotency } from './_webhook';
import { prisma } from '@/lib/db/prisma';

test('webhookSchema accepts valid payload', () => {
  const result = webhookSchema.safeParse({
    memberId: 'user-123',
    courseName: 'Intro to Python',
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.memberId, 'user-123');
    assert.equal(result.data.courseName, 'Intro to Python');
  }
});

test('webhookSchema accepts optional eventId', () => {
  const result = webhookSchema.safeParse({
    memberId: 'user-123',
    courseName: 'Intro to Python',
    eventId: 'evt-456',
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.eventId, 'evt-456');
  }
});

test('webhookSchema rejects missing memberId', () => {
  const result = webhookSchema.safeParse({
    courseName: 'Intro to Python',
  });
  assert.equal(result.success, false);
});

test('webhookSchema rejects empty courseName', () => {
  const result = webhookSchema.safeParse({
    memberId: 'user-123',
    courseName: '   ',
  });
  assert.equal(result.success, false);
});

test('webhookSchema rejects extra fields (strip behavior from zod object)', () => {
  const result = webhookSchema.safeParse({
    memberId: 'user-123',
    courseName: 'Intro to Python',
    extraField: 'should-be-ignored',
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal('extraField' in result.data, false);
  }
});

test('verifyWebhookSecret returns true for matching secret', () => {
  const originalSecret = process.env.WEBHOOK_SECRET;
  process.env.WEBHOOK_SECRET = 'correct-secret';

  const req = new Request('https://example.com/webhooks/learning-completion', {
    method: 'POST',
    headers: { 'x-webhook-secret': 'correct-secret' },
    body: '{}',
  });

  const result = verifyWebhookSecret(req);
  process.env.WEBHOOK_SECRET = originalSecret;

  assert.equal(result, true);
});

test('verifyWebhookSecret returns false for wrong secret', () => {
  const originalSecret = process.env.WEBHOOK_SECRET;
  process.env.WEBHOOK_SECRET = 'correct-secret';

  const req = new Request('https://example.com/webhooks/learning-completion', {
    method: 'POST',
    headers: { 'x-webhook-secret': 'wrong-secret' },
    body: '{}',
  });

  const result = verifyWebhookSecret(req);
  process.env.WEBHOOK_SECRET = originalSecret;

  assert.equal(result, false);
});

test('verifyWebhookSecret returns false when secret header is missing', () => {
  const originalSecret = process.env.WEBHOOK_SECRET;
  process.env.WEBHOOK_SECRET = 'correct-secret';

  const req = new Request('https://example.com/webhooks/learning-completion', {
    method: 'POST',
    body: '{}',
  });

  const result = verifyWebhookSecret(req);
  process.env.WEBHOOK_SECRET = originalSecret;

  assert.equal(result, false);
});

test('verifyWebhookSecret returns false when WEBHOOK_SECRET env is unset (fail closed)', () => {
  // Regression guard for AUDIT-2026-05-16 C-S2: with empty expected & provided
  // secrets, SHA256('') === SHA256('') would otherwise grant anonymous access.
  const originalSecret = process.env.WEBHOOK_SECRET;
  delete process.env.WEBHOOK_SECRET;

  const req = new Request('https://example.com/webhooks/learning-completion', {
    method: 'POST',
    headers: { 'x-webhook-secret': '' },
    body: '{}',
  });

  const result = verifyWebhookSecret(req);
  if (originalSecret === undefined) delete process.env.WEBHOOK_SECRET;
  else process.env.WEBHOOK_SECRET = originalSecret;

  assert.equal(result, false);
});

test('verifyWebhookSecret returns false when WEBHOOK_SECRET is empty string', () => {
  const originalSecret = process.env.WEBHOOK_SECRET;
  process.env.WEBHOOK_SECRET = '';

  const req = new Request('https://example.com/webhooks/learning-completion', {
    method: 'POST',
    headers: { 'x-webhook-secret': '' },
    body: '{}',
  });

  const result = verifyWebhookSecret(req);
  if (originalSecret === undefined) delete process.env.WEBHOOK_SECRET;
  else process.env.WEBHOOK_SECRET = originalSecret;

  assert.equal(result, false);
});

test('verifyWebhookSecret is safe against timing attacks (same-length wrong secret)', () => {
  const originalSecret = process.env.WEBHOOK_SECRET;
  process.env.WEBHOOK_SECRET = 'secret-a';

  const req = new Request('https://example.com/webhooks/learning-completion', {
    method: 'POST',
    headers: { 'x-webhook-secret': 'secret-b' },
    body: '{}',
  });

  const result = verifyWebhookSecret(req);
  process.env.WEBHOOK_SECRET = originalSecret;

  assert.equal(result, false);
});

test('buildDedupeKey uses eventId when present', () => {
  const key = buildDedupeKey({ memberId: 'u1', courseName: 'c1', eventId: 'evt-42' }, '{}');
  assert.equal(key, 'wh:learning-completion:evt-42');
});

test('buildDedupeKey falls back to body hash when eventId absent', () => {
  const key = buildDedupeKey({ memberId: 'u1', courseName: 'c1' }, '{"x":1}');
  assert.ok(key.startsWith('wh:learning-completion:'));
  assert.ok(key.length > 'wh:learning-completion:'.length + 10);
});

test('checkIdempotency returns already_processed when xapiStatement is processed', async (t) => {
  const xapiDelegate = (prisma as any).xapiStatement;
  const originalFindUnique = xapiDelegate.findUnique;

  t.after(() => {
    xapiDelegate.findUnique = originalFindUnique;
  });

  xapiDelegate.findUnique = async () => ({ processed: true });

  const result = await checkIdempotency('wh:learning-completion:evt-1');
  assert.equal(result, 'already_processed');
});

test('checkIdempotency returns fresh when no existing statement and create succeeds', async (t) => {
  const xapiDelegate = (prisma as any).xapiStatement;
  const originalFindUnique = xapiDelegate.findUnique;
  const originalCreate = xapiDelegate.create;

  t.after(() => {
    xapiDelegate.findUnique = originalFindUnique;
    xapiDelegate.create = originalCreate;
  });

  xapiDelegate.findUnique = async () => null;
  xapiDelegate.create = async (_args: any) => ({ id: 'xapi-1' });

  const result = await checkIdempotency('wh:learning-completion:evt-2');
  assert.equal(result, 'fresh');
});

test('checkIdempotency returns already_processed on P2002 race condition', async (t) => {
  const xapiDelegate = (prisma as any).xapiStatement;
  const originalFindUnique = xapiDelegate.findUnique;
  const originalCreate = xapiDelegate.create;

  t.after(() => {
    xapiDelegate.findUnique = originalFindUnique;
    xapiDelegate.create = originalCreate;
  });

  xapiDelegate.findUnique = async () => null;
  xapiDelegate.create = async () => {
    const err = new Error('Unique constraint violation');
    (err as any).code = 'P2002';
    throw err;
  };

  const result = await checkIdempotency('wh:learning-completion:evt-3');
  assert.equal(result, 'already_processed');
});

test('checkIdempotency returns already_processed for mid-flight retry (unprocessed row exists)', async (t) => {
  const xapiDelegate = (prisma as any).xapiStatement;
  const originalFindUnique = xapiDelegate.findUnique;
  const originalUpdateMany = xapiDelegate.updateMany;

  t.after(() => {
    xapiDelegate.findUnique = originalFindUnique;
    xapiDelegate.updateMany = originalUpdateMany;
  });

  xapiDelegate.findUnique = async () => ({ processed: false });
  xapiDelegate.updateMany = async (_args: any) => ({ count: 1 });

  const result = await checkIdempotency('wh:learning-completion:evt-4');
  assert.equal(result, 'already_processed');
});
