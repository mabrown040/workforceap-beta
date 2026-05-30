import test from 'node:test';
import assert from 'node:assert/strict';

import { processRetryEvent } from './_processRetries';

const baseEvent = {
  id: 'wh-1',
  source: 'learning-completion',
  eventType: 'learning.completion',
  eventId: 'evt-1',
  payloadSize: 128,
  processingTimeMs: null,
  status: 'retrying',
  httpStatusCode: 500,
  errorMessage: 'temporary failure',
  retryCount: 1,
  nextRetryAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

test('processRetryEvent marks success only after reprocessing succeeds', async () => {
  const updateCalls: any[] = [];
  const retryCalls: any[] = [];

  const result = await processRetryEvent(baseEvent, {
    reprocessWebhookEvent: async () => 'success',
    updateStatus: async (...args: any[]) => {
      updateCalls.push(args);
    },
    markForRetry: async (...args: any[]) => {
      retryCalls.push(args);
      return 'scheduled';
    },
  });

  assert.deepEqual(result, { id: 'wh-1', source: 'learning-completion', result: 'success' });
  assert.equal(updateCalls.length, 1);
  assert.equal(updateCalls[0][0], 'wh-1');
  assert.equal(updateCalls[0][1].status, 'success');
  assert.equal(updateCalls[0][1].nextRetryAt, null);
  assert.equal(retryCalls.length, 0);
});

test('processRetryEvent schedules another retry when reprocessing fails', async () => {
  const updateCalls: any[] = [];
  const retryCalls: any[] = [];

  const result = await processRetryEvent(baseEvent, {
    reprocessWebhookEvent: async () => {
      throw new Error('downstream unavailable');
    },
    updateStatus: async (...args: any[]) => {
      updateCalls.push(args);
    },
    markForRetry: async (...args: any[]) => {
      retryCalls.push(args);
      return 'scheduled';
    },
  });

  assert.deepEqual(result, { id: 'wh-1', source: 'learning-completion', result: 'failed' });
  assert.equal(updateCalls.length, 0);
  assert.deepEqual(retryCalls[0], ['wh-1', 1, 'downstream unavailable']);
});

test('processRetryEvent reports max retries exceeded when retry scheduling dead-letters', async () => {
  const result = await processRetryEvent({ ...baseEvent, retryCount: 4 }, {
    reprocessWebhookEvent: async () => {
      throw new Error('still broken');
    },
    markForRetry: async () => 'max_retries_exceeded',
  });

  assert.deepEqual(result, {
    id: 'wh-1',
    source: 'learning-completion',
    result: 'max_retries_exceeded',
  });
});

test('processRetryEvent skips unreplayable events without consuming attempts', async () => {
  let retryCalled = false;
  let updateCalled = false;

  const result = await processRetryEvent(baseEvent, {
    reprocessWebhookEvent: async () => 'skipped',
    updateStatus: async () => {
      updateCalled = true;
    },
    markForRetry: async () => {
      retryCalled = true;
      return 'scheduled';
    },
  });

  assert.deepEqual(result, { id: 'wh-1', source: 'learning-completion', result: 'skipped' });
  assert.equal(updateCalled, false);
  assert.equal(retryCalled, false);
});
