/**
 * Track A — Tenant Isolation Hardening (Sprint A.1)
 *
 * Pure proxy logic for tenant scoping. Knows nothing about the real
 * Prisma client — caller passes any client-shaped object. This file
 * has no `server-only` import and no Prisma import so it's unit-
 * testable in isolation.
 *
 * Production callers go through `lib/tenant/withTenantScope.ts` which
 * pulls in the real Prisma client and wraps it.
 *
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 */

export class TenantScopeViolation extends Error {
  constructor(
    public model: string,
    public operation: string,
    public expectedOrgId: string,
    public providedOrgId: string,
  ) {
    super(
      `[tenant-scope] ${model}.${operation}: caller passed organizationId=${providedOrgId} but tenant scope is ${expectedOrgId}`,
    );
    this.name = 'TenantScopeViolation';
  }
}

/**
 * Models that carry `organizationId` directly. Mirrors the schema audit
 * in `docs/TENANT-ISOLATION.md`. Keep in sync when new tenant-scoped
 * models are added.
 */
export const TENANT_SCOPED_MODELS = new Set<string>([
  'user',
  'partner',
  'employer',
  'job',
  'course',
  'courseEnrollment',
  'organizationProgramCatalog',
  'preScreeningResponse',
]);

const READ_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);
const WRITE_OPS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
]);

/**
 * Wrap any Prisma-shaped client with tenant scoping.
 *
 * @param orgId — the tenant id all queries will be scoped against
 * @param client — the Prisma-like client (real or fake) to wrap
 * @returns a Proxy that forwards everything but interposes on tenant-
 *          scoped models to inject `organizationId` and fail loudly
 *          on cross-tenant attempts.
 */
export function makeScopedProxy<TClient extends object>(orgId: string, client: TClient): TClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string' || !TENANT_SCOPED_MODELS.has(prop)) {
        return Reflect.get(target, prop, receiver);
      }
      const model = Reflect.get(target, prop, receiver);
      return wrapModelDelegate(model, prop, orgId);
    },
  }) as TClient;
}

function wrapModelDelegate(model: unknown, modelName: string, orgId: string): unknown {
  return new Proxy(model as object, {
    get(target, op, receiver) {
      if (typeof op !== 'string') return Reflect.get(target, op, receiver);

      const opName = op;
      const original = Reflect.get(target, op, receiver);
      if (typeof original !== 'function') return original;

      if (READ_OPS.has(opName)) {
        return (args: Record<string, unknown> = {}) => {
          const scopedArgs = enforceReadScope(args, modelName, opName, orgId);
          return (original as (a: unknown) => unknown).call(target, scopedArgs);
        };
      }

      if (WRITE_OPS.has(opName)) {
        return (args: Record<string, unknown> = {}) => {
          const scopedArgs = enforceWriteScope(args, modelName, opName, orgId);
          return (original as (a: unknown) => unknown).call(target, scopedArgs);
        };
      }

      return original;
    },
  });
}

function enforceReadScope(
  args: Record<string, unknown>,
  model: string,
  op: string,
  orgId: string,
): Record<string, unknown> {
  const where = (args.where ?? {}) as Record<string, unknown>;
  const providedOrg = extractOrgId(where);
  if (providedOrg !== undefined && providedOrg !== orgId) {
    throw new TenantScopeViolation(model, op, orgId, String(providedOrg));
  }
  return {
    ...args,
    where: { ...where, organizationId: orgId },
  };
}

function enforceWriteScope(
  args: Record<string, unknown>,
  model: string,
  op: string,
  orgId: string,
): Record<string, unknown> {
  const out = { ...args };

  if (op === 'create') {
    const data = ((out.data ?? {}) as Record<string, unknown>) ?? {};
    const providedOrg = data.organizationId;
    if (providedOrg !== undefined && providedOrg !== orgId) {
      throw new TenantScopeViolation(model, op, orgId, String(providedOrg));
    }
    out.data = { ...data, organizationId: orgId };
    return out;
  }

  if (op === 'upsert') {
    const data = ((out.create ?? {}) as Record<string, unknown>) ?? {};
    const providedDataOrg = data.organizationId;
    if (providedDataOrg !== undefined && providedDataOrg !== orgId) {
      throw new TenantScopeViolation(model, op, orgId, String(providedDataOrg));
    }
    out.create = { ...data, organizationId: orgId };

    const where = ((out.where ?? {}) as Record<string, unknown>) ?? {};
    const providedWhereOrg = extractOrgId(where);
    if (providedWhereOrg !== undefined && providedWhereOrg !== orgId) {
      throw new TenantScopeViolation(model, op, orgId, String(providedWhereOrg));
    }
    out.where = { ...where, organizationId: orgId };
    return out;
  }

  if (op === 'createMany' || op === 'createManyAndReturn') {
    // `createManyAndReturn` (Prisma 5.14+) takes the same `{ data: [...] }`
    // shape as `createMany` and returns the inserted rows. Both must inject
    // `organizationId` into every row.
    const data = (out.data as Array<Record<string, unknown>> | undefined) ?? [];
    out.data = data.map((row) => {
      if (row.organizationId !== undefined && row.organizationId !== orgId) {
        throw new TenantScopeViolation(model, op, orgId, String(row.organizationId));
      }
      return { ...row, organizationId: orgId };
    });
    return out;
  }

  // update, updateMany, updateManyAndReturn, delete, deleteMany — scope where
  const where = (out.where ?? {}) as Record<string, unknown>;
  const providedOrg = extractOrgId(where);
  if (providedOrg !== undefined && providedOrg !== orgId) {
    throw new TenantScopeViolation(model, op, orgId, String(providedOrg));
  }
  out.where = { ...where, organizationId: orgId };

  if (op === 'update' || op === 'updateMany' || op === 'updateManyAndReturn') {
    const data = ((out.data ?? {}) as Record<string, unknown>) ?? {};
    if (data.organizationId !== undefined && data.organizationId !== orgId) {
      throw new TenantScopeViolation(model, op, orgId, String(data.organizationId));
    }
  }

  return out;
}

/**
 * Pull `organizationId` out of a where clause if directly present, returning
 * `undefined` otherwise. Doesn't recurse into AND/OR/NOT — by design — because
 * a caller passing `OR: [{ organizationId: A }, { organizationId: B }]` is
 * exactly the cross-tenant escape we want to prevent. Force them to scope at
 * the top level.
 */
function extractOrgId(where: Record<string, unknown>): string | undefined {
  const v = where.organizationId;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null) {
    const eq = (v as { equals?: unknown }).equals;
    if (typeof eq === 'string') return eq;
  }
  return undefined;
}
