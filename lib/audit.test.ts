import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureApiError } from '@/lib/observability/captureApiError';
import { auditLog, resolveActorSnapshot, AUDIT_WRITE_ROUTE } from './audit';

vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/observability/captureApiError', () => ({
  captureApiError: vi.fn(),
}));

type FakeDb = {
  user: { findUnique: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

function makeDb(): FakeDb {
  return {
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({ id: 'row' }) },
  };
}

// The helper only touches `user.findUnique` and `auditLog.create`, so the fake
// satisfies the `Pick<PrismaClient, ...>` shape for everything it calls.
const asDb = (db: FakeDb) => db as unknown as Parameters<typeof auditLog>[1];

beforeEach(() => {
  vi.mocked(captureApiError).mockClear();
});

describe('resolveActorSnapshot', () => {
  it('reports exists=true with email and the highest-priority role', async () => {
    const db = makeDb();
    db.user.findUnique.mockResolvedValue({
      email: 'admin@example.org',
      userRoles: [{ role: { name: 'member' } }, { role: { name: 'admin' } }],
    });
    await expect(resolveActorSnapshot('u1', asDb(db))).resolves.toEqual({
      email: 'admin@example.org',
      role: 'admin',
      exists: true,
    });
  });

  it('reports exists=false when no user matches the id', async () => {
    const db = makeDb();
    db.user.findUnique.mockResolvedValue(null);
    await expect(resolveActorSnapshot('cron', asDb(db))).resolves.toEqual({
      email: null,
      role: null,
      exists: false,
    });
  });

  it('reports exists=null when the lookup itself fails', async () => {
    const db = makeDb();
    db.user.findUnique.mockRejectedValue(new Error('pool timeout'));
    await expect(resolveActorSnapshot('u1', asDb(db))).resolves.toEqual({
      email: null,
      role: null,
      exists: null,
    });
  });
});

describe('auditLog', () => {
  it('writes a real actor with its resolved snapshot', async () => {
    const db = makeDb();
    db.user.findUnique.mockResolvedValue({
      email: 'c@example.org',
      userRoles: [{ role: { name: 'counselor' } }],
    });

    await auditLog(
      { actorUserId: 'u1', action: 'x', targetType: 'User', targetId: 'u2', metadata: { a: 1 } },
      asDb(db),
    );

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'u1',
        actorEmailSnapshot: 'c@example.org',
        actorRoleSnapshot: 'counselor',
        action: 'x',
        targetType: 'User',
        targetId: 'u2',
        metadata: { a: 1 },
      },
    });
    expect(captureApiError).not.toHaveBeenCalled();
  });

  it('nulls an actor that matches no user and keeps the id in metadata', async () => {
    // Production regression: the webhook-retry cron passed the literal 'cron'
    // as actor and every write failed on audit_logs_actor_user_id_fkey.
    const db = makeDb();
    db.user.findUnique.mockResolvedValue(null);

    await auditLog(
      { actorUserId: 'cron', action: 'retries', targetType: 'WebhookRetryBatch', metadata: { n: 3 } },
      asDb(db),
    );

    const call = db.auditLog.create.mock.calls[0][0];
    expect(call.data.actorUserId).toBeNull();
    expect(call.data.metadata).toEqual({ n: 3, unresolvedActorId: 'cron' });
  });

  it('keeps the actor id when the lookup fails, since nothing is known', async () => {
    const db = makeDb();
    db.user.findUnique.mockRejectedValue(new Error('pool timeout'));

    await auditLog({ actorUserId: 'u1', action: 'x', targetType: 'User' }, asDb(db));

    expect(db.auditLog.create.mock.calls[0][0].data.actorUserId).toBe('u1');
  });

  it('skips the lookup for a null actor', async () => {
    const db = makeDb();
    await auditLog({ actorUserId: null, action: 'x', targetType: 'Cron' }, asDb(db));
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.auditLog.create.mock.calls[0][0].data.actorUserId).toBeNull();
  });

  it('reports a failed write to Sentry and rethrows', async () => {
    const db = makeDb();
    const failure = new Error('Foreign key constraint violated');
    db.auditLog.create.mockRejectedValue(failure);

    await expect(
      auditLog(
        {
          actorUserId: 'u1',
          actorEmailSnapshot: 'a@example.org',
          actorRoleSnapshot: 'admin',
          action: 'x',
          targetType: 'User',
          targetId: 'u2',
        },
        asDb(db),
      ),
    ).rejects.toBe(failure);

    expect(captureApiError).toHaveBeenCalledWith(failure, {
      route: AUDIT_WRITE_ROUTE,
      extra: { action: 'x', targetType: 'User', targetId: 'u2', actorUserId: 'u1' },
    });
  });
});
