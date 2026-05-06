import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { persistXapiStatement } from './persistXapiStatement';

function makeP2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'mock',
  });
}

test('persistXapiStatement: idempotent when statementId already exists', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalCreate = delegate.create;

  t.after(() => {
    delegate.create = originalCreate;
  });

  delegate.create = async () => {
    throw makeP2002();
  };

  const r = await persistXapiStatement({
    statementId: 'urn:uuid:dup-test',
    actorEmail: 'a@b.co',
    verb: 'progressed',
  });
  assert.equal(r, 'skipped');
});

test('persistXapiStatement: insert when statementId is new', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalCreate = delegate.create;

  t.after(() => {
    delegate.create = originalCreate;
  });

  let createCalls = 0;
  delegate.create = async (args: { data: { statementId: string | null } }) => {
    createCalls++;
    assert.equal(args.data.statementId, 'new-id');
    return {};
  };

  const r = await persistXapiStatement({
    statementId: 'new-id',
    actorEmail: 'a@b.co',
    verb: 'started',
  });
  assert.equal(r, 'inserted');
  assert.equal(createCalls, 1);
});

test('batch: 100 unique statementIds each insert once; duplicates skip', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalCreate = delegate.create;

  t.after(() => {
    delegate.create = originalCreate;
  });

  const persisted = new Set<string>();
  delegate.create = async ({ data }: { data: { statementId: string | null } }) => {
    const sid = data.statementId ?? '';
    if (persisted.has(sid)) {
      throw makeP2002();
    }
    persisted.add(sid);
    return {};
  };

  const ids = Array.from({ length: 100 }, (_, i) => `urn:uuid:batch-${i}`);
  for (const statementId of ids) {
    const first = await persistXapiStatement({ statementId, verb: 'progressed' });
    assert.equal(first, 'inserted');
  }
  for (const statementId of ids) {
    const second = await persistXapiStatement({ statementId, verb: 'progressed' });
    assert.equal(second, 'skipped');
  }
  assert.equal(persisted.size, 100);
});