function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
