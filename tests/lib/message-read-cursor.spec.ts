import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db/prisma', () => ({ prisma: { $transaction: vi.fn() } }));
import { prisma } from '@/lib/db/prisma';
import { advanceThreadReadCursor } from '@/lib/messages/readCursor';

const firstAt = new Date('2026-09-09T12:00:00Z');
const laterAt = new Date('2026-09-09T12:01:00Z');
let read: { counselorLastReadAt: Date | null; portalUserLastReadAt: Date | null };
let messages: Map<string, { threadId: string; createdAt: Date }>;
const tx = {
  messageThread: { findUnique: vi.fn(), updateMany: vi.fn() },
  message: { findFirst: vi.fn() },
};

describe('loaded message read-through cursor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    read = { counselorLastReadAt: null, portalUserLastReadAt: null };
    messages = new Map([
      ['seen', { threadId: 'own-thread', createdAt: firstAt }],
      ['new-arrival', { threadId: 'own-thread', createdAt: laterAt }],
      ['foreign', { threadId: 'other-thread', createdAt: laterAt }],
    ]);
    vi.mocked(prisma.$transaction).mockImplementation((async (operation: (client: typeof tx) => unknown) => operation(tx)) as never);
    tx.messageThread.findUnique.mockImplementation(async () => ({ ...read }));
    tx.message.findFirst.mockImplementation(async ({ where }) => {
      const message = messages.get(where.id);
      return message && message.threadId === where.threadId ? { createdAt: message.createdAt } : null;
    });
    tx.messageThread.updateMany.mockImplementation(async ({ where, data }) => {
      const field = Object.keys(data)[0] as keyof typeof read;
      expect(where.id).toBe('own-thread');
      expect(where.OR).toEqual([{ [field]: null }, { [field]: { lt: data[field] } }]);
      if (read[field] && read[field] >= data[field]) return { count: 0 };
      read[field] = data[field];
      return { count: 1 };
    });
  });

  it.each(['counselor', 'portal'] as const)('keeps a later arrival unread after the %s acknowledges the loaded snapshot', async (reader) => {
    const result = await advanceThreadReadCursor({ threadId: 'own-thread', messageId: 'seen', reader });
    expect(result).toEqual({ ok: true, readAt: firstAt.toISOString() });
    const field = reader === 'counselor' ? 'counselorLastReadAt' : 'portalUserLastReadAt';
    expect(messages.get('new-arrival')!.createdAt.getTime()).toBeGreaterThan(read[field]!.getTime());
    expect(read[reader === 'counselor' ? 'portalUserLastReadAt' : 'counselorLastReadAt']).toBeNull();
    expect(tx.message.findFirst).toHaveBeenCalledWith({ where: { id: 'seen', threadId: 'own-thread' }, select: { createdAt: true } });
  });
  it('does not rewind the persisted timestamp when an older tab acknowledges later', async () => {
    await advanceThreadReadCursor({ threadId: 'own-thread', messageId: 'new-arrival', reader: 'counselor' });
    const result = await advanceThreadReadCursor({ threadId: 'own-thread', messageId: 'seen', reader: 'counselor' });
    expect(result).toEqual({ ok: true, readAt: laterAt.toISOString() });
  });
  it.each([undefined, null, '', '  '])('does not write without a loaded cursor (%s)', async (messageId) => {
    read.counselorLastReadAt = firstAt;
    expect(await advanceThreadReadCursor({ threadId: 'own-thread', messageId, reader: 'counselor' })).toEqual({ ok: true, readAt: firstAt.toISOString() });
    expect(tx.message.findFirst).not.toHaveBeenCalled();
    expect(tx.messageThread.updateMany).not.toHaveBeenCalled();
  });
  it('rejects another thread’s cursor without moving either read timestamp', async () => {
    expect(await advanceThreadReadCursor({ threadId: 'own-thread', messageId: 'foreign', reader: 'portal' })).toEqual({ ok: false });
    expect(tx.messageThread.updateMany).not.toHaveBeenCalled();
    expect(read).toEqual({ counselorLastReadAt: null, portalUserLastReadAt: null });
  });
});
