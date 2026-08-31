import assert from 'node:assert/strict';
import test from 'node:test';

import { createConversationalSession } from './elevenlabs';

test('requests and returns the provider conversation id without exposing the API key', async (t) => {
  const previousApiKey = process.env.ELEVENLABS_API_KEY;
  const previousFetch = globalThis.fetch;
  const previousTimeout = AbortSignal.timeout;
  process.env.ELEVENLABS_API_KEY = 'test-api-key';
  let requestUrl = '';
  let requestHeaders: HeadersInit | undefined;
  let requestSignal: AbortSignal | null | undefined;
  let requestedTimeoutMs: number | undefined;

  AbortSignal.timeout = (timeoutMs) => {
    requestedTimeoutMs = timeoutMs;
    return previousTimeout(timeoutMs);
  };

  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestHeaders = init?.headers;
    requestSignal = init?.signal;
    return new Response(
      JSON.stringify({
        signed_url: 'wss://provider.test/session',
        conversation_id: 'conv_test_123',
        expires_at_unix_secs: 1_788_177_600,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  t.after(() => {
    globalThis.fetch = previousFetch;
    AbortSignal.timeout = previousTimeout;
    if (previousApiKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previousApiKey;
  });

  const branchId = 'agtbranch_reviewed-main_2026';
  const session = await createConversationalSession('agent_reviewed', { branchId });

  assert.match(requestUrl, /agent_id=agent_reviewed/);
  assert.match(requestUrl, /include_conversation_id=true/);
  assert.match(requestUrl, new RegExp(`branch_id=${encodeURIComponent(branchId)}`));
  assert.equal(new URL(requestUrl).searchParams.get('branch_id'), branchId);
  assert.deepEqual(requestHeaders, { 'xi-api-key': 'test-api-key' });
  assert.ok(requestSignal instanceof AbortSignal);
  assert.equal(requestedTimeoutMs, 8_000);
  assert.equal(session.signedUrl, 'wss://provider.test/session');
  assert.equal(session.conversationId, 'conv_test_123');
  assert.equal(JSON.stringify(session).includes('test-api-key'), false);
});

test('rejects malformed branch IDs before requesting a signed URL', async (t) => {
  const previousApiKey = process.env.ELEVENLABS_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.ELEVENLABS_API_KEY = 'test-api-key';
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch must not run');
  };

  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previousApiKey;
  });

  for (const branchId of ['../unreviewed', 'a'.repeat(129)]) {
    await assert.rejects(
      createConversationalSession('agent_reviewed', { branchId }),
      /ElevenLabs branch ID is invalid/,
    );
  }
  assert.equal(fetchCalled, false);
});

test('maps provider failures to a generic error without reading or leaking the response body', async (t) => {
  const previousApiKey = process.env.ELEVENLABS_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.ELEVENLABS_API_KEY = 'test-api-key';
  let responseBodyRead = false;
  let requestUrl = '';

  globalThis.fetch = async (input) => {
    requestUrl = String(input);
    return {
      ok: false,
      status: 502,
      text: async () => {
        responseBodyRead = true;
        return 'sensitive provider workspace diagnostic';
      },
    } as Response;
  };

  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previousApiKey;
  });

  await assert.rejects(
    createConversationalSession('agent_reviewed'),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'ElevenLabs Conversational API error (502)');
      assert.doesNotMatch(error.message, /sensitive|workspace|diagnostic/i);
      return true;
    },
  );
  assert.equal(responseBodyRead, false);
  assert.equal(new URL(requestUrl).searchParams.has('branch_id'), false);
});
