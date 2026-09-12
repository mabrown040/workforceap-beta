import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertPrismaTransactionPolicySafe,
  interactiveTransactionsGuaranteed,
  resolvePrismaTransactionPolicy,
} from './transactionPolicy';

const env = (values: Record<string, string | undefined> = {}): NodeJS.ProcessEnv => ({ ...values });

test('default policy guarantees interactive transactions', () => {
  assert.deepEqual(resolvePrismaTransactionPolicy(env()), Object.freeze({
    mode: 'interactive',
    reason: 'default',
  }));
  assert.equal(interactiveTransactionsGuaranteed(env()), true);
});

test('preview and development use the supported flattened policy', () => {
  assert.deepEqual(resolvePrismaTransactionPolicy(env({ VERCEL_ENV: 'preview' })), Object.freeze({
    mode: 'flattened',
    reason: 'vercel_preview',
  }));
  assert.deepEqual(resolvePrismaTransactionPolicy(env({ VERCEL_ENV: 'development' })), Object.freeze({
    mode: 'flattened',
    reason: 'vercel_development',
  }));
});

test('the explicit flag is the stable reason outside production', () => {
  assert.deepEqual(resolvePrismaTransactionPolicy(env({ PRISMA_FLATTEN_TX: '1' })), Object.freeze({
    mode: 'flattened',
    reason: 'explicit_flag',
  }));
  assert.equal(interactiveTransactionsGuaranteed(env({ PRISMA_FLATTEN_TX: '1' })), false);
});

test('production plus the explicit flatten flag is rejected at client startup', () => {
  for (const productionEnv of [
    env({ VERCEL_ENV: 'production', PRISMA_FLATTEN_TX: '1' }),
    env({ NODE_ENV: 'production', PRISMA_FLATTEN_TX: '1' }),
  ]) {
    assert.throws(
      () => assertPrismaTransactionPolicySafe(productionEnv),
      /PRISMA_FLATTEN_TX=1 cannot be used in production/,
    );
  }
});
