import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

export const readCursorInputSchema = z.object({
  lastReadMessageId: z.string().trim().max(200).nullish(),
});

type ReadCursorResult = { ok: true; readAt: string | null } | { ok: false };

/** Caller must authorize the existing thread first. A message ID is resolved
 * inside that thread, never trusted as a timestamp or an access grant.
 * Existing timestamp columns express read-through time, not per-message views;
 * messages sharing an identical timestamp cannot be distinguished here. */
export async function advanceThreadReadCursor({
  threadId,
  messageId,
  reader,
}: {
  threadId: string;
  messageId?: string | null;
  reader: 'counselor' | 'portal';
}): Promise<ReadCursorResult> {
  const field = reader === 'counselor' ? 'counselorLastReadAt' : 'portalUserLastReadAt';
  return prisma.$transaction(async (tx): Promise<ReadCursorResult> => {
    const thread = await tx.messageThread.findUnique({
      where: { id: threadId },
      select: { counselorLastReadAt: true, portalUserLastReadAt: true },
    });
    if (!thread) return { ok: false };
    const cursor = messageId?.trim();
    if (!cursor) return { ok: true, readAt: thread[field]?.toISOString() ?? null };
    const message = await tx.message.findFirst({
      where: { id: cursor, threadId },
      select: { createdAt: true },
    });
    if (!message) return { ok: false };
    // The predicate makes concurrent acknowledgements monotonic. An older
    // tab or late response can never rewind a newer read-through timestamp.
    await tx.messageThread.updateMany({
      where: {
        id: threadId,
        OR: [{ [field]: null }, { [field]: { lt: message.createdAt } }],
      },
      data: { [field]: message.createdAt },
    });
    const updated = await tx.messageThread.findUnique({
      where: { id: threadId },
      select: { counselorLastReadAt: true, portalUserLastReadAt: true },
    });
    return updated ? { ok: true, readAt: updated[field]?.toISOString() ?? null } : { ok: false };
  });
}
