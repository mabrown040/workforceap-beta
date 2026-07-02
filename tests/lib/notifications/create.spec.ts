import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

import { createNotification, createBulkNotifications } from '@/lib/notifications/create';
import { prisma as _prisma } from '@/lib/db/prisma';
const prisma = _prisma as any;

describe('createNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a single notification', async () => {
    const payload = {
      userId: 'user-1',
      type: 'message' as const,
      title: 'Test',
      body: 'Hello',
      data: { threadId: 't1' },
    };
    prisma.notification.create.mockResolvedValue({ id: 'notif-1', ...payload });

    await createNotification(payload);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'message',
          title: 'Test',
          body: 'Hello',
          data: { threadId: 't1' },
        }),
      })
    );
  });

  it('handles empty userId by silently failing', async () => {
    prisma.notification.create.mockRejectedValue(new Error('violates not-null'));

    await expect(
      createNotification({
        userId: '',
        type: 'message',
        title: 'Test',
        body: 'Hello',
      })
    ).resolves.toBeUndefined();
  });

  it('survives DB errors without throwing', async () => {
    prisma.notification.create.mockRejectedValue(new Error('DB down'));

    await expect(
      createNotification({
        userId: 'user-1',
        type: 'message',
        title: 'Test',
        body: 'Hello',
      })
    ).resolves.toBeUndefined();
    expect(prisma.notification.create).toHaveBeenCalled();
  });
});

describe('createBulkNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates bulk notifications', async () => {
    const items = [
      { userId: 'user-1', type: 'broadcast' as const, title: 'A', body: 'B' },
      { userId: 'user-2', type: 'broadcast' as const, title: 'A', body: 'B' },
    ];
    prisma.notification.createMany.mockResolvedValue({ count: 2 });

    await createBulkNotifications(items);
    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ userId: 'user-1', type: 'broadcast', title: 'A', body: 'B', data: null }),
          expect.objectContaining({ userId: 'user-2', type: 'broadcast', title: 'A', body: 'B', data: null }),
        ],
      })
    );
  });

  it('skips empty array without calling DB', async () => {
    await createBulkNotifications([]);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('survives DB errors without throwing', async () => {
    prisma.notification.createMany.mockRejectedValue(new Error('timeout'));

    await expect(
      createBulkNotifications([
        { userId: 'user-1', type: 'broadcast' as const, title: 'A', body: 'B' },
      ])
    ).resolves.toBeUndefined();
    expect(prisma.notification.createMany).toHaveBeenCalled();
  });
});
