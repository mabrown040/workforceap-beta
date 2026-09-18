export type PrismaTransactionPolicy = Readonly<
  | { mode: 'interactive'; reason: 'default' }
  | {
      mode: 'flattened';
      reason: 'explicit_flag' | 'vercel_preview' | 'vercel_development';
    }
>;

export function resolvePrismaTransactionPolicy(
  env: NodeJS.ProcessEnv = process.env,
): PrismaTransactionPolicy {
  if (env.PRISMA_FLATTEN_TX === '1') {
    return Object.freeze({ mode: 'flattened', reason: 'explicit_flag' });
  }
  if (env.VERCEL_ENV === 'preview') {
    return Object.freeze({ mode: 'flattened', reason: 'vercel_preview' });
  }
  if (env.VERCEL_ENV === 'development') {
    return Object.freeze({ mode: 'flattened', reason: 'vercel_development' });
  }
  return Object.freeze({ mode: 'interactive', reason: 'default' });
}

export function interactiveTransactionsGuaranteed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolvePrismaTransactionPolicy(env).mode === 'interactive';
}

export function assertPrismaTransactionPolicySafe(
  env: NodeJS.ProcessEnv = process.env,
): PrismaTransactionPolicy {
  const policy = resolvePrismaTransactionPolicy(env);
  const production = env.VERCEL_ENV === 'production'
    || (!env.VERCEL_ENV && env.NODE_ENV === 'production');
  if (production && policy.reason === 'explicit_flag') {
    throw new Error(
      'Unsafe Prisma transaction configuration: PRISMA_FLATTEN_TX=1 cannot be used in production.',
    );
  }
  return policy;
}
