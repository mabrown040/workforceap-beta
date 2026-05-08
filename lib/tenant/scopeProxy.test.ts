/**
 * Track A — Tenant Isolation Hardening (Sprint A.1)
 *
 * Unit tests for the `withTenantScope` Proxy logic. Uses a fake Prisma
 * client passed via dependency injection — no DB, no module-cache hacks.
 *
 * What we're testing:
 *   - Read ops (findMany, findFirst, etc.) auto-inject organizationId
 *   - Write ops (create, update, etc.) inject org id into data and where
 *   - Caller-provided organizationId that matches the scope is allowed
 *   - Caller-provided organizationId that DOESN'T match throws
 *     TenantScopeViolation
 *   - Non-tenant-scoped models pass through unchanged
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeScopedProxy, TenantScopeViolation } from './scopeProxy';

// Pure-logic tests for the tenant scoping Proxy. Imports the
// server-only-free scopeProxy module and feeds it a fake Prisma.
const createScopedClient = <T extends object>(orgId: string, fakePrisma: T) =>
  makeScopedProxy(orgId, fakePrisma);

// ─── Fake Prisma client ─────────────────────────────────────────────────────

type CallRecord = { model: string; op: string; args: unknown };

function makeFakePrisma() {
  const calls: CallRecord[] = [];
  const makeModel = (name: string) => {
    const handler = (op: string) => async (args?: unknown) => {
      calls.push({ model: name, op, args });
      return { __recorded: true };
    };
    return {
      findMany: handler('findMany'),
      findFirst: handler('findFirst'),
      findUnique: handler('findUnique'),
      count: handler('count'),
      aggregate: handler('aggregate'),
      groupBy: handler('groupBy'),
      create: handler('create'),
      createMany: handler('createMany'),
      update: handler('update'),
      updateMany: handler('updateMany'),
      upsert: handler('upsert'),
      delete: handler('delete'),
      deleteMany: handler('deleteMany'),
    };
  };
  return {
    user: makeModel('user'),
    partner: makeModel('partner'),
    employer: makeModel('employer'),
    job: makeModel('job'),
    course: makeModel('course'),
    courseEnrollment: makeModel('courseEnrollment'),
    organizationProgramCatalog: makeModel('organizationProgramCatalog'),
    preScreeningResponse: makeModel('preScreeningResponse'),
    // NOT tenant-scoped — should pass through unchanged
    application: makeModel('application'),
    placementRecord: makeModel('placementRecord'),
    blogPost: makeModel('blogPost'),
    __getCalls: () => [...calls],
    __reset: () => {
      calls.length = 0;
    },
  };
}

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

// ─── Read ops auto-inject organizationId ────────────────────────────────────

test('findMany on User auto-injects organizationId', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.user.findMany({ where: { fullName: 'Maria' } });
  const [call] = fake.__getCalls();
  assert.equal(call.model, 'user');
  assert.equal(call.op, 'findMany');
  assert.deepEqual(call.args, { where: { fullName: 'Maria', organizationId: ORG_A } });
});

test('findFirst on Job auto-injects organizationId', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.job.findFirst({ where: { title: 'IT Support' } });
  const [call] = fake.__getCalls();
  assert.equal(call.model, 'job');
  assert.deepEqual(call.args, { where: { title: 'IT Support', organizationId: ORG_A } });
});

test('count on Partner auto-injects organizationId', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.partner.count();
  const [call] = fake.__getCalls();
  assert.deepEqual(call.args, { where: { organizationId: ORG_A } });
});

test('aggregate on Employer auto-injects organizationId', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.employer.aggregate({ _count: { _all: true } });
  const [call] = fake.__getCalls();
  assert.deepEqual(call.args, { _count: { _all: true }, where: { organizationId: ORG_A } });
});

// ─── Caller-provided org matching the scope is OK ───────────────────────────

test('caller-provided organizationId matching scope passes through', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.user.findMany({ where: { organizationId: ORG_A, fullName: 'Maria' } });
  const [call] = fake.__getCalls();
  assert.deepEqual(call.args, { where: { organizationId: ORG_A, fullName: 'Maria' } });
});

// ─── Caller trying to query another tenant THROWS ───────────────────────────
//
// The proxy throws SYNCHRONOUSLY at the scope-validation step (before the
// underlying Prisma call returns a Promise), so we use try/catch instead
// of assert.rejects (which expects a Promise return value).

function expectScopeViolation(fn: () => unknown): TenantScopeViolation {
  let caught: unknown = null;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  assert.ok(caught instanceof TenantScopeViolation, `expected TenantScopeViolation, got: ${caught}`);
  return caught as TenantScopeViolation;
}

test('caller-provided organizationId mismatching scope throws TenantScopeViolation on findMany', () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  expectScopeViolation(() => db.user.findMany({ where: { organizationId: ORG_B } }));
});

test('caller-provided organizationId mismatching scope throws on update', () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  expectScopeViolation(() => db.user.update({ where: { id: 'x', organizationId: ORG_B }, data: {} }));
});

test('caller-provided organizationId mismatching scope throws on create', () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  expectScopeViolation(() => db.user.create({ data: { id: 'x', email: 'a@b.c', organizationId: ORG_B } }));
});

// ─── Write ops inject organizationId into data and where ────────────────────

test('create injects organizationId into data', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.user.create({ data: { id: 'u1', email: 'a@b.c', fullName: 'A' } });
  const [call] = fake.__getCalls();
  assert.equal(call.op, 'create');
  const args = call.args as { data: { organizationId: string } };
  assert.equal(args.data.organizationId, ORG_A);
});

test('createMany injects organizationId into every row', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.user.createMany({
    data: [
      { id: 'u1', email: 'a@b.c', fullName: 'A' },
      { id: 'u2', email: 'b@c.d', fullName: 'B' },
    ],
  });
  const [call] = fake.__getCalls();
  const args = call.args as { data: Array<{ organizationId: string }> };
  for (const row of args.data) {
    assert.equal(row.organizationId, ORG_A);
  }
});

test('update injects organizationId into where', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.user.update({ where: { id: 'u1' }, data: { fullName: 'A' } });
  const [call] = fake.__getCalls();
  const args = call.args as { where: { organizationId: string } };
  assert.equal(args.where.organizationId, ORG_A);
});

test('upsert injects organizationId into both create and where', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.user.upsert({
    where: { id: 'u1' },
    create: { id: 'u1', email: 'a@b.c', fullName: 'A' },
    update: { fullName: 'A2' },
  });
  const [call] = fake.__getCalls();
  const args = call.args as {
    where: { organizationId: string };
    create: { organizationId: string };
  };
  assert.equal(args.where.organizationId, ORG_A);
  assert.equal(args.create.organizationId, ORG_A);
});

test('deleteMany injects organizationId into where', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.user.deleteMany({ where: { fullName: 'old' } });
  const [call] = fake.__getCalls();
  const args = call.args as { where: { organizationId: string } };
  assert.equal(args.where.organizationId, ORG_A);
});

// ─── Non-tenant-scoped models pass through unchanged ────────────────────────

test('non-tenant-scoped model (Application) is not modified', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.application.findMany({ where: { status: 'PENDING' } });
  const [call] = fake.__getCalls();
  assert.deepEqual(call.args, { where: { status: 'PENDING' } });
});

test('non-tenant-scoped model (PlacementRecord) is not modified', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.placementRecord.count();
  const [call] = fake.__getCalls();
  // No organizationId injection — caller must scope via FK
  assert.deepEqual(call.args, undefined);
});

// ─── Edge: extracting equals form ──────────────────────────────────────────

test('caller using { organizationId: { equals: "..." } } form is also checked', () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  expectScopeViolation(() =>
    db.user.findMany({
      where: { organizationId: { equals: ORG_B } as unknown as string },
    }),
  );
});

// ─── Allowing equals form when matching ────────────────────────────────────

test('caller using { organizationId: { equals: orgA } } form works when matching', async () => {
  const fake = makeFakePrisma();
  const db = createScopedClient(ORG_A, fake);
  await db.user.findMany({
    where: { organizationId: { equals: ORG_A } as unknown as string },
  });
  const [call] = fake.__getCalls();
  // The original equals-form is preserved (we only spread, we don't normalize)
  assert.ok(call.args);
});
