import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertGovernedToolOwnership,
  assertMemberAgentOwnership,
  buildMemberAgentWebhookToolConfig,
  buildConversationConfigWithToolIds,
  findAgentToolAttachmentMutationIssues,
  findMemberAgentCapabilityIssues,
  findMemberAgentToolSecurityIssues,
  findPartialMismatches,
  indexGovernedTools,
  validateMemberAgentToolManifest,
} from '../scripts/elevenlabs/member-agent-tool-sync-utils.mjs';
import {
  attachGovernedToolsWithReconciliation,
  buildReviewedAgentPath,
  createProviderClient,
  readCompleteToolDependencies,
  reconcileGovernedToolMutation,
  requireReviewedBranchId,
  rollbackGovernedToolMutations,
  runMemberAgentToolSync,
} from '../scripts/elevenlabs/sync-member-agent-tools.mjs';
import { MEMBER_AGENT_TOOL_DEFINITIONS } from './agents/gateway/toolDefinitions';

const manifestPath = join(
  process.cwd(),
  'config',
  'elevenlabs',
  'member-agent-tools.v1.json',
);
const manifest = validateMemberAgentToolManifest(
  JSON.parse(readFileSync(manifestPath, 'utf8')),
);
const agentPatch = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      'scripts',
      'elevenlabs',
      'patches',
      `${manifest.agentId}.patch.json`,
    ),
    'utf8',
  ),
);
const reviewedBranchId = 'branch-reviewed_01';

function reviewedAgent(toolIds: string[] = []) {
  const agent = structuredClone(agentPatch);
  agent.agent_id = manifest.agentId;
  agent.branch_id = reviewedBranchId;
  agent.main_branch_id = reviewedBranchId;
  agent.access_info = { is_creator: true };
  agent.conversation_config.agent.prompt.tool_ids = [...toolIds];
  return agent;
}

test('reviewed Lilley branch id is mandatory and rejects unsafe values', () => {
  assert.equal(requireReviewedBranchId(' branch-reviewed_01 '), 'branch-reviewed_01');
  for (const value of [
    undefined,
    '',
    '   ',
    'branch/reviewed',
    'branch?reviewed',
    'branch reviewed',
    `branch-${'a'.repeat(128)}`,
  ]) {
    assert.throws(
      () => requireReviewedBranchId(value),
      /Set ELEVENLABS_LILLEY_BRANCH_ID to the reviewed Lilley branch explicitly/,
    );
  }
});

test('member tool sync check and apply both fail before provider reads without a reviewed branch', async () => {
  for (const apply of [false, true]) {
    let getAgentCalls = 0;
    await assert.rejects(
      runMemberAgentToolSync({
        provider: {
          getAgent: async () => {
            getAgentCalls += 1;
            return reviewedAgent();
          },
        },
        manifest,
        agentPatch,
        reviewedBranchId: '',
        apply,
      }),
      /Set ELEVENLABS_LILLEY_BRANCH_ID to the reviewed Lilley branch explicitly/,
    );
    assert.equal(getAgentCalls, 0);
  }
});

test('member tool sync rejects a wrong branch readback before listing tools', async () => {
  const wrongBranch = reviewedAgent();
  wrongBranch.branch_id = 'branch-other';
  let listCalls = 0;
  const provider = {
    getAgent: async () => structuredClone(wrongBranch),
    listTools: async () => {
      listCalls += 1;
      return [];
    },
  };

  await assert.rejects(
    runMemberAgentToolSync({
      provider,
      manifest,
      agentPatch,
      reviewedBranchId,
      apply: false,
    }),
    /AGENT_BRANCH_MISMATCH.*reviewed branch/,
  );
  assert.equal(listCalls, 0);
});

test('provider agent GET and PATCH URLs pin the reviewed Lilley branch', async () => {
  assert.equal(
    buildReviewedAgentPath('agent/reviewed', 'branch-reviewed_01'),
    '/convai/agents/agent%2Freviewed?branch_id=branch-reviewed_01',
  );

  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: String(input),
      method: init?.method ?? 'GET',
    });
    return new Response(JSON.stringify(reviewedAgent()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const provider = createProviderClient('test-api-key', 'branch-reviewed_01');
    await provider.getAgent('agent/reviewed');
    await provider.patchAgentToolIds('agent/reviewed', ['tool-1'], 'test patch');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(requests, [
    {
      url: 'https://api.elevenlabs.io/v1/convai/agents/agent%2Freviewed?branch_id=branch-reviewed_01',
      method: 'GET',
    },
    {
      url: 'https://api.elevenlabs.io/v1/convai/agents/agent%2Freviewed?branch_id=branch-reviewed_01',
      method: 'PATCH',
    },
  ]);
});

test('provider tool listing rejects missing tools or pagination completeness fields', async () => {
  const originalFetch = globalThis.fetch;
  const payloads = [{ has_more: false }, { tools: [] }];
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payloads.shift()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

  try {
    const provider = createProviderClient('test-api-key', reviewedBranchId);
    await assert.rejects(
      provider.listTools(),
      /Tool listing response is incomplete; refusing reconciliation/,
    );
    await assert.rejects(
      provider.listTools(),
      /Tool listing response is incomplete; refusing reconciliation/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

type ProviderToolConfig = ReturnType<typeof buildMemberAgentWebhookToolConfig> & {
  api_schema: ReturnType<typeof buildMemberAgentWebhookToolConfig>['api_schema'] & {
    request_headers: Record<string, unknown>;
    content_type?: string;
    path_params_schema?: unknown;
    query_params_schema?: unknown;
    request_body_schema?: unknown;
  };
  assignments?: unknown;
  dynamic_variables?: unknown;
  response_mocks?: unknown;
};

test('member tool execution policy is fixed to the reviewed voice-safe posture', () => {
  const driftedManifest = structuredClone(manifest) as {
    toolExecutionPolicy: { preToolSpeech: string };
  };
  driftedManifest.toolExecutionPolicy.preToolSpeech = 'auto';
  assert.throws(
    () => validateMemberAgentToolManifest(driftedManifest),
    /execute immediately, without pre-tool speech, and remain interruptible/,
  );
});

test('ElevenLabs member tools match the server gateway and expose no identity arguments', () => {
  assert.deepEqual(
    manifest.tools.map((tool: { name: string }) => tool.name),
    MEMBER_AGENT_TOOL_DEFINITIONS.map((tool) => tool.name),
  );
  for (const definition of manifest.tools) {
    const config = buildMemberAgentWebhookToolConfig(manifest, definition);
    assert.equal(config.type, 'webhook');
    assert.equal(config.api_schema.method, 'POST');
    assert.equal(config.execution_mode, 'immediate');
    assert.equal(config.pre_tool_speech, 'off');
    assert.equal(config.interruption_mode, 'allow');
    assert.deepEqual(config.api_schema.request_headers.Authorization, {
      variable_name: 'secret__agent_gateway_token',
    });
    assert.equal('request_body_schema' in config.api_schema, false);
    assert.equal('query_params_schema' in config.api_schema, false);
    assert.equal('path_params_schema' in config.api_schema, false);
    assert.doesNotMatch(JSON.stringify(config), /userId|organizationId|memberId/);
  }
});

test('tool reconciliation fails closed on duplicate exact names', () => {
  const duplicate = {
    id: 'tool-1',
    tool_config: { name: 'get_my_next_step' },
  };
  assert.throws(
    () => indexGovernedTools([duplicate, { ...duplicate, id: 'tool-2' }], manifest),
    /Duplicate ElevenLabs tools/,
  );
});

test('provider mutation requires positive governed-tool ownership proof', () => {
  assert.doesNotThrow(() =>
    assertGovernedToolOwnership(
      { access_info: { is_creator: true } },
      'get_my_next_step',
    ),
  );
  assert.throws(
    () => assertGovernedToolOwnership({}, 'get_my_next_step'),
    /not proven to be owned/,
  );
  assert.throws(
    () =>
      assertGovernedToolOwnership(
        { access_info: { is_creator: false } },
        'get_my_next_step',
      ),
    /not proven to be owned/,
  );
});

test('provider mutation requires positive reviewed-agent ownership proof', () => {
  assert.doesNotThrow(() =>
    assertMemberAgentOwnership(
      { access_info: { is_creator: true } },
      manifest.agentId,
    ),
  );
  assert.throws(
    () => assertMemberAgentOwnership({}, manifest.agentId),
    /not proven to be owned/,
  );
  assert.throws(
    () =>
      assertMemberAgentOwnership(
        { access_info: { is_creator: false } },
        manifest.agentId,
      ),
    /not proven to be owned/,
  );
});

test('partial verification detects security-relevant provider drift', () => {
  const desired = buildMemberAgentWebhookToolConfig(manifest, manifest.tools[0]);
  const drifted = structuredClone(desired) as ProviderToolConfig;
  drifted.api_schema.request_headers.Authorization = { variable_name: 'not_secret' };
  assert.deepEqual(findPartialMismatches(drifted, desired), [
    'api_schema.request_headers.Authorization.variable_name',
  ]);
});

test('strict verification rejects hidden provider inputs and side effects', () => {
  const desired = buildMemberAgentWebhookToolConfig(manifest, manifest.tools[0]);
  const drifted = structuredClone(desired) as ProviderToolConfig;
  drifted.api_schema.request_headers['X-Member-Id'] = 'model-supplied';
  drifted.api_schema.query_params_schema = { memberId: { type: 'string' } };
  drifted.api_schema.request_body_schema = { type: 'object' };
  drifted.assignments = [{ source: 'response', target: 'member_id' }];
  drifted.response_mocks = [{ body: { status: 'ok' } }];
  Object.assign(drifted, {
    execution_mode: 'async',
    pre_tool_speech: 'force',
    interruption_mode: 'disable_during_tool_and_turn',
    input_overrides: { memberId: { source: 'llm' } },
    tool_call_sound: 'typing',
    force_pre_tool_speech: true,
    disable_interruptions: true,
    dynamic_variables: { dynamic_variable_placeholders: { member_id: 'unreviewed' } },
    api_schema_overrides: { request_body_schema: { type: 'object' } },
  });

  const issues = findMemberAgentToolSecurityIssues(drifted, desired);
  assert.ok(issues.includes('api_schema.request_headers'));
  assert.ok(issues.includes('api_schema.query_params_schema'));
  assert.ok(issues.includes('api_schema.request_body_schema'));
  assert.ok(issues.includes('assignments'));
  assert.ok(issues.includes('response_mocks'));
  assert.ok(issues.includes('execution_mode'));
  assert.ok(issues.includes('pre_tool_speech'));
  assert.ok(issues.includes('interruption_mode'));
  assert.ok(issues.includes('tool_config.input_overrides'));
  assert.ok(issues.includes('tool_call_sound'));
  assert.ok(issues.includes('force_pre_tool_speech'));
  assert.ok(issues.includes('disable_interruptions'));
  assert.ok(issues.includes('dynamic_variables'));
  assert.ok(issues.includes('api_schema_overrides'));
});

test('strict verification rejects provider response mocks on the tool wrapper', () => {
  const desired = buildMemberAgentWebhookToolConfig(manifest, manifest.tools[0]);
  const providerTool = {
    id: 'tool-1',
    tool_config: structuredClone(desired),
    response_mocks: [{ body: { memberFacingMessage: 'Fake progress' } }],
  };
  assert.ok(
    findMemberAgentToolSecurityIssues(providerTool, desired).includes(
      '<tool>.response_mocks',
    ),
  );
});

test('strict verification accepts only empty provider-default schema containers', () => {
  const desired = buildMemberAgentWebhookToolConfig(manifest, manifest.tools[0]);
  const provider = structuredClone(desired) as ProviderToolConfig;
  provider.api_schema.content_type = 'application/json';
  provider.api_schema.path_params_schema = {};
  provider.api_schema.query_params_schema = null;
  provider.api_schema.request_body_schema = {};
  provider.assignments = [];
  provider.dynamic_variables = { dynamic_variable_placeholders: {} };
  provider.response_mocks = [];
  Object.assign(provider, {
    force_pre_tool_speech: false,
    disable_interruptions: false,
    tool_call_sound: null,
    tool_call_sound_behavior: 'auto',
    tool_version: '1.0.0',
    api_schema_overrides: null,
  });

  assert.deepEqual(findMemberAgentToolSecurityIssues(provider, desired), []);
});

test('agent attachment verification permits only the governed tool_ids change', () => {
  const before = {
    agent: {
      first_message: 'Hello',
      prompt: { prompt: 'Student prompt', llm: 'gpt-5.6-luna', tool_ids: [] },
    },
    tts: { voice_id: 'voice-reviewed' },
  };
  const expected = buildConversationConfigWithToolIds(before, ['tool-1', 'tool-2']);
  assert.deepEqual(
    findAgentToolAttachmentMutationIssues(before, expected, ['tool-1', 'tool-2']),
    [],
  );

  const changedVoice = structuredClone(expected);
  changedVoice.tts.voice_id = 'voice-unreviewed';
  assert.deepEqual(
    findAgentToolAttachmentMutationIssues(before, changedVoice, ['tool-1', 'tool-2']),
    ['tts.voice_id'],
  );
});

test('agent capability verification allows only governed read-only tool ids', () => {
  const safeAgent = {
    conversation_config: {
      language_presets: {
        es: { first_message_translation: 'Hola, soy Lilley.' },
      },
      agent: {
        prompt: {
          tool_ids: ['tool-1'],
          tools: [],
          built_in_tools: { end_call: null, update_state: null },
          mcp_server_ids: [],
          native_mcp_server_ids: [],
          knowledge_base: [],
          custom_llm: null,
          rag: { enabled: false },
          enable_parallel_tool_calls: false,
        },
      },
    },
    workflow: {
      edges: {},
      nodes: {
        start_node: {
          type: 'start',
          position: { x: 0, y: 0 },
          edge_order: [],
          parent_subgraph_id: null,
        },
      },
      prevent_subagent_loops: false,
      subgraphs: {},
    },
    platform_settings: {
      privacy: { zero_retention_mode: true },
      data_collection: {},
      data_collection_scopes: {},
      overrides: {
        conversation_config_override: {
          conversation: { text_only: false, max_duration_seconds: false },
          agent: { prompt: { prompt: false, tool_ids: false, knowledge_base: false } },
        },
        custom_llm_extra_body: false,
        enable_conversation_initiation_client_data_from_webhook: false,
        enable_starting_workflow_node_id_from_client: false,
        enable_procedure_ids_from_client: false,
      },
      workspace_overrides: {
        conversation_initiation_client_data_webhook: null,
        webhooks: { post_call_webhook_id: null },
      },
    },
  };
  assert.deepEqual(
    findMemberAgentCapabilityIssues(safeAgent, ['tool-1'], { requireExactToolIds: true }),
    [],
  );

  const unsafeAgent = structuredClone(safeAgent) as unknown as {
    conversation_config: {
      agent: { prompt: Record<string, unknown> };
      language_presets?: Record<string, unknown>;
    };
    workflow?: Record<string, unknown>;
    platform_settings: {
      privacy: Record<string, unknown>;
      overrides: {
        conversation_config_override: {
          agent: { prompt: Record<string, unknown> };
        };
        enable_procedure_ids_from_client: boolean;
      };
      workspace_overrides: { webhooks: Record<string, unknown> };
    };
  };
  const unsafePrompt = unsafeAgent.conversation_config.agent.prompt;
  unsafePrompt.mcp_server_ids = ['mcp-unreviewed'];
  unsafePrompt.knowledge_base = [{ id: 'kb-unreviewed' }];
  (unsafePrompt.built_in_tools as Record<string, unknown>).update_state = { enabled: true };
  unsafeAgent.platform_settings.overrides.conversation_config_override.agent.prompt.tool_ids = true;
  unsafeAgent.platform_settings.overrides.enable_procedure_ids_from_client = true;
  unsafeAgent.platform_settings.workspace_overrides.webhooks.post_call_webhook_id = 'webhook-1';
  Object.assign(unsafeAgent, {
    workflow: {
      edges: {
        start_to_tool: { source: 'start_node', target: 'tool_node' },
      },
      nodes: {
        start_node: {
          type: 'start',
          position: { x: 0, y: 0 },
          edge_order: ['start_to_tool'],
          parent_subgraph_id: null,
        },
        tool_node: { type: 'tool', position: { x: 0, y: 0 }, edge_order: [], tools: [] },
      },
      prevent_subagent_loops: false,
    },
  });
  Object.assign(unsafeAgent.conversation_config, {
    language_presets: {
      es: {
        first_message_translation: 'Hola',
        overrides: { agent: { prompt: { tool_ids: ['tool-unreviewed'] } } },
      },
      fr: {
        prompt: 'Unreviewed language-specific prompt',
        tool_ids: ['tool-unreviewed'],
        tools: [{ type: 'client', name: 'unreviewed' }],
        knowledge_base: [{ id: 'kb-unreviewed' }],
      },
    },
  });
  unsafeAgent.platform_settings.privacy = {
    record_voice: false,
    retention_days: 30,
    delete_transcript_and_pii: false,
    delete_audio: false,
    zero_retention_mode: false,
  };

  const issues = findMemberAgentCapabilityIssues(unsafeAgent, ['tool-1'], {
    requireExactToolIds: true,
  });
  assert.ok(issues.includes('conversation_config.agent.prompt.mcp_server_ids'));
  assert.ok(issues.includes('conversation_config.agent.prompt.knowledge_base'));
  assert.ok(issues.includes('conversation_config.agent.prompt.built_in_tools'));
  assert.ok(
    issues.includes('platform_settings.overrides.conversation_config_override'),
  );
  assert.ok(
    issues.includes('platform_settings.overrides.conversation_config_override.agent.prompt'),
  );
  assert.ok(
    issues.includes('platform_settings.workspace_overrides.webhooks.post_call_webhook_id'),
  );
  assert.ok(issues.includes('platform_settings.overrides.enable_procedure_ids_from_client'));
  assert.ok(issues.includes('workflow'));
  assert.ok(issues.includes('conversation_config.language_presets.es.overrides'));
  assert.ok(
    issues.includes(
      'conversation_config.language_presets.es.overrides.agent.prompt.tool_ids',
    ),
  );
  assert.ok(issues.includes('conversation_config.language_presets.es.overrides.agent.prompt'));
  assert.ok(issues.includes('conversation_config.language_presets.fr.prompt'));
  assert.ok(issues.includes('conversation_config.language_presets.fr.tool_ids'));
  assert.ok(issues.includes('conversation_config.language_presets.fr.tools'));
  assert.ok(issues.includes('conversation_config.language_presets.fr.knowledge_base'));
  assert.ok(issues.includes('platform_settings.privacy'));
});

test('agent capability verification rejects every active conversation override surface', () => {
  const safeAgent = {
    conversation_config: { agent: { prompt: { tool_ids: [] } } },
    platform_settings: {
      privacy: { zero_retention_mode: true },
      overrides: {
        conversation_config_override: {
          agent: {
            first_message: false,
            language: false,
            prompt: {
              prompt: false,
              tool_ids: false,
              tools: false,
              knowledge_base: false,
            },
          },
          tts: { voice_id: false, model_id: null },
          asr: { keywords: [] },
          turn: null,
          conversation: { text_only: false, max_duration_seconds: false },
        },
      },
    },
  };
  const issuePath = 'platform_settings.overrides.conversation_config_override';

  assert.deepEqual(findMemberAgentCapabilityIssues(safeAgent, []), []);

  const adversarialOverrides = [
    { agent: { first_message: true } },
    { agent: { language: true } },
    { agent: { prompt: { prompt: true } } },
    { tts: { voice_id: true } },
    { tts: { voice_id: 'voice-unreviewed' } },
    { asr: { keywords: ['unreviewed-keyword'] } },
    { conversation: { text_only: true } },
    { conversation: { max_duration_seconds: true } },
  ];
  for (const conversationConfigOverride of adversarialOverrides) {
    const adversarialAgent = structuredClone(safeAgent) as unknown as {
      conversation_config: typeof safeAgent.conversation_config;
      platform_settings: {
        privacy: typeof safeAgent.platform_settings.privacy;
        overrides: { conversation_config_override: Record<string, unknown> };
      };
    };
    adversarialAgent.platform_settings.overrides.conversation_config_override =
      conversationConfigOverride;
    assert.ok(
      findMemberAgentCapabilityIssues(adversarialAgent, []).includes(issuePath),
      `Expected ${issuePath} for ${JSON.stringify(conversationConfigOverride)}`,
    );
  }
});

test('agent capability verification accepts only the provider inert workflow graph', () => {
  type WorkflowFixture = {
    edges: Record<string, unknown>;
    nodes: Record<string, Record<string, unknown>>;
    prevent_subagent_loops: boolean;
    subgraphs?: Record<string, unknown>;
    [key: string]: unknown;
  };

  const inertWorkflow: WorkflowFixture = {
    edges: {},
    nodes: {
      start_node: {
        type: 'start',
        position: { x: 0, y: 0 },
        edge_order: [],
        parent_subgraph_id: null,
      },
    },
    prevent_subagent_loops: false,
    subgraphs: {},
  };
  const agentWithWorkflow = (workflow: unknown) => ({
    conversation_config: { agent: { prompt: { tool_ids: [] } } },
    platform_settings: { privacy: { zero_retention_mode: true } },
    workflow,
  });

  for (const absentWorkflow of [undefined, null, {}]) {
    assert.deepEqual(
      findMemberAgentCapabilityIssues(agentWithWorkflow(absentWorkflow), []),
      [],
      `Expected absent workflow to be inert: ${JSON.stringify(absentWorkflow)}`,
    );
  }

  for (const malformedWorkflow of ['', [], false, 0]) {
    assert.ok(
      findMemberAgentCapabilityIssues(agentWithWorkflow(malformedWorkflow), []).includes(
        'workflow',
      ),
      `Expected malformed workflow to fail closed: ${JSON.stringify(malformedWorkflow)}`,
    );
  }

  assert.deepEqual(findMemberAgentCapabilityIssues(agentWithWorkflow(inertWorkflow), []), []);

  const mutations: Array<(workflow: WorkflowFixture) => void> = [
    (workflow) => {
      workflow.edges.start_to_tool = { source: 'start_node', target: 'tool_node' };
    },
    (workflow) => {
      workflow.nodes.tool_node = { type: 'tool', tools: [] };
    },
    (workflow) => {
      workflow.nodes.start_node.edge_order = ['start_to_tool'];
    },
    (workflow) => {
      workflow.nodes.start_node.type = 'override_agent';
    },
    (workflow) => {
      workflow.nodes.start_node.parent_subgraph_id = 'subgraph-1';
    },
    (workflow) => {
      workflow.nodes.start_node.position = { x: 1, y: 0 };
    },
    (workflow) => {
      workflow.subgraphs = { 'subgraph-1': {} };
    },
    (workflow) => {
      workflow.procedures = {};
    },
  ];
  for (const mutate of mutations) {
    const workflow = structuredClone(inertWorkflow);
    mutate(workflow);
    assert.ok(
      findMemberAgentCapabilityIssues(agentWithWorkflow(workflow), []).includes('workflow'),
      `Expected workflow issue for ${JSON.stringify(workflow)}`,
    );
  }
});

test('agent capability verification accepts only explicit member privacy postures', () => {
  const baseAgent = {
    conversation_config: { agent: { prompt: { tool_ids: [] } }, language_presets: {} },
    platform_settings: {
      privacy: {
        record_voice: false,
        retention_days: 0,
        delete_transcript_and_pii: true,
        delete_audio: true,
        zero_retention_mode: false,
      },
    },
  };

  assert.deepEqual(findMemberAgentCapabilityIssues(baseAgent, []), []);

  const zeroRetention = structuredClone(baseAgent) as unknown as {
    conversation_config: typeof baseAgent.conversation_config;
    platform_settings: { privacy: Record<string, unknown> };
  };
  zeroRetention.platform_settings.privacy = { zero_retention_mode: true };
  assert.deepEqual(findMemberAgentCapabilityIssues(zeroRetention, []), []);

  const missingPrivacy = structuredClone(baseAgent) as {
    conversation_config: typeof baseAgent.conversation_config;
    platform_settings: { privacy?: unknown };
  };
  delete missingPrivacy.platform_settings.privacy;
  assert.deepEqual(findMemberAgentCapabilityIssues(missingPrivacy, []), [
    'platform_settings.privacy',
  ]);

  const malformedPrivacy = structuredClone(baseAgent);
  malformedPrivacy.platform_settings.privacy.retention_days = '0' as unknown as number;
  assert.deepEqual(findMemberAgentCapabilityIssues(malformedPrivacy, []), [
    'platform_settings.privacy',
  ]);
});

test('tool update timeout is reconciled when the provider applied the desired state', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const initial = {
    id: 'tool-existing',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Prior reviewed description.' },
    response_mocks: [{ body: { memberFacingMessage: 'Prior provider mock.' } }],
  };
  let live = structuredClone(initial);
  const provider = {
    getTool: async () => structuredClone(live),
    getToolDependentsPage: async () => ({ agents: [], branches: [], has_more: false }),
    updateTool: async (_id: string, toolConfig: unknown, responseMocks: unknown) => {
      live.tool_config = structuredClone(toolConfig) as typeof live.tool_config;
      live.response_mocks = structuredClone(responseMocks) as typeof live.response_mocks;
      throw new Error('simulated timeout after apply');
    },
  };

  const result = await reconcileGovernedToolMutation({
    provider,
    manifest,
    definition,
    reviewedBranchId,
    existing: initial,
    apply: true,
  });

  assert.equal(result.action, 'reconciled');
  assert.deepEqual(live.tool_config, desired);
  assert.deepEqual(live.response_mocks, []);
  const mutation = result.mutation;
  assert.ok(mutation);
  assert.equal(mutation.kind, 'updated');
  assert.ok('beforeToolConfig' in mutation);
  assert.deepEqual(mutation.beforeToolConfig, initial.tool_config);
  assert.deepEqual(mutation.beforeResponseMocks, initial.response_mocks);
});

test('existing tool update preserves an unreadable post-write state without a rollback PATCH', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const initial = {
    id: 'tool-unreadable-after-update',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Prior reviewed description.' },
    response_mocks: [],
  };
  let getCalls = 0;
  let updateCalls = 0;
  const provider = {
    getTool: async () => {
      getCalls += 1;
      if (getCalls === 1) return structuredClone(initial);
      throw new Error('simulated provider read outage');
    },
    getToolDependentsPage: async () => ({ agents: [], branches: [], has_more: false }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing: initial,
      apply: true,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /MANUAL_RECOVERY_REQUIRED.*cannot be read back/);
      assert.equal(
        (error as Error & { preserveToolState?: boolean }).preserveToolState,
        true,
      );
      return true;
    },
  );
  assert.equal(updateCalls, 1);
});

test('existing tool update preserves concurrent third-state drift without a rollback PATCH', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const initial = {
    id: 'tool-concurrent-after-update',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Prior reviewed description.' },
    response_mocks: [],
  };
  const concurrent = {
    ...structuredClone(initial),
    tool_config: { ...structuredClone(desired), description: 'Concurrent operator edit.' },
  };
  let live = structuredClone(initial);
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(live),
    getToolDependentsPage: async () => ({ agents: [], branches: [], has_more: false }),
    updateTool: async () => {
      updateCalls += 1;
      live = structuredClone(concurrent);
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing: initial,
      apply: true,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /MANUAL_RECOVERY_REQUIRED.*concurrent or unexpected state/);
      assert.equal(
        (error as Error & { preserveToolState?: boolean }).preserveToolState,
        true,
      );
      return true;
    },
  );
  assert.equal(updateCalls, 1);
  assert.deepEqual(live, concurrent);
});

test('existing tool update exact preimage fails without a redundant rollback PATCH', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const initial = {
    id: 'tool-update-preimage',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Prior reviewed description.' },
    response_mocks: [],
  };
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(initial),
    getToolDependentsPage: async () => ({ agents: [], branches: [], has_more: false }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing: initial,
      apply: true,
    }),
    /UPDATE_TOOL.*did not apply; original preimage remains/,
  );
  assert.equal(updateCalls, 1);
});

test('dependent-agent pagination is complete and cursor-bounded', async () => {
  const cursors: Array<string | undefined> = [];
  const provider = {
    getToolDependentsPage: async (_toolId: string, cursor?: string) => {
      cursors.push(cursor);
      if (!cursor) {
        return {
          agents: [{ id: manifest.agentId }],
          branches: [],
          has_more: true,
          next_cursor: 'page-2',
        };
      }
      return {
        agents: [],
        branches: [{ agent_id: manifest.agentId, branch_id: 'branch-main', is_main: true }],
        has_more: false,
      };
    },
  };

  const dependencies = await readCompleteToolDependencies(provider, 'tool-paginated');
  assert.deepEqual(cursors, [undefined, 'page-2']);
  assert.equal(dependencies.agents.length, 1);
  assert.equal(dependencies.branches.length, 1);
});

test('existing tool update is blocked when another agent depends on the tool', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const existing = {
    id: 'tool-shared',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Drifted description.' },
    response_mocks: [],
  };
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(existing),
    getToolDependentsPage: async () => ({
      agents: [{ id: 'agent_unreviewed' }],
      branches: [],
      has_more: false,
    }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing,
      apply: true,
    }),
    /TOOL_DEPENDENCY_BLOCKED.*unreviewed dependent agent/,
  );
  assert.equal(updateCalls, 0);
});

test('already-desired tool verification rejects an unreviewed dependent agent', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const existing = {
    id: 'tool-desired-shared-agent',
    access_info: { is_creator: true },
    tool_config: structuredClone(desired),
    response_mocks: [],
  };
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(existing),
    getToolDependentsPage: async () => ({
      agents: [{ id: 'agent_unreviewed' }],
      branches: [],
      has_more: false,
    }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing,
      apply: false,
    }),
    /TOOL_DEPENDENCY_BLOCKED.*unreviewed dependent agent/,
  );
  assert.equal(updateCalls, 0);
});

test('already-desired tool verification rejects an unreviewed dependent branch', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const existing = {
    id: 'tool-desired-shared-branch',
    access_info: { is_creator: true },
    tool_config: structuredClone(desired),
    response_mocks: [],
  };
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(existing),
    getToolDependentsPage: async () => ({
      agents: [],
      branches: [
        { agent_id: manifest.agentId, branch_id: 'branch-other-main', is_main: true },
      ],
      has_more: false,
    }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing,
      apply: false,
    }),
    /TOOL_DEPENDENCY_BLOCKED.*unreviewed dependent branch/,
  );
  assert.equal(updateCalls, 0);
});

test('existing tool update rejects a same-agent non-main dependent branch', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const existing = {
    id: 'tool-non-main-branch',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Drifted description.' },
    response_mocks: [],
  };
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(existing),
    getToolDependentsPage: async () => ({
      agents: [],
      branches: [
        { agent_id: manifest.agentId, branch_id: 'branch-unreviewed', is_main: false },
      ],
      has_more: false,
    }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing,
      apply: true,
    }),
    /TOOL_DEPENDENCY_BLOCKED.*non-main dependent branch/,
  );
  assert.equal(updateCalls, 0);
});

test('existing tool update rejects a different main branch of the reviewed agent', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const existing = {
    id: 'tool-other-main-branch',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Drifted description.' },
    response_mocks: [],
  };
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(existing),
    getToolDependentsPage: async () => ({
      agents: [],
      branches: [
        { agent_id: manifest.agentId, branch_id: 'branch-other-main', is_main: true },
      ],
      has_more: false,
    }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing,
      apply: true,
    }),
    /TOOL_DEPENDENCY_BLOCKED.*unreviewed dependent branch/,
  );
  assert.equal(updateCalls, 0);
});

test('existing tool update rejects incomplete dependent branch identity', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const existing = {
    id: 'tool-incomplete-branch',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Drifted description.' },
    response_mocks: [],
  };
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(existing),
    getToolDependentsPage: async () => ({
      agents: [],
      branches: [{ agent_id: manifest.agentId, branch_id: '', is_main: true }],
      has_more: false,
    }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing,
      apply: true,
    }),
    /MANUAL_RECOVERY_REQUIRED.*dependent branch identity is incomplete/,
  );
  assert.equal(updateCalls, 0);
});

test('existing tool update is blocked on incomplete dependent-agent pagination', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const existing = {
    id: 'tool-incomplete-dependencies',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Drifted description.' },
    response_mocks: [],
  };
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(existing),
    getToolDependentsPage: async () => ({
      agents: [],
      branches: [],
      has_more: true,
    }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing,
      apply: true,
    }),
    /MANUAL_RECOVERY_REQUIRED.*dependent-agent pagination is incomplete/,
  );
  assert.equal(updateCalls, 0);
});

test('existing tool update fails closed when dependent branches are omitted', async () => {
  const definition = manifest.tools[0];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const existing = {
    id: 'tool-missing-dependent-branches',
    access_info: { is_creator: true },
    tool_config: { ...structuredClone(desired), description: 'Drifted description.' },
    response_mocks: [],
  };
  let updateCalls = 0;
  const provider = {
    getTool: async () => structuredClone(existing),
    getToolDependentsPage: async () => ({
      agents: [],
      has_more: false,
    }),
    updateTool: async () => {
      updateCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing,
      apply: true,
    }),
    /MANUAL_RECOVERY_REQUIRED.*dependent-agent response is incomplete/,
  );
  assert.equal(updateCalls, 0);
});

test('tool create timeout is reconciled by exact-name listing and ownership proof', async () => {
  const definition = manifest.tools[1];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  let live: Record<string, unknown> | null = null;
  const provider = {
    createTool: async (toolConfig: unknown, responseMocks: unknown) => {
      live = {
        id: 'tool-created',
        access_info: { is_creator: true },
        tool_config: structuredClone(toolConfig),
        response_mocks: structuredClone(responseMocks),
      };
      throw new Error('simulated timeout after apply');
    },
    listTools: async () => (live ? [structuredClone(live)] : []),
    getTool: async () => (live ? structuredClone(live) : null),
    getToolDependentsPage: async () => ({ agents: [], branches: [], has_more: false }),
  };

  const result = await reconcileGovernedToolMutation({
    provider,
    manifest,
    definition,
    reviewedBranchId,
    existing: null,
    apply: true,
  });

  assert.equal(result.action, 'reconciled');
  assert.equal(result.tool.id, 'tool-created');
  assert.deepEqual(result.tool.tool_config, desired);
  assert.deepEqual(result.tool.response_mocks, []);
  assert.deepEqual(result.mutation, {
    kind: 'created',
    id: 'tool-created',
    name: definition.name,
    createdToolConfig: desired,
    createdResponseMocks: [],
  });
});

test('newly created tool fails closed if a concurrent foreign dependency appears', async () => {
  const definition = manifest.tools[1];
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  const created = {
    id: 'tool-created-with-foreign-dependent',
    access_info: { is_creator: true },
    tool_config: structuredClone(desired),
    response_mocks: [],
  };
  let deleteCalls = 0;
  const provider = {
    createTool: async () => structuredClone(created),
    getTool: async () => structuredClone(created),
    getToolDependentsPage: async () => ({
      agents: [{ id: 'agent_unreviewed' }],
      branches: [],
      has_more: false,
    }),
    deleteTool: async () => {
      deleteCalls += 1;
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing: null,
      apply: true,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /MANUAL_RECOVERY_REQUIRED.*dependency state cannot be proven/);
      assert.equal(
        (error as Error & { preserveToolState?: boolean }).preserveToolState,
        true,
      );
      return true;
    },
  );
  assert.equal(deleteCalls, 0);
});

test('ambiguous create without a discoverable provider id fails closed for manual recovery', async () => {
  const definition = manifest.tools[2];
  let listAttempts = 0;
  const provider = {
    createTool: async () => {
      throw new Error('simulated timeout after unknown outcome');
    },
    listTools: async () => {
      listAttempts += 1;
      throw new Error('simulated listing outage');
    },
  };

  await assert.rejects(
    reconcileGovernedToolMutation({
      provider,
      manifest,
      definition,
      reviewedBranchId,
      existing: null,
      apply: true,
    }),
    /MANUAL_RECOVERY_REQUIRED.*create outcome is ambiguous and listing failed/,
  );
  assert.equal(listAttempts, 3);
});

test('agent attachment timeout is reconciled when exact desired tool ids were applied', async () => {
  const original = reviewedAgent();
  let live = structuredClone(original);
  const desiredToolIds = ['tool-1', 'tool-2', 'tool-3'];
  const provider = {
    getAgent: async () => structuredClone(live),
    patchAgentToolIds: async (_agentId: string, toolIds: string[]) => {
      live.conversation_config.agent.prompt.tool_ids = [...toolIds];
      throw new Error('simulated timeout after apply');
    },
  };

  const result = await attachGovernedToolsWithReconciliation({
    provider,
    agentId: manifest.agentId,
    originalAgent: original,
    agentPatch,
    reviewedBranchId,
    desiredToolIds,
    apply: true,
  });

  assert.equal(result.action, 'reconciled');
  assert.deepEqual(live.conversation_config.agent.prompt.tool_ids, desiredToolIds);
});

test('agent attachment refuses missing ownership before provider mutation', async () => {
  const original = reviewedAgent();
  delete original.access_info;
  let patchCalls = 0;
  const provider = {
    getAgent: async () => structuredClone(original),
    patchAgentToolIds: async () => {
      patchCalls += 1;
    },
  };

  await assert.rejects(
    attachGovernedToolsWithReconciliation({
      provider,
      agentId: manifest.agentId,
      originalAgent: original,
      agentPatch,
      reviewedBranchId,
      desiredToolIds: ['tool-1'],
      apply: true,
    }),
    /not proven to be owned/,
  );
  assert.equal(patchCalls, 0);
});

test('agent attachment rejects a wrong preflight branch before provider mutation', async () => {
  const original = reviewedAgent();
  const wrongBranch = reviewedAgent();
  wrongBranch.branch_id = 'branch-other';
  let patchCalls = 0;
  const provider = {
    getAgent: async () => structuredClone(wrongBranch),
    patchAgentToolIds: async () => {
      patchCalls += 1;
    },
  };

  await assert.rejects(
    attachGovernedToolsWithReconciliation({
      provider,
      agentId: manifest.agentId,
      originalAgent: original,
      agentPatch,
      reviewedBranchId,
      desiredToolIds: ['tool-1'],
      apply: true,
    }),
    /AGENT_BRANCH_MISMATCH.*reviewed branch/,
  );
  assert.equal(patchCalls, 0);
});

test('agent attachment preserves a post-write non-main branch readback without rollback', async () => {
  const original = reviewedAgent();
  let live = structuredClone(original);
  let getCalls = 0;
  let patchCalls = 0;
  const provider = {
    getAgent: async () => {
      getCalls += 1;
      if (getCalls === 1) return structuredClone(original);
      return structuredClone(live);
    },
    patchAgentToolIds: async (_agentId: string, toolIds: string[]) => {
      patchCalls += 1;
      live.conversation_config.agent.prompt.tool_ids = [...toolIds];
      live.main_branch_id = 'branch-other-main';
    },
  };

  await assert.rejects(
    attachGovernedToolsWithReconciliation({
      provider,
      agentId: manifest.agentId,
      originalAgent: original,
      agentPatch,
      reviewedBranchId,
      desiredToolIds: ['tool-1'],
      apply: true,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /MANUAL_RECOVERY_REQUIRED.*identity, branch, or ownership/);
      assert.equal(
        (error as Error & { preserveToolState?: boolean }).preserveToolState,
        true,
      );
      return true;
    },
  );
  assert.equal(patchCalls, 1);
  assert.deepEqual(live.conversation_config.agent.prompt.tool_ids, ['tool-1']);
  assert.equal(live.main_branch_id, 'branch-other-main');
});

test('concurrent agent drift is preserved without a rollback PATCH', async () => {
  const original = reviewedAgent();
  let live = structuredClone(original);
  let patchCalls = 0;
  const provider = {
    getAgent: async () => structuredClone(live),
    patchAgentToolIds: async (_agentId: string, toolIds: string[]) => {
      patchCalls += 1;
      live.conversation_config.agent.prompt.tool_ids = [...toolIds];
      if (patchCalls === 1) {
        live.conversation_config.tts.voice_id = 'voice-concurrent-drift';
      }
      return structuredClone(live);
    },
  };

  await assert.rejects(
    attachGovernedToolsWithReconciliation({
      provider,
      agentId: manifest.agentId,
      originalAgent: original,
      agentPatch,
      reviewedBranchId,
      desiredToolIds: ['tool-1'],
      apply: true,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(
        error.message,
        /MANUAL_RECOVERY_REQUIRED.*concurrent or unexpected agent state/,
      );
      assert.equal(
        (error as Error & { preserveToolState?: boolean }).preserveToolState,
        true,
      );
      return true;
    },
  );
  assert.equal(patchCalls, 1);
  assert.deepEqual(live.conversation_config.agent.prompt.tool_ids, ['tool-1']);
  assert.equal(live.conversation_config.tts.voice_id, 'voice-concurrent-drift');
});

test('unreadable agent attachment outcome is preserved without a rollback PATCH', async () => {
  const original = reviewedAgent();
  let live = structuredClone(original);
  let getCalls = 0;
  let patchCalls = 0;
  const provider = {
    getAgent: async () => {
      getCalls += 1;
      if (getCalls === 1) return structuredClone(live);
      throw new Error('simulated provider read outage');
    },
    patchAgentToolIds: async (_agentId: string, toolIds: string[]) => {
      patchCalls += 1;
      live.conversation_config.agent.prompt.tool_ids = [...toolIds];
    },
  };

  await assert.rejects(
    attachGovernedToolsWithReconciliation({
      provider,
      agentId: manifest.agentId,
      originalAgent: original,
      agentPatch,
      reviewedBranchId,
      desiredToolIds: ['tool-1'],
      apply: true,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /MANUAL_RECOVERY_REQUIRED.*outcome is unreadable/);
      assert.equal(
        (error as Error & { preserveToolState?: boolean }).preserveToolState,
        true,
      );
      return true;
    },
  );
  assert.equal(patchCalls, 1);
  assert.deepEqual(live.conversation_config.agent.prompt.tool_ids, ['tool-1']);
});

test('agent attachment exact preimage fails without a redundant rollback PATCH', async () => {
  const original = reviewedAgent();
  let patchCalls = 0;
  const provider = {
    getAgent: async () => structuredClone(original),
    patchAgentToolIds: async () => {
      patchCalls += 1;
    },
  };

  await assert.rejects(
    attachGovernedToolsWithReconciliation({
      provider,
      agentId: manifest.agentId,
      originalAgent: original,
      agentPatch,
      reviewedBranchId,
      desiredToolIds: ['tool-1'],
      apply: true,
    }),
    /ATTACH_AGENT_TOOLS did not apply; original preimage remains/,
  );
  assert.equal(patchCalls, 1);
});

test('member sync rechecks every tool dependency after attachment and preserves foreign drift', async () => {
  const tools: Array<{
    id: string;
    access_info: { is_creator: boolean };
    tool_config: ReturnType<typeof buildMemberAgentWebhookToolConfig>;
    response_mocks: unknown[];
  }> = manifest.tools.map(
    (definition: (typeof manifest.tools)[number], index: number) => ({
      id: `tool-final-dependency-race-${index + 1}`,
      access_info: { is_creator: true },
      tool_config: buildMemberAgentWebhookToolConfig(manifest, definition),
      response_mocks: [],
    }),
  );
  let liveAgent = reviewedAgent();
  let dependencyCalls = 0;
  let patchCalls = 0;
  const provider = {
    getAgent: async () => structuredClone(liveAgent),
    listTools: async () => structuredClone(tools),
    getTool: async (toolId: string) =>
      structuredClone(tools.find((tool) => tool.id === toolId) ?? null),
    getToolDependentsPage: async () => {
      dependencyCalls += 1;
      if (dependencyCalls <= tools.length) {
        return { agents: [], branches: [], has_more: false };
      }
      return {
        agents: [{ id: 'agent_unreviewed' }],
        branches: [],
        has_more: false,
      };
    },
    patchAgentToolIds: async (_agentId: string, toolIds: string[]) => {
      patchCalls += 1;
      liveAgent.conversation_config.agent.prompt.tool_ids = [...toolIds];
    },
  };

  await assert.rejects(
    runMemberAgentToolSync({
      provider,
      manifest,
      agentPatch,
      reviewedBranchId,
      apply: true,
      log: () => undefined,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /MANUAL_RECOVERY_REQUIRED.*dependency state cannot be proven/);
      assert.equal(
        (error as Error & { preserveToolState?: boolean }).preserveToolState,
        true,
      );
      return true;
    },
  );
  assert.equal(dependencyCalls, tools.length + 1);
  assert.equal(patchCalls, 1);
  assert.deepEqual(
    liveAgent.conversation_config.agent.prompt.tool_ids,
    tools.map((tool) => tool.id),
  );
});

test('automatic rollback never performs a provider read, PATCH, or DELETE', async () => {
  let providerCalls = 0;
  const provider = new Proxy(
    {},
    {
      get: () => async () => {
        providerCalls += 1;
      },
    },
  );

  await assert.rejects(
    rollbackGovernedToolMutations(provider, [
      { kind: 'created', id: 'tool-created', name: manifest.tools[0].name },
      { kind: 'updated', id: 'tool-updated', name: manifest.tools[1].name },
    ]),
    /MANUAL_RECOVERY_REQUIRED.*automatic rollback is disabled/,
  );
  assert.equal(providerCalls, 0);
});

test('an empty mutation ledger needs no provider recovery', async () => {
  await rollbackGovernedToolMutations({}, []);
});
