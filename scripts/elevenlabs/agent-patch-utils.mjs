function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeJson(base, patch, path = []) {
  if (!isObject(patch)) return cloneJson(patch);
  // ElevenLabs replaces this dictionary, removing placeholders from the old
  // prompt. Require exact replacement so stale member context cannot survive.
  if (
    path.join('.') ===
    'conversation_config.agent.dynamic_variables.dynamic_variable_placeholders'
  ) return cloneJson(patch);

  const merged = isObject(base) ? cloneJson(base) : {};
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = isObject(value)
      ? mergeJson(merged[key], value, [...path, key])
      : cloneJson(value);
  }
  return merged;
}

function findExactMismatches(actual, expected, path = []) {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      return [path.join('.') || '<root>'];
    }
    if (actual.length !== expected.length) {
      return [path.join('.') || '<root>'];
    }
    return expected.flatMap((value, index) =>
      findExactMismatches(actual[index], value, [...path, String(index)]),
    );
  }

  if (isObject(actual) || isObject(expected)) {
    if (!isObject(actual) || !isObject(expected)) {
      return [path.join('.') || '<root>'];
    }
    const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    return [...keys].flatMap((key) =>
      findExactMismatches(actual[key], expected[key], [...path, key]),
    );
  }

  return Object.is(actual, expected) ? [] : [path.join('.') || '<root>'];
}

const PATCHABLE_AGENT_FIELDS = new Set([
  'conversation_config',
  'platform_settings',
  'workflow',
  'name',
  'tags',
]);

// These GET-only fields are controlled by ElevenLabs or by separate provider
// APIs. They must not be sent in PATCH bodies, and version/access changes must
// not create false configuration drift after a successful write.
const PROVIDER_MANAGED_AGENT_FIELDS = new Set([
  'agent_id',
  'metadata',
  'phone_numbers',
  'whatsapp_accounts',
  'access_info',
  'version_id',
  'branch_id',
  'main_branch_id',
]);

function withoutProviderManagedFields(agent) {
  if (!isObject(agent)) return agent;
  const comparable = Object.fromEntries(
    Object.entries(agent).filter(
      ([key]) => !PROVIDER_MANAGED_AGENT_FIELDS.has(key),
    ),
  );
  const analysis = comparable.platform_settings?.analysis_items;
  // Older agents return null until their first update. The provider then emits
  // this empty representation; any actual analysis configuration remains exact.
  if (
    isObject(analysis) && Object.keys(analysis).length === 2 &&
    Array.isArray(analysis.evaluation_criteria) && analysis.evaluation_criteria.length === 0 &&
    Array.isArray(analysis.data_collection) && analysis.data_collection.length === 0
  ) {
    comparable.platform_settings = { ...comparable.platform_settings, analysis_items: null };
  }
  return comparable;
}

/**
 * Compare an ElevenLabs agent response to the checked-in partial PATCH body.
 * Only keys present in the patch are asserted; server-managed fields are ignored.
 */
export function findAgentPatchMismatches(actual, expected, path = []) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return [path.join('.') || '<root>'];
    }
    return expected.flatMap((value, index) =>
      findAgentPatchMismatches(actual[index], value, [...path, String(index)]),
    );
  }

  if (isObject(expected)) {
    if (!isObject(actual)) return [path.join('.') || '<root>'];
    return Object.entries(expected).flatMap(([key, value]) =>
      findAgentPatchMismatches(actual[key], value, [...path, key]),
    );
  }

  return Object.is(actual, expected) ? [] : [path.join('.') || '<root>'];
}

export function agentPatchMatches(actual, expected) {
  return findAgentPatchMismatches(actual, expected).length === 0;
}

/**
 * Produce the exact agent state that should exist after ElevenLabs applies a
 * partial PATCH. Objects merge recursively except the replaced dynamic-variable
 * dictionary; arrays and scalar values are replaced. This covers each checked-in field,
 * including platform_settings and workflow.
 */
export function expectedAgentAfterPatch(preimage, patch) {
  return mergeJson(preimage, patch);
}

/**
 * ElevenLabs replaces the whole placeholder dictionary. For ordinary agents,
 * retain keys that the reviewed partial patch does not specify before sending
 * that replacement. Governed Lilley must not use this helper: its exact
 * secret-only dictionary intentionally removes stale member prompt context.
 */
export function preserveUnspecifiedAgentPlaceholders(preimage, patch) {
  const placeholders = patch?.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders;
  if (!isObject(placeholders)) return patch;
  const existing = preimage?.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders;
  const prepared = cloneJson(patch);
  prepared.conversation_config.agent.dynamic_variables.dynamic_variable_placeholders = {
    ...(isObject(existing) ? existing : {}),
    ...placeholders,
  };
  return prepared;
}

/** Static prompt/first-message variables need inert defaults when a route omits them. */
export function findAgentTemplateVariableIssues(agent) {
  const config = agent?.conversation_config?.agent;
  const text = [config?.prompt?.prompt, config?.first_message].filter(value => typeof value === 'string').join('\n');
  const variables = new Set([
    ...Array.from(text.matchAll(/{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g), match => match[1]),
    ...Array.from(text.matchAll(/{%\s*(?:if|elif)\s+([A-Za-z_][A-Za-z0-9_]*)\b/g), match => match[1]),
  ]);
  const placeholders = config?.dynamic_variables?.dynamic_variable_placeholders;
  return [...variables].filter(name => {
    if (name.startsWith('system__')) return false;
    const value = placeholders?.[name];
    return !['string', 'number', 'boolean'].includes(typeof value)
      || (typeof value === 'number' && !Number.isFinite(value));
  }).sort().map(name => `conversation_config.agent.dynamic_variables.dynamic_variable_placeholders.${name}`);
}

/**
 * Unlike the legacy subset assertion, this proves every patchable live-agent
 * field is unchanged except for the recursively applied checked-in patch.
 * GET-only identity, access, assignment and version metadata is deliberately
 * ignored because the provider owns it and PATCH cannot safely restore it.
 */
export function findAgentPostPatchDrift(actual, preimage, patch) {
  const expected = expectedAgentAfterPatch(preimage, patch);
  return findExactMismatches(
    withoutProviderManagedFields(actual),
    withoutProviderManagedFields(expected),
  );
}

/**
 * Prove that every mutable field still exactly matches the state observed
 * before the PATCH. Provider-managed identity and version metadata is ignored.
 */
export function findAgentPreimageDrift(actual, preimage) {
  return findExactMismatches(
    withoutProviderManagedFields(actual),
    withoutProviderManagedFields(preimage),
  );
}

export function isSupportedAgentPatch(body) {
  if (!isObject(body) || Object.keys(body).length === 0) return false;
  return Object.keys(body).every((field) => PATCHABLE_AGENT_FIELDS.has(field));
}
