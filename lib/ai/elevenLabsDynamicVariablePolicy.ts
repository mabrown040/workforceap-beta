const SECRET_DYNAMIC_VARIABLE_PREFIX = 'secret__';

/**
 * ElevenLabs keeps `secret__*` dynamic variables out of the model context and
 * makes them available to trusted tool headers. If one is present, starting a
 * session without dynamic variables would also remove its authorization
 * boundary, so the client must fail closed instead of retrying.
 */
export function hasSecretElevenLabsDynamicVariables(
  dynamicVariables: Record<string, string | number | boolean> | undefined,
): boolean {
  return Object.keys(dynamicVariables ?? {}).some((key) =>
    key.toLowerCase().startsWith(SECRET_DYNAMIC_VARIABLE_PREFIX),
  );
}

export function mayRetryElevenLabsWithoutDynamicVariables(
  retryRequested: boolean,
  dynamicVariables: Record<string, string | number | boolean> | undefined,
): boolean {
  return retryRequested && !hasSecretElevenLabsDynamicVariables(dynamicVariables);
}
