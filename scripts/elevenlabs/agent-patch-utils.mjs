function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeJson(base, patch) {
  if (!isObject(patch)) return cloneJson(patch);

  const merged = isObject(base) ? cloneJson(base) : {};
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = isObject(value) ? mergeJson(merged[key], value) : cloneJson(value);
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
  return Object.fromEntries(
    Object.entries(agent).filter(
      ([key]) => !PROVIDER_MANAGED_AGENT_FIELDS.has(key),
    ),
  );
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
 * partial PATCH. Patch objects merge recursively; arrays and scalar values are
 * replaced. This intentionally works for every supported checked-in field,
 * including platform_settings and workflow.
 */
export function expectedAgentAfterPatch(preimage, patch) {
  return mergeJson(preimage, patch);
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
