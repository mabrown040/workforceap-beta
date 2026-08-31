const ALLOWED_TOOL_NAMES = new Set([
  'get_my_next_step',
  'get_training_status',
  'get_coursera_progress',
]);

const ALLOWED_PROVIDER_TOOL_CONFIG_KEYS = new Set([
  'type',
  'name',
  'description',
  'api_schema',
  'response_timeout_secs',
  'tool_error_handling_mode',
  'execution_mode',
  'pre_tool_speech',
  'interruption_mode',
  // Readback-only provider defaults. Each is separately constrained below.
  'assignments',
  'dynamic_variables',
  'response_mocks',
  'force_pre_tool_speech',
  'disable_interruptions',
  'tool_call_sound',
  'tool_call_sound_behavior',
  'tool_version',
  'api_schema_overrides',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateMemberAgentToolManifest(manifest) {
  if (!isPlainObject(manifest) || manifest.schemaVersion !== 1) {
    throw new Error('Unsupported member-agent tool manifest.');
  }
  if (!/^agent_[A-Za-z0-9]+$/.test(manifest.agentId ?? '')) {
    throw new Error('Manifest agentId is invalid.');
  }
  if (manifest.agentKey !== 'counselor') {
    throw new Error('Only the reviewed member counselor can receive these tools.');
  }
  const baseUrl = new URL(manifest.toolEndpointBaseUrl);
  if (
    baseUrl.protocol !== 'https:' ||
    baseUrl.hostname !== 'www.workforceap.org' ||
    baseUrl.pathname.replace(/\/$/, '') !== '/api/agent-tools/v1'
  ) {
    throw new Error('Tool endpoint must be the canonical WorkforceAP production gateway.');
  }
  if (!/^secret__[A-Za-z0-9_]+$/.test(manifest.secretDynamicVariable ?? '')) {
    throw new Error('Tool authorization must use an ElevenLabs secret dynamic variable.');
  }
  if (
    !isPlainObject(manifest.toolExecutionPolicy) ||
    manifest.toolExecutionPolicy.executionMode !== 'immediate' ||
    manifest.toolExecutionPolicy.preToolSpeech !== 'off' ||
    manifest.toolExecutionPolicy.interruptionMode !== 'allow' ||
    Object.keys(manifest.toolExecutionPolicy).sort().join(',') !==
      'executionMode,interruptionMode,preToolSpeech'
  ) {
    throw new Error(
      'Member tools must execute immediately, without pre-tool speech, and remain interruptible.',
    );
  }
  if (!Array.isArray(manifest.tools) || manifest.tools.length !== ALLOWED_TOOL_NAMES.size) {
    throw new Error('Manifest must define exactly the approved member tools.');
  }
  const names = manifest.tools.map((tool) => tool?.name);
  if (new Set(names).size !== names.length || names.some((name) => !ALLOWED_TOOL_NAMES.has(name))) {
    throw new Error('Manifest contains a duplicate or unapproved member tool.');
  }
  for (const tool of manifest.tools) {
    if (typeof tool.description !== 'string' || tool.description.trim().length < 40) {
      throw new Error(`Tool ${tool.name} needs a precise description.`);
    }
  }
  return manifest;
}

export function buildMemberAgentWebhookToolConfig(manifest, tool) {
  validateMemberAgentToolManifest(manifest);
  if (!manifest.tools.some((candidate) => candidate.name === tool.name)) {
    throw new Error(`Tool ${tool.name} is not in the governed manifest.`);
  }
  return {
    type: 'webhook',
    name: tool.name,
    description: tool.description,
    api_schema: {
      url: `${manifest.toolEndpointBaseUrl.replace(/\/$/, '')}/${tool.name}`,
      method: 'POST',
      request_headers: {
        Authorization: { variable_name: manifest.secretDynamicVariable },
      },
    },
    response_timeout_secs: 10,
    tool_error_handling_mode: 'hide',
    execution_mode: manifest.toolExecutionPolicy.executionMode,
    pre_tool_speech: manifest.toolExecutionPolicy.preToolSpeech,
    interruption_mode: manifest.toolExecutionPolicy.interruptionMode,
  };
}

export function findPartialMismatches(actual, expected, path = []) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return [path.join('.') || '<root>'];
    }
    return expected.flatMap((value, index) =>
      findPartialMismatches(actual[index], value, [...path, String(index)]),
    );
  }
  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) return [path.join('.') || '<root>'];
    return Object.entries(expected).flatMap(([key, value]) =>
      findPartialMismatches(actual[key], value, [...path, key]),
    );
  }
  return Object.is(actual, expected) ? [] : [path.join('.') || '<root>'];
}

function isEmptyProviderField(value) {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function isEmptyProviderDynamicVariables(value) {
  if (isEmptyProviderField(value)) return true;
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === 1 &&
    keys[0] === 'dynamic_variable_placeholders' &&
    isEmptyProviderField(value.dynamic_variable_placeholders)
  );
}

/**
 * Verify the complete security boundary of a governed webhook tool. Provider
 * defaults may add empty schema containers, but they may never add another
 * input channel, credential source, assignment, mock, or dynamic variable.
 */
export function findMemberAgentToolSecurityIssues(actualToolOrConfig, expected) {
  const wrapper = isPlainObject(actualToolOrConfig?.tool_config)
    ? actualToolOrConfig
    : null;
  const actual = wrapper ? wrapper.tool_config : actualToolOrConfig;
  const issues = [...findPartialMismatches(actual, expected)];
  if (!isPlainObject(actual)) return [...new Set(issues)];
  if (actual.type !== 'webhook') issues.push('type');

  for (const key of Object.keys(actual)) {
    if (!ALLOWED_PROVIDER_TOOL_CONFIG_KEYS.has(key)) {
      issues.push(`tool_config.${key}`);
    }
  }

  const schema = actual.api_schema;
  if (!isPlainObject(schema)) {
    issues.push('api_schema');
    return [...new Set(issues)];
  }

  const headers = schema.request_headers;
  if (
    !isPlainObject(headers) ||
    Object.keys(headers).length !== 1 ||
    !Object.hasOwn(headers, 'Authorization')
  ) {
    issues.push('api_schema.request_headers');
  }

  for (const key of [
    'path_params_schema',
    'query_params_schema',
    'request_body_schema',
    'auth_connection',
    'auth_resolved_params',
  ]) {
    if (!isEmptyProviderField(schema[key])) issues.push(`api_schema.${key}`);
  }

  const allowedSchemaKeys = new Set([
    'url',
    'method',
    'request_headers',
    'content_type',
    'path_params_schema',
    'query_params_schema',
    'request_body_schema',
    'auth_connection',
    'auth_resolved_params',
  ]);
  for (const key of Object.keys(schema)) {
    if (!allowedSchemaKeys.has(key)) issues.push(`api_schema.${key}`);
  }
  if (
    schema.content_type !== undefined &&
    !['application/json', 'application/json; charset=utf-8'].includes(
      String(schema.content_type).toLowerCase(),
    )
  ) {
    issues.push('api_schema.content_type');
  }

  for (const key of ['assignments', 'response_mocks']) {
    if (!isEmptyProviderField(actual[key])) issues.push(key);
    if (wrapper && !isEmptyProviderField(wrapper[key])) issues.push(`<tool>.${key}`);
  }
  if (!isEmptyProviderDynamicVariables(actual.dynamic_variables)) {
    issues.push('dynamic_variables');
  }
  if (wrapper && !isEmptyProviderDynamicVariables(wrapper.dynamic_variables)) {
    issues.push('<tool>.dynamic_variables');
  }

  for (const key of ['force_pre_tool_speech', 'disable_interruptions']) {
    if (![undefined, null, false].includes(actual[key])) issues.push(key);
  }
  if (![undefined, null, 'off'].includes(actual.tool_call_sound)) {
    issues.push('tool_call_sound');
  }
  if (
    actual.tool_call_sound_behavior !== undefined &&
    actual.tool_call_sound_behavior !== null &&
    actual.tool_call_sound_behavior !== 'auto'
  ) {
    issues.push('tool_call_sound_behavior');
  }
  if (!isEmptyProviderField(actual.api_schema_overrides)) {
    issues.push('api_schema_overrides');
  }
  if (
    actual.tool_version !== undefined &&
    actual.tool_version !== null &&
    (typeof actual.tool_version !== 'string' || actual.tool_version.length === 0)
  ) {
    issues.push('tool_version');
  }

  return [...new Set(issues)].sort();
}

function findExactMismatches(actual, expected, path = []) {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) {
      return [path.join('.') || '<root>'];
    }
    return expected.flatMap((value, index) =>
      findExactMismatches(actual[index], value, [...path, String(index)]),
    );
  }
  if (isPlainObject(expected) || isPlainObject(actual)) {
    if (!isPlainObject(actual) || !isPlainObject(expected)) {
      return [path.join('.') || '<root>'];
    }
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (
      actualKeys.length !== expectedKeys.length ||
      actualKeys.some((key, index) => key !== expectedKeys[index])
    ) {
      return [path.join('.') || '<root>'];
    }
    return expectedKeys.flatMap((key) =>
      findExactMismatches(actual[key], expected[key], [...path, key]),
    );
  }
  return Object.is(actual, expected) ? [] : [path.join('.') || '<root>'];
}

export function buildConversationConfigWithToolIds(conversationConfig, toolIds) {
  if (!isPlainObject(conversationConfig)) {
    throw new Error('Agent conversation_config is missing.');
  }
  const expected = structuredClone(conversationConfig);
  if (!isPlainObject(expected.agent) || !isPlainObject(expected.agent.prompt)) {
    throw new Error('Agent prompt configuration is missing.');
  }
  expected.agent.prompt.tool_ids = [...toolIds];
  return expected;
}

export function findAgentToolAttachmentMutationIssues(beforeConfig, afterConfig, toolIds) {
  const expected = buildConversationConfigWithToolIds(beforeConfig, toolIds);
  return findExactMismatches(afterConfig, expected);
}

function hasActiveProviderCapability(value) {
  if (value === undefined || value === null || value === false || value === '' || value === 0) {
    return false;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) {
    return Object.values(value).some(hasActiveProviderCapability);
  }
  return true;
}

function findLanguagePresetCapabilityIssues(languagePresets) {
  if (isEmptyProviderField(languagePresets)) return [];
  if (!isPlainObject(languagePresets)) return ['conversation_config.language_presets'];

  const issues = [];
  const blockedKeys = new Set(['overrides', 'tool_ids', 'tools', 'knowledge_base', 'prompt']);
  const visit = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((child, index) => visit(child, [...path, String(index)]));
      return;
    }
    if (!isPlainObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = [...path, key];
      if (blockedKeys.has(key) && hasActiveProviderCapability(child)) {
        issues.push(childPath.join('.'));
      }
      visit(child, childPath);
    }
  };
  visit(languagePresets, ['conversation_config', 'language_presets']);
  return issues;
}

function hasSafeMemberPrivacyPosture(privacy) {
  if (!isPlainObject(privacy)) return false;
  if (privacy.zero_retention_mode === true) return true;
  return (
    privacy.record_voice === false &&
    privacy.retention_days === 0 &&
    privacy.delete_transcript_and_pii === true &&
    privacy.delete_audio === true
  );
}

/**
 * Lilley's provider capability boundary. The reviewed agent may use only the
 * governed webhook IDs; MCP, inline/client tools, provider knowledge bases,
 * RAG, custom LLMs, built-ins, and client/webhook overrides stay disabled.
 */
export function findMemberAgentCapabilityIssues(
  agent,
  allowedToolIds,
  { requireExactToolIds = false } = {},
) {
  const issues = [];
  const prompt = agent?.conversation_config?.agent?.prompt;
  if (!isPlainObject(prompt)) return ['conversation_config.agent.prompt'];

  const actualToolIds = Array.isArray(prompt.tool_ids) ? prompt.tool_ids : [];
  const allowed = new Set(allowedToolIds);
  if (
    actualToolIds.some((id) => typeof id !== 'string' || !allowed.has(id)) ||
    new Set(actualToolIds).size !== actualToolIds.length
  ) {
    issues.push('conversation_config.agent.prompt.tool_ids');
  }
  if (
    requireExactToolIds &&
    (actualToolIds.length !== allowed.size || [...allowed].some((id) => !actualToolIds.includes(id)))
  ) {
    issues.push('conversation_config.agent.prompt.tool_ids');
  }

  for (const key of [
    'tools',
    'mcp_server_ids',
    'native_mcp_server_ids',
    'knowledge_base',
    'built_in_tools',
    'custom_llm',
  ]) {
    if (hasActiveProviderCapability(prompt[key])) {
      issues.push(`conversation_config.agent.prompt.${key}`);
    }
  }
  if (prompt.rag?.enabled === true) {
    issues.push('conversation_config.agent.prompt.rag.enabled');
  }
  if (prompt.enable_parallel_tool_calls === true) {
    issues.push('conversation_config.agent.prompt.enable_parallel_tool_calls');
  }

  if (hasActiveProviderCapability(agent?.workflow)) {
    issues.push('workflow');
  }
  issues.push(
    ...findLanguagePresetCapabilityIssues(agent?.conversation_config?.language_presets),
  );

  const platform = agent?.platform_settings;
  if (!hasSafeMemberPrivacyPosture(platform?.privacy)) {
    issues.push('platform_settings.privacy');
  }
  const overrides = platform?.overrides;
  const conversationConfigOverride = overrides?.conversation_config_override;
  if (hasActiveProviderCapability(conversationConfigOverride)) {
    issues.push('platform_settings.overrides.conversation_config_override');
  }
  const promptOverrides = conversationConfigOverride?.agent?.prompt;
  if (hasActiveProviderCapability(promptOverrides)) {
    issues.push('platform_settings.overrides.conversation_config_override.agent.prompt');
  }
  for (const key of [
    'custom_llm_extra_body',
    'enable_conversation_initiation_client_data_from_webhook',
    'enable_starting_workflow_node_id_from_client',
  ]) {
    if (hasActiveProviderCapability(overrides?.[key])) {
      issues.push(`platform_settings.overrides.${key}`);
    }
  }
  for (const key of ['data_collection', 'data_collection_scopes']) {
    if (hasActiveProviderCapability(platform?.[key])) {
      issues.push(`platform_settings.${key}`);
    }
  }
  if (
    hasActiveProviderCapability(
      platform?.workspace_overrides?.conversation_initiation_client_data_webhook,
    )
  ) {
    issues.push(
      'platform_settings.workspace_overrides.conversation_initiation_client_data_webhook',
    );
  }
  if (
    hasActiveProviderCapability(
      platform?.workspace_overrides?.webhooks?.post_call_webhook_id,
    )
  ) {
    issues.push('platform_settings.workspace_overrides.webhooks.post_call_webhook_id');
  }

  return [...new Set(issues)].sort();
}

export function indexGovernedTools(liveTools, manifest) {
  validateMemberAgentToolManifest(manifest);
  const indexed = new Map();
  for (const definition of manifest.tools) {
    const matches = liveTools.filter((tool) => tool?.tool_config?.name === definition.name);
    if (matches.length > 1) {
      throw new Error(`Duplicate ElevenLabs tools found for ${definition.name}.`);
    }
    indexed.set(definition.name, matches[0] ?? null);
  }
  return indexed;
}

/**
 * Existing governed tools must positively prove that the authenticated
 * workspace user owns them. Missing or malformed access metadata is not
 * sufficient authority for a provider mutation.
 */
export function assertGovernedToolOwnership(tool, toolName) {
  if (tool?.access_info?.is_creator !== true) {
    throw new Error(
      `Tool ${toolName} is not proven to be owned by this workspace user.`,
    );
  }
}

/**
 * Provider mutations also require positive ownership of the reviewed agent.
 * An API key that can read an agent is not, by itself, authority to modify it.
 */
export function assertMemberAgentOwnership(agent, agentId) {
  if (agent?.access_info?.is_creator !== true) {
    throw new Error(
      `Agent ${agentId} is not proven to be owned by this workspace user.`,
    );
  }
}
