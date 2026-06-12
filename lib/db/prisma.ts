import { PrismaClient } from '@prisma/client';
import { getGucContext, inTransactionStorage } from './gucContext';
import type { GucContext } from './gucContext';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function isGucSetupQuery(sql: unknown): boolean {
  return typeof sql === 'string' && sql.includes("set_config('app.current_");
}

export function requiresExplicitTransactionForGucContext(ctx: GucContext | undefined, isInTransaction: boolean): boolean {
  return Boolean(ctx && !isInTransaction);
}

export function buildGucSql(ctx: GucContext): string {
  // Use `set_config(name, value, is_local)` instead of `SET LOCAL <name> = <value>`
  // because PostgreSQL's parser rejects `SET LOCAL app.current_role = ...` —
  // `current_role` is a SQL-reserved word (current_role is a builtin function),
  // so the statement form trips error 42601 ("syntax error at or near
  // \"current_role\"") even though the qualified `app.<name>` identifier is
  // legal as a custom GUC at runtime. `set_config()` takes the parameter name
  // as a regular string and dodges the parser issue.
  //
  // All three params are combined into a single SELECT so we issue one query
  // per Prisma middleware invocation. `set_config(name, value, true)` sets
  // the value for the rest of the current transaction (equivalent to
  // `SET LOCAL`).
  const userId = escapeSqlString(ctx.userId ?? '');
  const orgId = escapeSqlString(ctx.orgId ?? '');
  const role = escapeSqlString(ctx.role);
  const parts = [
    `set_config('app.current_user_id', '${userId}', true)`,
    `set_config('app.current_org_id', '${orgId}', true)`,
    `set_config('app.current_role', '${role}', true)`,
  ];

  if (ctx.employerId) {
    parts.push(`set_config('app.current_employer_id', '${escapeSqlString(ctx.employerId)}', true)`);
  }
  if (ctx.partnerId) {
    parts.push(`set_config('app.current_partner_id', '${escapeSqlString(ctx.partnerId)}', true)`);
  }

  return `SELECT ${parts.join(', ')};`;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // RLS reads run inside interactive `$transaction` (see the override below),
    // which must acquire a pooled connection. On serverless the pool gets bursty,
    // and the 2s default `maxWait` would throw "Unable to start a transaction in
    // the given time" (Sentry JAVASCRIPT-NEXTJS-T). Give acquisition more room;
    // `timeout` bounds the transaction body, which for these reads is tiny.
    transactionOptions: { maxWait: 5000, timeout: 10000 },
  });

  /**
   * GUC-setting middleware.
   *
   * Before every Prisma operation we issue `SET LOCAL` statements so that
   * PostgreSQL RLS policies (migration 20260513040000_add_rls_policies)
   * can read the current user, org, and role.
   *
   * Note on `SET LOCAL` vs transaction scope:
   *   - For explicit `$transaction` calls we override `$transaction` below
   *     to inject the GUC query *inside* the transaction boundary, so
   *     `SET LOCAL` is guaranteed to be visible to every query in the batch.
   *   - For single (non-transactional) queries a separate setup SELECT loses
   *     its transaction-local GUCs before `next(params)` runs. Fail closed
   *     when a GUC context is active so sensitive reads cannot run without
   *     the RLS variables.
   *
   * Note on recursion guard:
   *   `$executeRawUnsafe` itself triggers the middleware, so we detect
   *   GUC-setup queries by looking for `set_config('app.current_` in the
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

    const inTransaction = Boolean(inTransactionStorage.getStore());

    // Guard 2: inside an explicit $transaction the wrapper already set GUCs.
    if (inTransaction) {
      return next(params);
    }

    const ctx = getGucContext();

    if (requiresExplicitTransactionForGucContext(ctx, inTransaction)) {
      // FAIL-OPEN (P0 hotfix): #1631 made this throw, which 500'd every
      // withApiGuc route still using bare prisma calls — including
      // /api/auth/login — for ~24h in prod. RLS is enabled but NOT forced
      // (relforcerowsecurity=false) and the app connects as table owner, so
      // the transaction-local GUC is not yet load-bearing for authorization.
      // Log loudly so the $transaction migration can continue, and flip this
      // back to a throw in the same change that flips FORCE ROW LEVEL
      // SECURITY — at that point fail-open would mean silent empty reads.
      console.error(
        `[prisma:guc] Query "${params.model ?? 'raw'}.${params.action}" ran with an active GUC context ` +
          `outside an explicit $transaction. Wrap RLS-protected Prisma calls in prisma.$transaction() ` +
          `so transaction-local GUCs remain visible to PostgreSQL policies.`,
      );
    }

    // Development-only warning when queries run outside any GUC context.
    // In production we silently fall back to anonymous so the site stays up.
    if (!ctx && process.env.NODE_ENV === 'development') {
      console.warn(
        `[prisma:guc] Query "${params.model ?? 'raw'}.${params.action}" ran without an active GUC context. ` +
          `Wrap the call site in withApiGuc(), withAuthGuc(), runWithGucContext(), or ensure ` +
          `the root layout gucContextStorage.run() is active.`
      );
    }

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
