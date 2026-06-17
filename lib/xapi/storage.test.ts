import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { persistXapiStatement, markXapiStatementProcessed } from './persistXapiStatement';

function makeP2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'mock',
  });
}

test('persistXapiStatement: idempotent when statementId already processed', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalCreate = delegate.create;
  const originalFindUnique = delegate.findUnique;

  t.after(() => {
    delegate.create = originalCreate;
    delegate.findUnique = originalFindUnique;
  });

  delegate.create = async () => {
    throw makeP2002();
  };
  delegate.findUnique = async () => ({ processed: true });

  const r = await persistXapiStatement({
    statementId: 'urn:uuid:dup-test',
    actorEmail: 'a@b.co',
    verb: 'progressed',
  });
  assert.equal(r.result, 'already_processed');
  assert.equal(r.statementHash, null);
});

test('persistXapiStatement: duplicate unprocessed statement retries processing', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalCreate = delegate.create;
  const originalFindUnique = delegate.findUnique;

  t.after(() => {
    delegate.create = originalCreate;
    delegate.findUnique = originalFindUnique;
  });

  delegate.create = async () => {
    throw makeP2002();
  };
  delegate.findUnique = async () => ({ processed: false });

  const r = await persistXapiStatement({
    statementId: 'urn:uuid:retry-test',
    actorEmail: 'a@b.co',
    verb: 'progressed',
  });
  assert.equal(r.result, 'retry_processing');
  assert.equal(r.statementHash, null);
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
  assert.equal(r.result, 'inserted');
  assert.equal(r.statementHash, null);
  assert.equal(createCalls, 1);
});

test('batch: 100 unique statementIds each insert once; duplicates skip', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalCreate = delegate.create;
  const originalFindUnique = delegate.findUnique;

  t.after(() => {
    delegate.create = originalCreate;
    delegate.findUnique = originalFindUnique;
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
  delegate.findUnique = async () => ({ processed: true });

  const ids = Array.from({ length: 100 }, (_, i) => `urn:uuid:batch-${i}`);
  for (const statementId of ids) {
    const first = await persistXapiStatement({ statementId, verb: 'progressed' });
    assert.equal(first.result, 'inserted');
    assert.equal(first.statementHash, null);
  }
  for (const statementId of ids) {
    const second = await persistXapiStatement({ statementId, verb: 'progressed' });
    assert.equal(second.result, 'already_processed');
    assert.equal(second.statementHash, null);
  }
  assert.equal(persisted.size, 100);
});

test('persistXapiStatement: duplicate without statementId uses hash idempotency', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalCreate = delegate.create;
  const originalFindFirst = delegate.findFirst;

  t.after(() => {
    delegate.create = originalCreate;
    delegate.findFirst = originalFindFirst;
  });

  let createCalls = 0;
  const persistedHashes = new Set<string>();
  delegate.create = async ({ data }: { data: { statementHash: string | null } }) => {
    createCalls++;
    const hash = data.statementHash ?? '';
    if (persistedHashes.has(hash)) {
      throw makeP2002();
    }
    persistedHashes.add(hash);
    return {};
  };
  delegate.findFirst = async () => ({ processed: true });

  const input = {
    actorEmail: 'learner@example.com',
    actorAccountName: 'coursera-user-123',
    verb: 'completed',
    courseId: 'course-v1:org+code+term',
    courseName: 'Intro to Testing',
    resultCompletion: true,
    resultSuccess: true,
    resultScoreScaled: 0.95,
  };

  const first = await persistXapiStatement(input);
  assert.equal(first.result, 'inserted');
  assert.ok(first.statementHash, 'statementHash should be set for hash-based statements');
  assert.equal(createCalls, 1);

  const second = await persistXapiStatement(input);
  assert.equal(second.result, 'already_processed');
  assert.equal(second.statementHash, first.statementHash);
  assert.equal(createCalls, 2);
});

test('persistXapiStatement: unprocessed duplicate without statementId retries', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalCreate = delegate.create;
  const originalFindFirst = delegate.findFirst;

  t.after(() => {
    delegate.create = originalCreate;
    delegate.findFirst = originalFindFirst;
  });

  delegate.create = async () => {
    throw makeP2002();
  };
  delegate.findFirst = async () => ({ processed: false });

  const input = {
    actorEmail: 'learner@example.com',
    verb: 'progressed',
    courseId: 'course-v1:org+code+term',
  };

  const result = await persistXapiStatement(input);
  assert.equal(result.result, 'retry_processing');
  assert.ok(result.statementHash, 'statementHash should be set for hash-based statements');
});

test('persistXapiStatement: hash-based duplicate delivery skips side effects after markProcessed', async (t) => {
  const delegate = prisma.xapiStatement as any;
  const originalCreate = delegate.create;
  const originalFindFirst = delegate.findFirst;
  const originalUpdateMany = delegate.updateMany;

  t.after(() => {
    delegate.create = originalCreate;
    delegate.findFirst = originalFindFirst;
    delegate.updateMany = originalUpdateMany;
  });

  let createCalls = 0;
  let updateManyCalls = 0;
  const persistedHashes = new Set<string>();

  delegate.create = async ({ data }: { data: { statementHash: string | null } }) => {
    createCalls++;
    const hash = data.statementHash ?? '';
    if (persistedHashes.has(hash)) {
      throw makeP2002();
    }
    persistedHashes.add(hash);
    return {};
  };
  delegate.findFirst = async () => ({ processed: true });
  delegate.updateMany = async ({ where }: { where: { statementHash?: string } }) => {
    updateManyCalls++;
    if (where?.statementHash) {
      return { count: 1 };
    }
    return { count: 0 };
  };

  const input = {
    actorEmail: 'learner@example.com',
    verb: 'completed',
    courseId: 'course-v1:org+code+term',
    courseName: 'Intro to Testing',
    resultCompletion: true,
  };

  const first = await persistXapiStatement(input);
  assert.equal(first.result, 'inserted');
  assert.ok(first.statementHash, 'statementHash should be set');
  assert.equal(createCalls, 1);

  // Simulate markXapiStatementProcessed with the hash
  await markXapiStatementProcessed(null, first.statementHash);
  assert.equal(updateManyCalls, 1);

  // Second delivery should be already_processed
  const second = await persistXapiStatement(input);
  assert.equal(second.result, 'already_processed');
  assert.equal(second.statementHash, first.statementHash);
  assert.equal(createCalls, 2);
});
