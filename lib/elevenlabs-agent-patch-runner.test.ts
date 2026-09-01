import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import {
  applyAgentPatch,
  GOVERNED_LILLEY_AGENT_ID,
  REQUEST_TIMEOUT_MS,
} from '../scripts/elevenlabs/apply-agent-patches.mjs';
import {
  agentPatchMatches,
  expectedAgentAfterPatch,
  findAgentPatchMismatches,
  findAgentPreimageDrift,
  findAgentPostPatchDrift,
} from '../scripts/elevenlabs/agent-patch-utils.mjs';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createFetchQueue(responses: Response[]) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const response = responses.shift();
    assert.ok(response, 'unexpected provider request');
    return response;
  };
  return { calls, fetchImpl };
}

function createLogger() {
  const entries: string[][] = [];
  return {
    entries,
    logger: {
      error: (...values: unknown[]) => entries.push(values.map(String)),
      log: (...values: unknown[]) => entries.push(values.map(String)),
    },
  };
}

const preimage = {
  agent_id: 'agent_test',
  name: 'Before',
  access_info: { is_creator: true, creator_email: 'not-logged@example.test' },
  metadata: { created_at: 1 },
  version_id: 'version_before',
  conversation_config: {
    agent: { prompt: { prompt: 'safe prompt', tool_ids: ['tool_1'] } },
    tts: { voice_id: 'old_voice', model_id: 'eleven_flash_v2_5' },
  },
  platform_settings: {
    privacy: { record_voice: true, retention_days: 30 },
    auth: { enable_auth: true },
  },
  workflow: { edges: {}, nodes: {} },
  tags: ['member'],
};

const patch = {
  name: 'After',
  conversation_config: { tts: { voice_id: 'new_voice' } },
  platform_settings: {
    privacy: {
      record_voice: false,
      retention_days: 0,
      zero_retention_mode: true,
    },
  },
};

const reviewedBranchId = 'agtbranch_reviewed-main_2026';

test('governed Lilley model transition clears incompatible reasoning and disables fallback cascade', async () => {
  const checkedInPatch = JSON.parse(
    await readFile(
      join(
        process.cwd(),
        'scripts',
        'elevenlabs',
        'patches',
        `${GOVERNED_LILLEY_AGENT_ID}.patch.json`,
      ),
      'utf8',
    ),
  ) as {
    conversation_config?: {
      agent?: {
        prompt?: {
          llm?: unknown;
          reasoning_effort?: unknown;
          backup_llm_config?: unknown;
        };
      };
    };
    platform_settings?: {
      privacy?: {
        retention_days?: unknown;
        delete_transcript_and_pii?: unknown;
        delete_audio?: unknown;
        zero_retention_mode?: unknown;
      };
    };
  };
  const prompt = checkedInPatch.conversation_config?.agent?.prompt;
  const privacy = checkedInPatch.platform_settings?.privacy;

  assert.equal(prompt?.llm, 'claude-haiku-4-5');
  assert.equal(prompt?.reasoning_effort, null);
  assert.deepEqual(prompt?.backup_llm_config, { preference: 'disabled' });
  assert.equal(privacy?.zero_retention_mode, true);
  assert.equal(privacy?.retention_days, -1);
  assert.equal(privacy?.delete_transcript_and_pii, false);
  assert.equal(privacy?.delete_audio, false);

  const merged = expectedAgentAfterPatch(
    {
      conversation_config: {
        agent: {
          prompt: {
            llm: 'gpt-5.6-luna',
            reasoning_effort: 'low',
            backup_llm_config: { preference: 'default' },
          },
        },
      },
    },
    checkedInPatch,
  );
  const mergedPrompt = merged.conversation_config?.agent?.prompt;
  assert.equal(mergedPrompt?.llm, 'claude-haiku-4-5');
  assert.equal(mergedPrompt?.reasoning_effort, null);
  assert.deepEqual(mergedPrompt?.backup_llm_config, { preference: 'disabled' });
});

function lilleyAgentOnReviewedMainBranch() {
  return {
    ...structuredClone(preimage),
    agent_id: GOVERNED_LILLEY_AGENT_ID,
    branch_id: reviewedBranchId,
    main_branch_id: reviewedBranchId,
  };
}

test('legacy patch verification asserts only checked-in fields', () => {
  const expected = {
    name: 'Lilley',
    conversation_config: { tts: { voice_id: 'matilda' } },
  };
  const actual = {
    agent_id: 'server-managed',
    name: 'Lilley',
    conversation_config: {
      tts: { voice_id: 'matilda', model_id: 'eleven_flash_v2_5' },
    },
  };

  assert.equal(agentPatchMatches(actual, expected), true);
  assert.deepEqual(findAgentPatchMismatches(actual, expected), []);
});

test('agent patch verification reports field paths without response contents', () => {
  const mismatches = findAgentPatchMismatches(
    { conversation_config: { tts: { voice_id: 'wrong' } } },
    { conversation_config: { tts: { voice_id: 'matilda' } } },
  );
  assert.deepEqual(mismatches, ['conversation_config.tts.voice_id']);
});

test('exact post-patch proof is generic and catches unrelated mutable drift', () => {
  const expected = expectedAgentAfterPatch(preimage, patch);
  assert.equal(expected.conversation_config.tts.voice_id, 'new_voice');
  assert.equal(expected.conversation_config.agent.prompt.prompt, 'safe prompt');
  assert.equal(expected.platform_settings.privacy.zero_retention_mode, true);
  assert.equal(expected.platform_settings.auth.enable_auth, true);

  const providerMetadataOnly = {
    ...expected,
    version_id: 'version_after',
    metadata: { created_at: 1, updated_at: 2 },
    access_info: { is_creator: true, role: 'admin' },
  };
  assert.deepEqual(
    findAgentPostPatchDrift(providerMetadataOnly, preimage, patch),
    [],
  );

  const drifted = structuredClone(providerMetadataOnly);
  drifted.conversation_config.agent.prompt.tool_ids = ['unknown_tool'];
  assert.deepEqual(findAgentPostPatchDrift(drifted, preimage, patch), [
    'conversation_config.agent.prompt.tool_ids.0',
  ]);

  const unchanged = {
    ...structuredClone(preimage),
    version_id: 'provider_changed_version',
    metadata: { provider_managed: true },
  };
  assert.deepEqual(findAgentPreimageDrift(unchanged, preimage), []);
  assert.deepEqual(findAgentPreimageDrift(drifted, preimage), [
    'name',
    'conversation_config.agent.prompt.tool_ids.0',
    'conversation_config.tts.voice_id',
    'platform_settings.privacy.record_voice',
    'platform_settings.privacy.retention_days',
    'platform_settings.privacy.zero_retention_mode',
  ]);
});

test('writes fail closed before PATCH when the API key does not own the agent', async () => {
  const notOwned = structuredClone(preimage);
  notOwned.access_info.is_creator = false;
  const { calls, fetchImpl } = createFetchQueue([jsonResponse(notOwned)]);
  const { logger, entries } = createLogger();

  const result = await applyAgentPatch({
    agentId: 'agent_test',
    body: patch,
    key: 'test-secret-never-log',
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, undefined);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.ok(entries.some((entry) => entry[0] === 'OWNERSHIP_REQUIRED'));
  assert.equal(JSON.stringify(entries).includes('test-secret-never-log'), false);
});

test('governed Lilley reads fail closed before provider access without a valid branch pin', async () => {
  for (const branchId of [undefined, '../unreviewed']) {
    const { calls, fetchImpl } = createFetchQueue([]);
    const { logger, entries } = createLogger();

    const result = await applyAgentPatch({
      agentId: GOVERNED_LILLEY_AGENT_ID,
      body: patch,
      key: 'test-secret-never-log',
      branchId,
      checkOnly: true,
      fetchImpl,
      apiBase: 'https://provider.invalid/v1',
      logger,
    });

    assert.equal(result, false);
    assert.equal(calls.length, 0);
    assert.ok(
      entries.some((entry) =>
        ['BRANCH_ID_REQUIRED', 'BRANCH_ID_INVALID'].includes(entry[0]),
      ),
    );
  }
});

test('governed Lilley check pins the encoded branch and proves it is the main branch', async () => {
  const live = lilleyAgentOnReviewedMainBranch();
  const alreadyApplied = expectedAgentAfterPatch(live, patch);
  const { calls, fetchImpl } = createFetchQueue([jsonResponse(alreadyApplied)]);
  const { logger } = createLogger();

  const result = await applyAgentPatch({
    agentId: GOVERNED_LILLEY_AGENT_ID,
    body: patch,
    key: 'test-secret-never-log',
    branchId: reviewedBranchId,
    checkOnly: true,
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, true);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    `https://provider.invalid/v1/convai/agents/${GOVERNED_LILLEY_AGENT_ID}?branch_id=${encodeURIComponent(reviewedBranchId)}`,
  );
});

test('governed Lilley check rejects a branch response that is not the exact main branch', async () => {
  const live = lilleyAgentOnReviewedMainBranch();
  live.main_branch_id = 'agtbranch_other-main';
  const { calls, fetchImpl } = createFetchQueue([jsonResponse(live)]);
  const { logger, entries } = createLogger();

  const result = await applyAgentPatch({
    agentId: GOVERNED_LILLEY_AGENT_ID,
    body: patch,
    key: 'test-secret-never-log',
    branchId: reviewedBranchId,
    checkOnly: true,
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, false);
  assert.equal(calls.length, 1);
  assert.ok(entries.some((entry) => entry[0] === 'BRANCH_PIN_MISMATCH'));
});

test('governed Lilley post-write branch drift stops without a second PATCH', async () => {
  const live = lilleyAgentOnReviewedMainBranch();
  const postPatch = expectedAgentAfterPatch(live, patch);
  postPatch.branch_id = 'agtbranch_concurrent';
  const { calls, fetchImpl } = createFetchQueue([
    jsonResponse(live),
    jsonResponse({ ok: true }),
    jsonResponse(postPatch),
  ]);
  const { logger, entries } = createLogger();

  const result = await applyAgentPatch({
    agentId: GOVERNED_LILLEY_AGENT_ID,
    body: patch,
    key: 'test-secret-never-log',
    branchId: reviewedBranchId,
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, false);
  assert.equal(calls.filter((call) => call.init.method === 'PATCH').length, 1);
  assert.ok(calls.every((call) => call.url.includes(`branch_id=${reviewedBranchId}`)));
  assert.ok(entries.some((entry) => entry[0] === 'BRANCH_PIN_MISMATCH'));
  assert.ok(entries.some((entry) => entry[0] === 'MANUAL_RECOVERY_REQUIRED'));
});

test('concurrent post-PATCH drift requires manual recovery without a rollback write', async () => {
  const expected = expectedAgentAfterPatch(preimage, patch);
  const drifted = structuredClone(expected);
  drifted.version_id = 'version_after';
  drifted.conversation_config.agent.prompt.prompt = 'concurrent provider edit';
  const { calls, fetchImpl } = createFetchQueue([
    jsonResponse(preimage),
    jsonResponse({ ok: true }),
    jsonResponse(drifted),
  ]);
  const { logger, entries } = createLogger();

  const result = await applyAgentPatch({
    agentId: 'agent_test',
    body: patch,
    key: 'test-secret-never-log',
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    timeoutMs: 1234,
    logger,
  });

  assert.equal(result, false);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].init.method, 'PATCH');
  assert.equal(calls.filter((call) => call.init.method === 'PATCH').length, 1);
  assert.ok(calls.every((call) => call.init.signal instanceof AbortSignal));
  assert.ok(entries.some((entry) => entry[0] === 'VERIFY_FAILED'));
  assert.ok(entries.some((entry) => entry[0] === 'MANUAL_RECOVERY_REQUIRED'));
  assert.equal(entries.some((entry) => entry[0] === 'PATCH_NOT_APPLIED'), false);
  assert.equal(JSON.stringify(entries).includes('concurrent provider edit'), false);
  assert.equal(JSON.stringify(entries).includes('test-secret-never-log'), false);
});

test('a timed-out PATCH with third-state drift never attempts a rollback write', async () => {
  const drifted = expectedAgentAfterPatch(preimage, patch);
  drifted.conversation_config.agent.prompt.prompt = 'drift after ambiguous write';
  const responses = [
    jsonResponse(preimage),
    jsonResponse(drifted),
  ];
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let requestNumber = 0;
  const fetchImpl = async (
    url: string | URL | Request,
    init: RequestInit = {},
  ) => {
    calls.push({ url: String(url), init });
    requestNumber += 1;
    if (requestNumber === 2) {
      const timeout = new Error('mock timeout after server apply');
      timeout.name = 'TimeoutError';
      throw timeout;
    }
    const response = responses.shift();
    assert.ok(response, 'unexpected provider request');
    return response;
  };
  const { logger, entries } = createLogger();

  const result = await applyAgentPatch({
    agentId: 'agent_test',
    body: patch,
    key: 'test-secret-never-log',
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, false);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].init.method, 'PATCH');
  assert.equal(calls[2].init.method, undefined);
  assert.equal(calls.filter((call) => call.init.method === 'PATCH').length, 1);
  assert.ok(
    entries.some(
      (entry) => entry[0] === 'PATCH_FAILED' && entry[2] === 'TIMEOUT',
    ),
  );
  assert.ok(entries.some((entry) => entry[0] === 'VERIFY_FAILED'));
  assert.ok(entries.some((entry) => entry[0] === 'MANUAL_RECOVERY_REQUIRED'));
  assert.equal(JSON.stringify(entries).includes('ambiguous write'), false);
  assert.equal(JSON.stringify(entries).includes('test-secret-never-log'), false);
});

test('a 500 PATCH is accepted only after a fresh read proves the full desired state', async () => {
  const expected = {
    ...expectedAgentAfterPatch(preimage, patch),
    version_id: 'provider_changed_version',
  };
  const { calls, fetchImpl } = createFetchQueue([
    jsonResponse(preimage),
    jsonResponse({ error: 'ambiguous upstream failure' }, 500),
    jsonResponse(expected),
  ]);
  const { logger, entries } = createLogger();

  const result = await applyAgentPatch({
    agentId: 'agent_test',
    body: patch,
    key: 'test-secret-never-log',
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, true);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].init.method, 'PATCH');
  assert.equal(calls[2].init.method, undefined);
  assert.ok(
    entries.some(
      (entry) => entry[0] === 'PATCH_FAILED' && entry[2] === '500',
    ),
  );
  assert.ok(entries.some((entry) => entry[0] === 'APPLIED_AND_RECONCILED'));
  assert.equal(JSON.stringify(entries).includes('ambiguous upstream failure'), false);
  assert.equal(JSON.stringify(entries).includes('test-secret-never-log'), false);
});

test('an exact mutable preimage after PATCH fails without another write', async () => {
  const unchanged = {
    ...structuredClone(preimage),
    version_id: 'provider_changed_version',
    metadata: { provider_managed: true },
  };
  const { calls, fetchImpl } = createFetchQueue([
    jsonResponse(preimage),
    jsonResponse({ error: 'ambiguous primary write' }, 500),
    jsonResponse(unchanged),
  ]);
  const { logger, entries } = createLogger();

  const result = await applyAgentPatch({
    agentId: 'agent_test',
    body: patch,
    key: 'test-secret-never-log',
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, false);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].init.method, 'PATCH');
  assert.equal(calls[2].init.method, undefined);
  assert.equal(calls.filter((call) => call.init.method === 'PATCH').length, 1);
  assert.ok(entries.some((entry) => entry[0] === 'PATCH_NOT_APPLIED'));
  assert.equal(
    entries.some((entry) => entry[0] === 'MANUAL_RECOVERY_REQUIRED'),
    false,
  );
  assert.equal(JSON.stringify(entries).includes('ambiguous primary write'), false);
  assert.equal(JSON.stringify(entries).includes('test-secret-never-log'), false);
});

test('an unreadable post-PATCH GET requires manual recovery without rollback', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let requestNumber = 0;
  const fetchImpl = async (
    url: string | URL | Request,
    init: RequestInit = {},
  ) => {
    calls.push({ url: String(url), init });
    requestNumber += 1;
    if (requestNumber === 1) return jsonResponse(preimage);
    if (requestNumber === 2) return jsonResponse({ ok: true });
    const timeout = new Error('mock unreadable reconciliation');
    timeout.name = 'TimeoutError';
    throw timeout;
  };
  const { logger, entries } = createLogger();

  const result = await applyAgentPatch({
    agentId: 'agent_test',
    body: patch,
    key: 'test-secret-never-log',
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, false);
  assert.equal(calls.length, 3);
  assert.equal(calls.filter((call) => call.init.method === 'PATCH').length, 1);
  assert.ok(
    entries.some(
      (entry) =>
        entry[0] === 'POST_PATCH_GET_FAILED' && entry[2] === 'TIMEOUT',
    ),
  );
  assert.ok(entries.some((entry) => entry[0] === 'MANUAL_RECOVERY_REQUIRED'));
  assert.equal(JSON.stringify(entries).includes('mock unreadable reconciliation'), false);
  assert.equal(JSON.stringify(entries).includes('test-secret-never-log'), false);
});

test('successful writes prove the full recursively patched config', async () => {
  const expected = {
    ...expectedAgentAfterPatch(preimage, patch),
    version_id: 'provider_changed_version',
  };
  const { calls, fetchImpl } = createFetchQueue([
    jsonResponse(preimage),
    jsonResponse({ ok: true }),
    jsonResponse(expected),
  ]);
  const { logger, entries } = createLogger();

  const result = await applyAgentPatch({
    agentId: 'agent_test',
    body: patch,
    key: 'test-secret-never-log',
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, true);
  assert.equal(calls.length, 3);
  assert.ok(entries.some((entry) => entry[0] === 'APPLIED_AND_VERIFIED'));
  assert.equal(JSON.stringify(entries).includes('test-secret-never-log'), false);
});

test('--check behavior is one GET and remains read-only without ownership', async () => {
  const alreadyApplied = expectedAgentAfterPatch(preimage, patch);
  alreadyApplied.access_info.is_creator = false;
  const { calls, fetchImpl } = createFetchQueue([jsonResponse(alreadyApplied)]);
  const { logger } = createLogger();

  const result = await applyAgentPatch({
    agentId: 'agent_test',
    body: patch,
    key: 'test-secret-never-log',
    checkOnly: true,
    fetchImpl,
    apiBase: 'https://provider.invalid/v1',
    logger,
  });

  assert.equal(result, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, undefined);
});

test('ElevenLabs runner uses bounded requests and never logs provider bodies', async () => {
  const source = await readFile(
    join(process.cwd(), 'scripts', 'elevenlabs', 'apply-agent-patches.mjs'),
    'utf8',
  );
  assert.match(source, /method: 'PATCH'/);
  assert.match(source, /AbortSignal\.timeout\(timeoutMs\)/);
  assert.match(source, /access_info\?\.is_creator !== true/);
  assert.match(source, /structuredClone\(liveAgent\)/);
  assert.match(source, /findAgentPostPatchDrift\(postPatchAgent, preimage, body\)/);
  assert.match(source, /findAgentPreimageDrift\(postPatchAgent, preimage\)/);
  assert.match(source, /branch_id=\$\{encodeURIComponent\(pinnedBranchId\)\}/);
  assert.match(source, /agent\?\.main_branch_id === branchId/);
  assert.doesNotMatch(source, /ROLLBACK_PATCH|rollbackAgent\(|buildAgentRollbackBody/);
  assert.doesNotMatch(source, /response\.text\(|text\.slice\(/);
  assert.equal(REQUEST_TIMEOUT_MS, 15_000);
});

test('ElevenLabs writes require one explicit agent and broad mode is verify-only', async () => {
  const source = await readFile(
    join(process.cwd(), 'scripts', 'elevenlabs', 'apply-agent-patches.mjs'),
    'utf8',
  );
  assert.match(source, /allAgents && !checkOnly/);
  assert.match(source, /!requestedAgentId && !\(checkOnly && allAgents\)/);
  assert.match(source, /file === `\$\{requestedAgentId\}\.patch\.json`/);

  const packageJson = JSON.parse(
    await readFile(join(process.cwd(), 'package.json'), 'utf8'),
  ) as { scripts?: Record<string, string> };
  assert.equal(
    packageJson.scripts?.['elevenlabs:verify-agents'],
    'node scripts/elevenlabs/apply-agent-patches.mjs --check --all',
  );
});
