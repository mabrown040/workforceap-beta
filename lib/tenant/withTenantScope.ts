import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { makeScopedProxy, TenantScopeViolation, TENANT_SCOPED_MODELS } from './scopeProxy';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.1)
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * `withTenantScope(orgId, fn)` is the **primary defense** against cross-
 * tenant data leaks. Every API endpoint that reads or writes tenant data
 * must wrap its Prisma calls in this helper.
 *
 * What it does:
 *   - Wraps the real Prisma client in a Proxy (see `scopeProxy.ts` for
 *     pure logic) that, for tenant-scoped models, auto-injects
 *     `where: { organizationId: orgId }` on read operations
 *   - Asserts at runtime that any explicit `organizationId` in the
 *     caller's `where` matches the scoped value — fails loudly with
 *     `TenantScopeViolation` if a caller tries to override
 *   - On writes (create, update, upsert, delete), forces the org id
 *     into `data` / `where` so a malicious or buggy caller can't write
 *     to another tenant
 *
 * Models recognized as tenant-scoped (carry `organizationId` directly):
 *   - User
 *   - Partner
 *   - Employer
 *   - Job
 *   - Course
 *   - CourseEnrollment
 *   - OrganizationProgramCatalog
 *   - PreScreeningResponse
 *
 * Tables NOT in this list inherit their tenant via FK relationships (e.g.
 * `Application` is scoped via its `User.organizationId`). Those queries
 * must filter via the parent: `where: { user: { organizationId } }`.
 *
 * Caveats:
 *   - This helper is the application layer of defense. Sprint A.3 adds
 *     Postgres RLS as a backstop.
 *   - Raw SQL (`prisma.$queryRaw`) is NOT auto-scoped — those queries
 *     must manually include the tenant filter and get reviewed in PR.
 *   - Tables not in TENANT_SCOPED_MODELS pass through unchanged.
 *     Reviewers should still confirm the query is scoped via parent FK.
 */

type ScopedClient = Omit<typeof prisma, '$transaction' | '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>;

/**
 * Run `fn` with a Prisma client whose tenant-scoped operations are
 * forcibly filtered/written against `orgId`.
 */
export async function withTenantScope<T>(
  orgId: string,
  fn: (db: ScopedClient) => Promise<T>,
): Promise<T> {
  if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
    throw new Error('[tenant-scope] orgId required');
  }
  const scoped = makeScopedProxy(orgId, prisma) as unknown as ScopedClient;
  return fn(scoped);
}

/**
 * Tag for raw SQL queries that intentionally cross tenants — wrap them in
 * `crossTenantOK()` to make the choice explicit and reviewable. Doesn't do
 * anything functional; it's a marker for the audit script.
 */
export async function crossTenantOK<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}

// Re-exports for convenience.
export { TenantScopeViolation, TENANT_SCOPED_MODELS, Prisma };
