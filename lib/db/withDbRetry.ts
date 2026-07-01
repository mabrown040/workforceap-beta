/**
 * Retry helper for transient Postgres connectivity failures.
 *
 * Background (2026-06-30 incident): the Supabase connection pooler
 * (Supavisor, port 6543) became unreachable from Vercel for ~11 minutes.
 * Supabase Auth (GoTrue) kept returning 200s because it uses its own
 * connection, but every Prisma query that ran *after* a successful auth
 * call threw and was never retried — so `/api/auth/login` and the signup
 * routes returned hard 500s for the duration of the blip. The thrown errors
 * were all transient connectivity:
 *
 *   - PrismaClientInitializationError: Can't reach database server at ...:6543
 *   - P1017: Server has closed the connection (stale pooled connection)
 *   - PrismaClientUnknownRequestError: Failed to connect to database: enetunreach
 *
 * Retrying a few times with short backoff rides out a momentary pooler
 * hiccup instead of surfacing it to the user as a 500.
 *
 * We deliberately do NOT retry logical errors (unique/FK/not-found/validation,
 * e.g. P2002/P2003/P2025/P2011): those are deterministic and a retry would
 * only fail again (or, worse, mask a real bug behind added latency).
 */

/**
 * Prisma error codes that indicate the database/pooler was unreachable or the
 * connection died — i.e. the operation almost certainly did not commit, so it
 * is safe to retry.
 */
const RETRYABLE_PRISMA_CODES = new Set<string>([
  'P1001', // Can't reach database server
  'P1002', // Database server was reached but timed out
  'P1008', // Operations timed out
  'P1017', // Server has closed the connection
  'P2024', // Timed out fetching a new connection from the pool
]);

/**
 * Codes/markers for failures that happen while *acquiring* a connection,
 * before any statement runs. These are unambiguously pre-commit, so they are
 * safe to retry even for non-idempotent writes.
 */
const CONNECTION_ACQUISITION_CODES = new Set<string>([
  'P1001', // Can't reach database server
  'P1002', // Database server was reached but timed out
  'P2024', // Timed out fetching a new connection from the pool
]);

const RETRYABLE_MESSAGE_PATTERNS: RegExp[] = [
  /can't reach database server/i,
  /server has closed the connection/i,
  /failed to connect to database/i,
  /connection.*(closed|reset|refused|terminated)/i,
  /enetunreach/i,
  /econnreset/i,
  /econnrefused/i,
  /etimedout/i,
  /timed out fetching a new connection/i,
];

function errorParts(err: unknown): { name: string; code: string; message: string } {
  if (!err || typeof err !== 'object') {
    return { name: '', code: '', message: typeof err === 'string' ? err : '' };
  }
  const e = err as { name?: unknown; code?: unknown; message?: unknown };
  return {
    name: typeof e.name === 'string' ? e.name : '',
    code: typeof e.code === 'string' ? e.code : '',
    message: typeof e.message === 'string' ? e.message : '',
  };
}

/**
 * True when `err` is a transient DB connectivity failure that is safe to retry.
 * Intended for read-only queries and for writes guarded by an idempotency check.
 */
export function isRetryableDbError(err: unknown): boolean {
  const { name, code, message } = errorParts(err);
  if (name === 'PrismaClientInitializationError') return true;
  if (code && RETRYABLE_PRISMA_CODES.has(code)) return true;
  return RETRYABLE_MESSAGE_PATTERNS.some((re) => re.test(message));
}

/**
 * True when `err` happened while acquiring a connection (before any statement
 * could commit). Use this as the `shouldRetry` predicate for non-idempotent
 * writes, where retrying an ambiguous mid-commit failure (e.g. P1017) could
 * duplicate data.
 */
export function isConnectionAcquisitionError(err: unknown): boolean {
  const { name, code, message } = errorParts(err);
  if (name === 'PrismaClientInitializationError') return true;
  if (code && CONNECTION_ACQUISITION_CODES.has(code)) return true;
  // "Can't reach database server" is raised before any statement runs.
  return /can't reach database server|failed to connect to database|enetunreach|econnrefused/i.test(
    message,
  );
}

export interface DbRetryOptions {
  /** Additional attempts after the first try. Default 2 (3 attempts total). */
  retries?: number;
  /** Base backoff in ms; doubles each attempt. Default 100. */
  baseDelayMs?: number;
  /** Upper bound on a single backoff delay. Default 1000. */
  maxDelayMs?: number;
  /** Predicate deciding whether an error is retryable. Default isRetryableDbError. */
  shouldRetry?: (err: unknown) => boolean;
  /** Invoked before each retry sleep (attempt is 1-indexed). */
  onRetry?: (err: unknown, attempt: number) => void;
}

const sleep = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/**
 * Run `fn`, retrying on transient DB connectivity errors with exponential
 * backoff. Non-retryable errors (and the final attempt's error) are rethrown
 * unchanged so existing error handling keeps working.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  options: DbRetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 1000;
  const shouldRetry = options.shouldRetry ?? isRetryableDbError;

  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) {
        throw err;
      }
      attempt += 1;
      options.onRetry?.(err, attempt);
      await sleep(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
}
