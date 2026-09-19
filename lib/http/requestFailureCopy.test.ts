import test from 'node:test';
import assert from 'node:assert/strict';
import { isConnectionFailure, requestFailureMessage } from './requestFailureCopy';

const copy = { connection: 'CONNECTION_COPY', fallback: 'FALLBACK_COPY' };

function withSilentConsole<T>(run: (calls: unknown[][]) => T): T {
  const calls: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { calls.push(args); };
  try {
    return run(calls);
  } finally {
    console.error = original;
  }
}

test('a dropped connection (fetch TypeError) reads as the connection copy, never "Failed to fetch"', () => {
  withSilentConsole((calls) => {
    const err = new TypeError('Failed to fetch');
    assert.equal(isConnectionFailure(err), true);
    const shown = requestFailureMessage(err, copy, 'test-form');
    assert.equal(shown, copy.connection);
    assert.doesNotMatch(shown, /Failed to fetch/);
    assert.equal(calls.length, 1, 'the real error is logged once');
    assert.equal(calls[0][1], err);
  });
});

test('an HTML error page parsed as JSON (SyntaxError) reads as the connection copy', () => {
  withSilentConsole(() => {
    let err: unknown;
    try { JSON.parse('<!doctype html><h1>500</h1>'); } catch (e) { err = e; }
    assert.ok(err instanceof SyntaxError);
    assert.equal(isConnectionFailure(err), true);
    assert.equal(requestFailureMessage(err, copy, 'test-form'), copy.connection);
  });
});

test('aborted and timed-out requests count as connection failures', () => {
  const aborted = new Error('The operation was aborted.');
  aborted.name = 'AbortError';
  const timedOut = new Error('signal timed out');
  timedOut.name = 'TimeoutError';
  assert.equal(isConnectionFailure(aborted), true);
  assert.equal(isConnectionFailure(timedOut), true);
});

test('messages the app raised on purpose pass through to the member', () => {
  withSilentConsole(() => {
    const err = new Error('Please rate all three categories before submitting.');
    assert.equal(isConnectionFailure(err), false);
    assert.equal(requestFailureMessage(err, copy, 'test-form'), err.message);
  });
});

test('an error with no usable message falls back to the fallback copy', () => {
  withSilentConsole(() => {
    assert.equal(requestFailureMessage(new Error('   '), copy, 'test-form'), copy.fallback);
    assert.equal(requestFailureMessage('string thrown', copy, 'test-form'), copy.fallback);
    assert.equal(requestFailureMessage(undefined, copy, 'test-form'), copy.fallback);
  });
});
