/**
 * Fetch with automatic timeout via AbortController.
 * Default timeout: 30s (suitable for most API calls).
 * Auth-critical calls: 15s.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 30000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Shorthand for auth-critical fetches that should fail fast
 * rather than leave the user staring at a spinner.
 */
export async function fetchAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetchWithTimeout(input, init, 15000);
}
