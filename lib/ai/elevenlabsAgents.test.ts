import assert from 'node:assert/strict';
import test from 'node:test';

import { startElevenLabsPortalSession } from './elevenlabsAgents';
import { ELEVENLABS_AGENT_REGISTRY } from '@/lib/elevenlabs/agentRegistry';

function withEnv(t: { after: (fn: () => void) => void }) {
  const previousApiKey = process.env.ELEVENLABS_API_KEY;
  const previousAgentId = process.env.ELEVENLABS_WIOA_PREQUAL_AGENT_ID;
  const previousFetch = globalThis.fetch;
  const previousWarn = console.warn;
  process.env.ELEVENLABS_API_KEY = 'test-api-key';
  delete process.env.ELEVENLABS_WIOA_PREQUAL_AGENT_ID;
  console.warn = () => {};
  t.after(() => {
    globalThis.fetch = previousFetch;
    console.warn = previousWarn;
    if (previousApiKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previousApiKey;
    if (previousAgentId === undefined) delete process.env.ELEVENLABS_WIOA_PREQUAL_AGENT_ID;
    else process.env.ELEVENLABS_WIOA_PREQUAL_AGENT_ID = previousAgentId;
  });
}

const okResponse = () =>
  new Response(JSON.stringify({ signed_url: 'wss://provider.test/session' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

test('wioa_prequal recovers from a retired personal override by retrying the nonprofit agent once', async (t) => {
  withEnv(t);
  const entry = ELEVENLABS_AGENT_REGISTRY.wioa_prequal;
  const retiredAgentId = entry.historicalMigration.sourceAgentId;
  process.env.ELEVENLABS_WIOA_PREQUAL_AGENT_ID = retiredAgentId;
  const requestedAgentIds: string[] = [];
  globalThis.fetch = async (input) => {
    const agentId = new URL(String(input)).searchParams.get('agent_id') ?? '';
    requestedAgentIds.push(agentId);
    if (agentId === retiredAgentId) {
      return { ok: false, status: 404, text: async () => 'not found' } as Response;
    }
    return okResponse();
  };

  const session = await startElevenLabsPortalSession('wioa_prequal');

  assert.deepEqual(requestedAgentIds, [
    retiredAgentId,
    entry.historicalMigration?.migratedAgentId,
  ]);
  assert.equal(session.signedUrl, 'wss://provider.test/session');
});

test('non-404 provider failures are not retried against the migrated agent', async (t) => {
  withEnv(t);
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return { ok: false, status: 502, text: async () => 'outage' } as Response;
  };

  await assert.rejects(
    startElevenLabsPortalSession('wioa_prequal'),
    /ElevenLabs Conversational API error \(502\)/,
  );
  assert.equal(calls, 1);
});

test('a 404 on the reviewed nonprofit agent is not retried against the same agent', async (t) => {
  withEnv(t);
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return { ok: false, status: 404, text: async () => 'not found' } as Response;
  };

  await assert.rejects(
    startElevenLabsPortalSession('wioa_prequal'),
    /ElevenLabs Conversational API error \(404\)/,
  );
  assert.equal(calls, 1);
});

test('staff and governed member failures never retry a historical agent in another role', async (t) => {
  withEnv(t);
  const previousStaffId = process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID;
  process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID = 'agent_1234567890abcdefghijklmnopqr';
  t.after(() => {
    if (previousStaffId === undefined) delete process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID;
    else process.env.ELEVENLABS_COUNSELOR_STAFF_AGENT_ID = previousStaffId;
  });
  for (const key of ['counselor_staff', 'career_business', 'resume_coach'] as const) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return { ok: false, status: 404, text: async () => 'not found' } as Response;
    };
    await assert.rejects(startElevenLabsPortalSession(key), /ElevenLabs Conversational API error \(404\)/);
    assert.equal(calls, 1, `${key} must not cross its reviewed role boundary`);
  }
});
