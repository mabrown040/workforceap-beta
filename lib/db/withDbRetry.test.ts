import test from 'node:test';
import assert from 'node:assert/strict';
import {
  withDbRetry,
  isRetryableDbError,
  isConnectionAcquisitionError,
} from './withDbRetry';

function prismaError(code: string, message = ''): Error & { code: string } {
  const err = new Error(message || code) as Error & { code: string };
  err.name = 'PrismaClientKnownRequestError';
  err.code = code;
  return err;
}

function initError(message: string): Error {
  const err = new Error(message);
  err.name = 'PrismaClientInitializationError';
  return err;
}

test('isRetryableDbError matches the incident error signatures', () => {
  assert.equal(isRetryableDbError(prismaError('P1017', 'Server has closed the connection')), true);
  assert.equal(isRetryableDbError(prismaError('P1001', "Can't reach database server")), true);
  assert.equal(isRetryableDbError(prismaError('P2024')), true);
  assert.equal(isRetryableDbError(initError("Can't reach database server at ...:6543")), true);
  // PrismaClientUnknownRequestError carries no code; match on message.
  assert.equal(
    isRetryableDbError(new Error('Failed to connect to database: {:error, :enetunreach}')),
    true,
  );
});

test('isRetryableDbError does NOT match deterministic logical errors', () => {
  assert.equal(isRetryableDbError(prismaError('P2002', 'Unique constraint failed')), false);
  assert.equal(isRetryableDbError(prismaError('P2003', 'Foreign key constraint violated')), false);
  assert.equal(isRetryableDbError(prismaError('P2025', 'Record to update not found')), false);
  assert.equal(isRetryableDbError(prismaError('P2011', 'Null constraint violation')), false);
  assert.equal(isRetryableDbError(new Error('something unrelated')), false);
  assert.equal(isRetryableDbError(null), false);
  assert.equal(isRetryableDbError(undefined), false);
});

test('isConnectionAcquisitionError is narrower than isRetryableDbError', () => {
  // Pre-commit failures: safe even for non-idempotent writes.
  assert.equal(isConnectionAcquisitionError(prismaError('P1001', "Can't reach database server")), true);
  assert.equal(isConnectionAcquisitionError(prismaError('P2024')), true);
  assert.equal(isConnectionAcquisitionError(initError("Can't reach database server")), true);
  // P1017 is ambiguous (could be mid-commit) — excluded from the narrow set.
  assert.equal(isConnectionAcquisitionError(prismaError('P1017', 'Server has closed the connection')), false);
});

test('withDbRetry returns immediately on success without retrying', async () => {
  let calls = 0;
  const result = await withDbRetry(async () => {
    calls += 1;
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('withDbRetry retries transient errors then succeeds', async () => {
  let calls = 0;
  const onRetry: number[] = [];
  const result = await withDbRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw prismaError('P1017', 'Server has closed the connection');
      return 'recovered';
    },
    { baseDelayMs: 0, onRetry: (_e, attempt) => onRetry.push(attempt) },
  );
  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
  assert.deepEqual(onRetry, [1, 2]);
});

test('withDbRetry rethrows after exhausting retries', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withDbRetry(
        async () => {
          calls += 1;
          throw prismaError('P1017', 'Server has closed the connection');
        },
        { retries: 2, baseDelayMs: 0 },
      ),
    /closed the connection/,
  );
  assert.equal(calls, 3); // 1 initial + 2 retries
});

test('withDbRetry does NOT retry non-retryable errors', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withDbRetry(
        async () => {
          calls += 1;
          throw prismaError('P2002', 'Unique constraint failed');
        },
        { baseDelayMs: 0 },
      ),
    /Unique constraint/,
  );
  assert.equal(calls, 1);
});

test('withDbRetry honours a custom shouldRetry predicate', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withDbRetry(
        async () => {
          calls += 1;
          throw prismaError('P1017', 'Server has closed the connection');
        },
        { baseDelayMs: 0, shouldRetry: isConnectionAcquisitionError },
      ),
    /closed the connection/,
  );
  // P1017 is not a connection-acquisition error, so no retries.
  assert.equal(calls, 1);
});
