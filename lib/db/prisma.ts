import { PrismaClient } from '@prisma/client';
import { getGucContext, inTransactionStorage } from './gucContext';
import type { GucContext } from './gucContext';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function isGucSetupQuery(sql: unknown): boolean {
  if (typeof sql !== 'string') return false;
  // Match the current `SELECT set_config(...)` shape and keep the legacy
  // `SET LOCAL app.current_` literal so the recursion guard still trips on
  // any older calls that might still be in flight.
  return (
    sql.includes("set_config('app.current_") ||
    sql.includes('SET LOCAL app.current_')
  );
}

export function buildGucSql(ctx: GucContext): string {
  // PostgreSQL rejects prepared statements that contain multiple commands
  // separated by semicolons, which is what `SET LOCAL a = 'x'; SET LOCAL b
  // = 'y';` would produce. Use a single SELECT that calls set_config for
  // each value instead — same semantics (is_local=true mirrors SET LOCAL),
  // one statement on the wire. The SELECT returns the new values as text;
  // we ignore the rows.
  const setters: string[] = [];

  setters.push(`set_config('app.current_user_id', '${escapeSqlString(ctx.userId ?? '')}', true)`);
  setters.push(`set_config('app.current_org_id', '${escapeSqlString(ctx.orgId ?? '')}', true)`);
  setters.push(`set_config('app.current_role', '${escapeSqlString(ctx.role)}', true)`);

  if (ctx.employerId) {
    setters.push(`set_config('app.current_employer_id', '${escapeSqlString(ctx.employerId)}', true)`);
  }
  if (ctx.partnerId) {
    setters.push(`set_config('app.current_partner_id', '${escapeSqlString(ctx.partnerId)}', true)`);
  }

  return `SELECT ${setters.join(', ')}`;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  /**
   * GUC-setting middleware.
   *
   * Before every Prisma operation we issue `SET LOCAL` statements so that
   * PostgreSQL RLS policies (migration 20260513040000_add_rls_policies)
   * can read the current user, org, and role.
   *
   * Note on `SET LOCAL` vs connection pooling:
   *   - For explicit `$transaction` calls we override `$transaction` below
   *     to inject the GUC query *inside* the transaction boundary, so
   *     `SET LOCAL` is guaranteed to be visible to every query in the batch.
   *   - For single (non-transactional) queries the `$executeRawUnsafe`
   *     call and the subsequent `next(params)` may land on different
   *     connections from the pool.  This is a best-effort safeguard; for
   *     guaranteed RLS enforcement wrap sensitive reads in `$transaction`.
   *
   * Note on recursion guard:
   *   `$executeRawUnsafe` itself triggers the middleware, so we detect
   *   GUC-setup queries by looking for `SET LOCAL app.current_` in the
   *   raw SQL and skip them.
   *
   * Note on transaction nesting:
   *   When we are already inside an explicit `$transaction` (array or
   *   callback) we set `inTransactionStorage` to `true` in the override
   *   below.  The middleware detects this and skips its own GUC query,
   *   because the transaction wrapper already injected one.
   */
  client.$use(async (params, next) => {
    // Guard 1: skip the GUC setup queries themselves to prevent infinite
    // recursion — $executeRawUnsafe inside middleware triggers middleware again.
    if (params.action === 'executeRaw' && params.args && isGucSetupQuery(params.args[0])) {
      return next(params);
    }

    // Guard 2: inside an explicit $transaction the wrapper already set GUCs.
    if (inTransactionStorage.getStore()) {
      return next(params);
    }

    const ctx = getGucContext();
    const sql = buildGucSql(ctx ?? { userId: null, orgId: null, role: 'anonymous' });
    await (client as any).$executeRawUnsafe(sql);

    return next(params);
  });

  /**
   * Override `$transaction` so that GUCs are set *inside* the transaction
   * boundary where `SET LOCAL` is guaranteed to be visible to every query.
   */
  const originalTransaction = client.$transaction.bind(client) as any;
  (client as any).$transaction = async function (...args: unknown[]) {
    const ctx = getGucContext();
    if (!ctx) {
      // No auth context — fall back to the original behaviour.
      return inTransactionStorage.run(true, () => originalTransaction(...args));
    }

    const gucSql = buildGucSql(ctx);

    // Callback form: prisma.$transaction(async (tx) => { ... })
    if (typeof args[0] === 'function') {
      const callback = args[0] as (tx: PrismaClient) => Promise<unknown>;
      const options = args[1];
      const wrapped = async (tx: PrismaClient) => {
        await (tx as any).$executeRawUnsafe(gucSql);
        return callback(tx);
      };
      return inTransactionStorage.run(true, () => originalTransaction(wrapped, options));
    }

    // Array form: prisma.$transaction([q1, q2, ...])
    if (Array.isArray(args[0])) {
      const promises = args[0] as Promise<unknown>[];
      const options = args[1];
      const gucPromise = (client as any).$executeRawUnsafe(gucSql);
      return inTransactionStorage.run(true, () => originalTransaction([gucPromise, ...promises], options));
    }

    // Fallback for any other signature.
    return inTransactionStorage.run(true, () => originalTransaction(...args));
  };

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
