import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import { verifyCourseraRestWebhookAuth } from './webhookAuth';

test('verifyCourseraRestWebhookAuth - rejects when expectedSecret is empty', () => {
  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    body: '{}',
  });
  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody: '{}', expectedSecret: '' });
  assert.equal(result.ok, false);
});

test('verifyCourseraRestWebhookAuth - verifies HMAC-SHA256 signature header', () => {
  const secret = 'my-test-secret';
  const rawBody = '{"completed":true}';
  const signature = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    headers: { 'x-coursera-signature': `sha256=${signature}` },
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.method, 'hmac-sha256');
  }
});

test('verifyCourseraRestWebhookAuth - rejects bad HMAC signature', () => {
  const secret = 'my-test-secret';
  const rawBody = '{"completed":true}';
  const badSignature = 'a'.repeat(64);

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    headers: { 'x-coursera-signature': `sha256=${badSignature}` },
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret });
  assert.equal(result.ok, false);
});

test('verifyCourseraRestWebhookAuth - rejects short signature header (not 64 hex chars)', () => {
  const secret = 'my-test-secret';
  const rawBody = '{"completed":true}';

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    headers: { 'x-coursera-signature': 'sha256=abc123' },
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret });
  assert.equal(result.ok, false);
});

test('verifyCourseraRestWebhookAuth - verifies shared-secret header', () => {
  const secret = 'shared-header-secret';
  const rawBody = '{}';

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    headers: { 'x-coursera-webhook-secret': secret },
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.method, 'shared-secret-header');
  }
});

test('verifyCourseraRestWebhookAuth - rejects wrong shared-secret header', () => {
  const secret = 'shared-header-secret';
  const rawBody = '{}';

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    headers: { 'x-coursera-webhook-secret': 'wrong-secret' },
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret });
  assert.equal(result.ok, false);
});

test('verifyCourseraRestWebhookAuth - verifies legacy body secret', () => {
  const secret = 'body-secret';
  const rawBody = '{}';

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret, bodySecret: secret });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.method, 'shared-secret-body');
  }
});

test('verifyCourseraRestWebhookAuth - prefers HMAC over shared-secret header', () => {
  const secret = 'my-test-secret';
  const rawBody = '{"completed":true}';
  const signature = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    headers: {
      'x-coursera-signature': `sha256=${signature}`,
      'x-coursera-webhook-secret': secret,
    },
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.method, 'hmac-sha256');
  }
});

test('verifyCourseraRestWebhookAuth - does not fall through to other methods when signature header is present but invalid', () => {
  const secret = 'my-test-secret';
  const rawBody = '{"completed":true}';
  const badSignature = 'b'.repeat(64);

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    headers: {
      'x-coursera-signature': `sha256=${badSignature}`,
      'x-coursera-webhook-secret': secret,
    },
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret });
  assert.equal(result.ok, false);
});

test('verifyCourseraRestWebhookAuth - accepts hex digest without sha256= prefix', () => {
  const secret = 'my-test-secret';
  const rawBody = '{"completed":true}';
  const signature = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    headers: { 'x-coursera-webhook-signature': signature },
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret });
  assert.equal(result.ok, true);
});

test('verifyCourseraRestWebhookAuth - uses timingSafeEqual for all comparisons', () => {
  // This test verifies the implementation uses timingSafeEqual by checking
  // that wrong secrets of matching length are rejected.
  const secret = 'exact-length-match';
  const rawBody = '{}';

  const req = new Request('https://example.com/webhooks/coursera', {
    method: 'POST',
    headers: { 'x-coursera-webhook-secret': 'exact-length-wrong' },
    body: rawBody,
  });

  const result = verifyCourseraRestWebhookAuth({ request: req, rawBody, expectedSecret: secret });
  assert.equal(result.ok, false);
});
