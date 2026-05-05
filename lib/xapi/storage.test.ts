import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/db/prisma';
import { persistXapiStatement } from './persistXapiStatement';

test('persistXapiStatement: idempotent when statementId already exists', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalFindUnique = delegate.findUnique;
  const originalCreate = delegate.create;

  t.after(() => {
    delegate.findUnique = originalFindUnique;
    delegate.create = originalCreate;
  });

  delegate.findUnique = async () => ({ id: 'existing-row' });
  let createCalls = 0;
  delegate.create = async () => {
    createCalls++;
    return {};
  };

  const r = await persistXapiStatement({
    statementId: 'urn:uuid:dup-test',
    actorEmail: 'a@b.co',
    verb: 'progressed',
  });
  assert.equal(r, 'skipped');
  assert.equal(createCalls, 0);
});

test('persistXapiStatement: insert when statementId is new', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalFindUnique = delegate.findUnique;
  const originalCreate = delegate.create;

  t.after(() => {
    delegate.findUnique = originalFindUnique;
    delegate.create = originalCreate;
  });

  delegate.findUnique = async () => null;
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
  const originalFindUnique = delegate.findUnique;
  const originalCreate = delegate.create;

  t.after(() => {
    delegate.findUnique = originalFindUnique;
    delegate.create = originalCreate;
  });

  const persisted = new Set<string>();
  delegate.findUnique = async ({ where }: { where: { statementId: string } }) =>
    persisted.has(where.statementId) ? { id: 'x' } : null;

  delegate.create = async ({ data }: { data: { statementId: string | null } }) => {
    const sid = data.statementId ?? '';
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
