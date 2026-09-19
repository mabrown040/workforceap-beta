/**
 * Member-facing copy for a browser request that failed before the app got a
 * usable answer.
 *
 * `fetch()` rejects with a `TypeError` ("Failed to fetch", "Load failed",
 * "NetworkError when attempting to fetch resource.") when the connection
 * drops, and `res.json()` rejects with a `SyntaxError` ("Unexpected token
 * '<'") when a proxy or the platform answers with an HTML error page instead
 * of JSON. Neither sentence means anything to a member, so forms map both to
 * one plain translated message and keep the real error in the console.
 *
 * Messages the app raised on purpose (`throw new Error(data.error)`) pass
 * through untouched, so server validation copy still reaches the member.
 *
 * This is deliberately not offline detection: it only classifies an error
 * that a submission already produced.
 */
export function isConnectionFailure(err: unknown): boolean {
  if (err instanceof TypeError || err instanceof SyntaxError) return true;
  if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) return true;
  return false;
}

export type RequestFailureCopy = {
  /** Translated sentence for a dropped connection or a non-JSON answer. */
  connection: string;
  /** Shown when the error carries no usable message at all. */
  fallback: string;
};

/**
 * Pick what a member should read after a failed request and log the real
 * error under `label` so the raw message is still available in devtools.
 */
export function requestFailureMessage(err: unknown, copy: RequestFailureCopy, label: string): string {
  console.error(`[${label}] request failed`, err);
  if (isConnectionFailure(err)) return copy.connection;
  if (err instanceof Error && err.message.trim()) return err.message;
  return copy.fallback;
}
